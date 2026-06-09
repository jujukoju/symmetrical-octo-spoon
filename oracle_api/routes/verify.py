"""
oracle_api/routes/verify.py
----------------------------
POST /v1/verify — Production-Grade Decentralized Biometric Verification Endpoint.
Processes vector comparisons directly against IPFS templates and Sepolia ledger lookups.
Features integrated SlowAPI throttling to protect the neural inference pool.
"""

import logging
import os
import time
import uuid
import hashlib
from datetime import datetime, timezone

import numpy as np
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile

from auth import verify_api_key
from config import VERIFY_THRESHOLD
from crypto import BiometricEncryptor
from dependencies import get_extractor
from inference_pool import run_in_thread
from main import limiter
from metrics import verification_decision, verification_error, verification_latency
from schemas import VerifyResponse
from validators import validate_image_bytes, validate_nin
from blockchain import get_ipfs_cid_from_blockchain
from ipfs import fetch_from_ipfs

# Import your application's shared limiter instance directly to avoid name faults
from main import limiter

router = APIRouter(tags=["Verification"])
log = logging.getLogger("oracle_api.verify")

NIN_PEPPER = os.getenv("NIN_SECRET_PEPPER", "default_government_secure_salt_value")


def _cosine_distance(a: np.ndarray, b: np.ndarray) -> tuple[float, float]:
    """
    Return (cosine_similarity, cosine_distance) for two 1D embedding vectors.
    Safe bounded linear algebra operations avoiding division by zero.
    """
    a_norm = a / (np.linalg.norm(a) + 1e-8)
    b_norm = b / (np.linalg.norm(b) + 1e-8)
    similarity = float(np.dot(a_norm, b_norm))
    distance = float(1.0 - similarity)
    return similarity, distance


@router.post(
    "/v1/verify",
    response_model=VerifyResponse,
    summary="Verify a citizen fingerprint against the enrolled template",
)
@limiter.limit("5/minute")  # Blocks automated validation extraction loops and brute-force DoS attempts
async def verify_identity(
    request: Request,       # SlowAPI depends on parsing this raw request mapping
    nin: str = Form(..., description="11-digit Nigerian NIN"),
    fingerprint: UploadFile = File(..., description="Live fingerprint image"),
    _auth: str = Depends(verify_api_key),
) -> VerifyResponse:

    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    ip_address = request.client.host if request.client else None
    threshold = VERIFY_THRESHOLD
    start = time.perf_counter()

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
        raise HTTPException(status_code=422, detail=str(exc))

    try:
        # ── Fetch IPFS CID Pointer from Sepolia ────────────────────────────
        salted_input = user_nin + NIN_PEPPER
        nin_hash = hashlib.sha256(salted_input.encode('utf-8')).hexdigest()
        
        # Read the active CID string pointer from your smart contract's storage mappings
        ipfs_cid = await get_ipfs_cid_from_blockchain(nin_hash)

        if not ipfs_cid or ipfs_cid.strip() == "":
            raise HTTPException(status_code=404, detail="Identity registry mapping not found on-chain.")

        # ── Retrieve Storage Payload from IPFS Node ───────────────────────
        try:
            encrypted_b64 = await fetch_from_ipfs(ipfs_cid)
        except Exception as exc:
            log.error("IPFS network fetch timeout using CID %s: %s", ipfs_cid, exc)
            raise HTTPException(status_code=502, detail="Decentralized file system retrieval failure.")

        if not encrypted_b64:
            raise HTTPException(
                status_code=422,
                detail="Biometric fingerprint template file payload missing on IPFS node.",
            )

        # ── Decrypt Stored Biometric Embedding ────────────────────────────
        encryptor = BiometricEncryptor()
        try:
            # Reconstruct template matrix array using un-drifted Base64 decryption parameters
            stored_embedding = encryptor.decrypt_vector(encrypted_b64)
        except Exception as exc:
            log.error("AES-256-GCM authentication decryption structural crash: %s", exc)
            raise HTTPException(status_code=500, detail="Biometric template parsing failure.")

        # ── Extract Live Embedding Vector (Inference Thread Pool) ──────────
        extractor = get_extractor()
        # Outputs clean 1D vector matching your system's Batch-Hard geometry
        live_embedding = await run_in_thread(extractor.get_embedding, img)

        # ── Evaluate Cosine Distances and Match Thresholds ──────────────────
        similarity, distance = _cosine_distance(live_embedding, stored_embedding)
        dec = "MATCH" if distance <= threshold else "NO_MATCH"

        # ── Process Performance Metrics & Latency Tracking ──────────────────
        elapsed = time.perf_counter() - start
        verification_latency.observe(elapsed)
        verification_decision.labels(decision=dec).inc()

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
        raise HTTPException(status_code=500, detail="Verification endpoint execution error.")