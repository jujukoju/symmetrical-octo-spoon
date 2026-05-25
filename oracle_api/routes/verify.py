"""
oracle_api/routes/verify.py
----------------------------
POST /v1/verify — Biometric verification endpoint.

Flow:
  1. Validate NIN (11 digits).
  2. Validate uploaded fingerprint image.
  3. Fetch enrolled record from the database.
  4. Decrypt the stored embedding with AES-256-GCM.
  5. Extract a live embedding from the uploaded fingerprint (thread pool).
  6. Compute cosine similarity and distance between live vs stored embeddings.
  7. Apply threshold → MATCH or NO_MATCH decision.
  8. Write audit log and Prometheus metrics.
  9. Return VerifyResponse.
"""

import logging
import os
import time
import uuid
from datetime import datetime, timezone

import numpy as np
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import verify_api_key
from config import VERIFY_THRESHOLD
from crypto import BiometricEncryptor
from db_models import AuditLog, Enrollment
from dependencies import get_db, get_extractor
from inference_pool import run_in_thread
from metrics import verification_decision, verification_error, verification_latency
from schemas import VerifyResponse
from validators import validate_image_bytes, validate_nin

router = APIRouter(tags=["Verification"])
log    = logging.getLogger("oracle_api.verify")


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
        "Compares the live embedding to the stored encrypted template using cosine distance. "
        "Returns MATCH if distance ≤ threshold, otherwise NO_MATCH."
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

    # ── 1. Validate NIN ──────────────────────────────────────────────────────
    try:
        user_nin = validate_nin(nin)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    # ── 2. Validate & decode image ───────────────────────────────────────────
    try:
        contents = await fingerprint.read()
        img = validate_image_bytes(contents, fingerprint.content_type or "")
    except ValueError as exc:
        verification_error.labels(reason="validation_error").inc()
        await _write_audit(db, request_id, user_nin, "verify", ip_address,
                           success=False, error_detail=str(exc))
        raise HTTPException(status_code=422, detail=str(exc))

    try:
        # ── 3. Fetch enrollment ───────────────────────────────────────────────
        stmt = select(Enrollment).where(Enrollment.nin == user_nin)
        result = await db.execute(stmt)
        enrollment = result.scalar_one_or_none()

        if not enrollment:
            await _write_audit(db, request_id, user_nin, "verify", ip_address,
                               success=False, error_detail="not_enrolled")
            raise HTTPException(status_code=404, detail="NIN is not enrolled.")

        if not enrollment.encrypted_embedding:
            await _write_audit(db, request_id, user_nin, "verify", ip_address,
                               success=False, error_detail="no_biometric_template")
            raise HTTPException(
                status_code=422,
                detail="No fingerprint template on file for this NIN. Please re-enrol.",
            )

        # ── 4. Decrypt stored embedding ───────────────────────────────────────
        encryptor      = BiometricEncryptor()
        stored_embedding = encryptor.decrypt_vector(enrollment.encrypted_embedding)

        # ── 5. Extract live embedding (thread pool) ───────────────────────────
        extractor      = get_extractor()
        live_embedding = await run_in_thread(extractor.get_embedding, img)

        # ── 6. Compute cosine distance ────────────────────────────────────────
        similarity, distance = _cosine_distance(live_embedding, stored_embedding)
        dec = "MATCH" if distance <= threshold else "NO_MATCH"

        # ── 7. Record latency & decision ──────────────────────────────────────
        elapsed = time.perf_counter() - start
        verification_latency.observe(elapsed)
        verification_decision.labels(decision=dec).inc()

        # ── 8. Audit log ──────────────────────────────────────────────────────
        await _write_audit(
            db, request_id, user_nin, "verify", ip_address,
            success=True, decision=dec, distance=distance,
        )

        log.info(
            "Verify NIN=%s decision=%s dist=%.4f threshold=%.4f request_id=%s",
            user_nin, dec, distance, threshold, request_id,
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
        log.error("Verification failed request_id=%s: %s", request_id, exc, exc_info=True)
        await _write_audit(db, request_id, user_nin, "verify", ip_address,
                           success=False, error_detail="internal_error")
        raise HTTPException(status_code=500, detail="Verification failed. Please try again.")
