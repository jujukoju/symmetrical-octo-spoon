# oracle_api/routes/verify.py
"""
oracle_api/routes/verify.py
----------------------------
POST /v1/verify — Production-Grade Decentralized Biometric Verification Endpoint.

Flow:
  1. Validate incoming NIN and fingerprint image formatting.
  2. Compute salted SHA-256 hash of the NIN to create the on-chain identifier key.
  3. Query Sepolia via the smart contract layer to look up the identity's mapped IPFS CID.
  4. Fetch the target encrypted base64 template directly from the IPFS gateway node.
  5. Decrypt the biometric template using AES-256-GCM authenticated decryption.
  6. Extract the live 128-D embedding from the incoming scan using the model thread pool.
  7. Measure cosine similarity and evaluate distances against the security threshold.
  8. Log metrics, append data to audit tables, and return the structured response.
"""

import logging
import os
import time
import uuid
import hashlib
from datetime import datetime, timezone

import numpy as np
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from auth import verify_api_key
from config import VERIFY_THRESHOLD
from crypto import BiometricEncryptor
from db_models import AuditLog
from dependencies import get_db, get_extractor
from inference_pool import run_in_thread
from metrics import verification_decision, verification_error, verification_latency
from schemas import VerifyResponse
from validators import validate_image_bytes, validate_nin
from blockchain import get_ipfs_cid_from_blockchain   # Refactored smart contract read-call
from ipfs import fetch_from_ipfs                       # Custom IPFS data retrieval module

router = APIRouter(tags=["Verification"])
log    = logging.getLogger("oracle_api.verify")

NIN_PEPPER = os.getenv("NIN_SECRET_PEPPER", "default_government_secure_salt_value")


def _cosine_distance(a: np.ndarray, b: np.ndarray) -> tuple[float, float]:
    """Return (cosine_similarity, cosine_distance) for two embedding vectors."""
    a_norm = a / (np.linalg.norm(a) + 1e-8)
    b_norm = b / (np.linalg.norm(b) + 1e-8)
    similarity = float(np.dot(a_norm, b_norm))
    distance   = float(1.0 - similarity)
    return similarity, distance


async def _write_audit(
    db: AsyncSession,
    request_id: str,
    nin: str,
    action: str,
    ip_address: str | None,
    success: bool,
    decision: str | None = None,
    distance: float | None = None,
    error_detail: str | None = None,
) -> None:
    try:
        db.add(AuditLog(
            id=str(uuid.uuid4()),
            request_id=request_id,
            nin=nin,
            action=action,
            decision=decision,
            distance=distance,
            ip_address=ip_address,
            success=success,
            error_detail=error_detail,
        ))
        await db.flush()
    except Exception as exc:
        log.warning("Audit log write failed: %s", exc)


@router.post(
    "/v1/verify",
    response_model=VerifyResponse,
    summary="Verify a citizen fingerprint against the enrolled template",
    description=(
        "Accepts an 11-digit NIN and a live fingerprint image. "
        "Queries smart contracts for the IPFS CID matching the hashed NIN, fetches and "
        "decrypts the template payload, and measures live similarity distance matches."
    ),
)
async def verify_identity(
    request: Request,
    nin: str = Form(..., description="11-digit Nigerian NIN"),
    fingerprint: UploadFile = File(..., description="Live fingerprint image (JPEG, PNG, or BMP)"),
    db: AsyncSession = Depends(get_db),
    _auth: str = Depends(verify_api_key),
) -> VerifyResponse:

    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    ip_address = request.client.host if request.client else None
    threshold  = VERIFY_THRESHOLD
    start      = time.perf_counter()

    # Validate incoming parameter constraints
    try:
        user_nin = validate_nin(nin)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    # Validate image file bytes
    try:
        contents = await fingerprint.read()
        img = validate_image_bytes(contents, fingerprint.content_type or "")
    except ValueError as exc:
        verification_error.labels(reason="validation_error").inc()
        await _write_audit(db, request_id, user_nin, "verify", ip_address,
                           success=False, error_detail=str(exc))
        raise HTTPException(status_code=422, detail=str(exc))

    try:
        # ── 3. Fetch IPFS CID Pointer from Sepolia ────────────────────────────
        # Compute salted NIN hash matching the background task enrollment hashing algorithm
        salted_input = user_nin + NIN_PEPPER
        nin_hash = hashlib.sha256(salted_input.encode('utf-8')).hexdigest()
        
        # Read the active CID string pointer from your smart contract's storage mappings
        ipfs_cid = await get_ipfs_cid_from_blockchain(nin_hash)

        if not ipfs_cid or ipfs_cid.strip() == "":
            await _write_audit(db, request_id, user_nin, "verify", ip_address,
                               success=False, error_detail="not_enrolled")
            raise HTTPException(status_code=404, detail="Identity registry mapping not found on-chain.")

        # ── 4. Retrieve Storage Payload from IPFS Node ───────────────────────
        try:
            encrypted_b64 = await fetch_from_ipfs(ipfs_cid)
        except Exception as exc:
            log.error("IPFS network fetch timeout using CID %s: %s", ipfs_cid, exc)
            raise HTTPException(status_code=502, detail="Decentralized file system retrieval failure.")

        if not encrypted_b64:
            await _write_audit(db, request_id, user_nin, "verify", ip_address,
                               success=False, error_detail="no_biometric_template")
            raise HTTPException(
                status_code=422,
                detail="Biometric fingerprint template file payload missing on IPFS node.",
            )

        # ── 5. Decrypt Stored Biometric Embedding ────────────────────────────
        encryptor = BiometricEncryptor()
        try:
            # Reconstruct template matrix using system master key parameters
            stored_embedding = encryptor.decrypt_vector(encrypted_b64)
        except Exception as exc:
            log.error("AES-256-GCM authentication decryption structural crash: %s", exc)
            raise HTTPException(status_code=500, detail="Biometric template parsing failure.")

        # ── 6. Extract Live Embedding Vector (Inference Thread Pool) ──────────
        extractor = get_extractor()
        live_embedding = await run_in_thread(extractor.get_embedding, img)

        # ── 7. Evaluate Cosine Distances and Match Thresholds ──────────────────
        similarity, distance = _cosine_distance(live_embedding, stored_embedding)
        dec = "MATCH" if distance <= threshold else "NO_MATCH"

        # ── 8. Process Performance Metrics & Latency Tracking ──────────────────
        elapsed = time.perf_counter() - start
        verification_latency.observe(elapsed)
        verification_decision.labels(decision=dec).inc()

        # Commit updates to local relational audit trail logs
        await _write_audit(
            db, request_id, user_nin, "verify", ip_address,
            success=True, decision=dec, distance=distance,
        )

        log.info(
            "Verify NIN=%s decision=%s dist=%.4f threshold=%.4f request_id=%s cid=%s",
            user_nin, dec, distance, threshold, request_id, ipfs_cid,
        )

        return VerifyResponse(
            nin=user_nin,
            similarity=round(similarity, 6),
            distance=round(distance, 6),
            threshold=threshold,
            decision=dec,
            request_id=request_id,
            timestamp=datetime.now(timezone.utc).isoformat(),
        )

    except HTTPException:
        raise
    except Exception as exc:
        verification_error.labels(reason="internal_error").inc()
        log.error("Verification system exception on request_id=%s: %s", request_id, exc, exc_info=True)
        await _write_audit(db, request_id, user_nin, "verify", ip_address,
                           success=False, error_detail="internal_error")
        raise HTTPException(status_code=500, detail="Verification endpoint execution error.")