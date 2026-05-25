"""
oracle_api/routes/enroll.py
----------------------------
POST /v1/enroll — Fingerprint enrolment endpoint.

Flow:
  1. Validate NIN (11 digits).
  2. Validate uploaded fingerprint image (size, MIME, decodability).
  3. Run preprocessing + Siamese embedding extraction in a thread pool.
  4. Encrypt the 128-D embedding with AES-256-GCM.
  5. Upsert the encrypted embedding into the enrollments table.
  6. Write an audit log entry.
  7. Return EnrollResponse.

If the NIN already exists, the embedding is updated (re-enrolment).
"""
import logging
import uuid
import hashlib
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import verify_api_key
from crypto import BiometricEncryptor
from db_models import AuditLog, Enrollment
from dependencies import get_db, get_extractor
from inference_pool import run_in_thread
from metrics import enroll_error, enroll_success
from schemas import EnrollResponse
from validators import validate_image_bytes, validate_nin

# --- NEW: Import our blockchain function ---
from blockchain import register_identity_on_chain

router = APIRouter(tags=["Enrolment"])
log    = logging.getLogger("oracle_api.enroll")


async def _write_audit(
    db: AsyncSession,
    request_id: str,
    nin: str,
    action: str,
    ip_address: str | None,
    success: bool,
    error_detail: str | None = None,
) -> None:
    try:
        db.add(AuditLog(
            id=str(uuid.uuid4()),
            request_id=request_id,
            nin=nin,
            action=action,
            ip_address=ip_address,
            success=success,
            error_detail=error_detail,
        ))
        await db.flush()
    except Exception as exc:
        log.warning("Audit log write failed: %s", exc)


@router.post(
    "/v1/enroll",
    response_model=EnrollResponse,
    summary="Enrol a citizen fingerprint",
)
async def enroll(
    request: Request,
    nin: str = Form(..., description="11-digit Nigerian NIN"),
    # --- NEW: Accept the citizen's Web3 wallet address ---
    user_wallet_address: str = Form(..., description="Citizen's Ethereum Wallet Address"),
    fingerprint: UploadFile = File(..., description="Fingerprint image (JPEG, PNG, or BMP)"),
    db: AsyncSession = Depends(get_db),
    _auth: str = Depends(verify_api_key),
) -> EnrollResponse:

    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    ip_address = request.client.host if request.client else None

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
        enroll_error.labels(reason="validation_error").inc()
        await _write_audit(db, request_id, user_nin, "enroll", ip_address, success=False, error_detail=str(exc))
        raise HTTPException(status_code=422, detail=str(exc))

    # ── 3. Extract embedding (runs in thread pool) ────────────────────────────
    try:
        extractor = get_extractor()
        embedding = await run_in_thread(extractor.get_embedding, img)
    except Exception as exc:
        enroll_error.labels(reason="inference_error").inc()
        log.error("Embedding extraction failed request_id=%s: %s", request_id, exc, exc_info=True)
        await _write_audit(db, request_id, user_nin, "enroll", ip_address, success=False, error_detail="inference_error")
        raise HTTPException(status_code=500, detail="Embedding extraction failed. Please try again.")

    # ── 4. Encrypt embedding ─────────────────────────────────────────────────
    try:
        encryptor = BiometricEncryptor()
        encrypted_blob = encryptor.encrypt_vector(embedding)
    except Exception as exc:
        enroll_error.labels(reason="crypto_error").inc()
        log.error("Encryption failed request_id=%s: %s", request_id, exc, exc_info=True)
        await _write_audit(db, request_id, user_nin, "enroll", ip_address, success=False, error_detail="crypto_error")
        raise HTTPException(status_code=500, detail="Encryption failed. Check AES_MASTER_KEY.")

    # ── 5. Upsert enrollment record (Off-Chain Storage) ──────────────────────
    enrollment_id = str(uuid.uuid4())
    try:
        stmt = select(Enrollment).where(Enrollment.nin == user_nin)
        result = await db.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing:
            existing.encrypted_embedding = encrypted_blob
            existing.enrollment_count    = (existing.enrollment_count or 0) + 1
            existing.updated_at          = datetime.now(timezone.utc)
            enrollment_id                = existing.id
            status = "re-enrolled"
        else:
            db.add(Enrollment(
                id=enrollment_id,
                nin=user_nin,
                encrypted_embedding=encrypted_blob,
                enrollment_count=1,
            ))
            status = "enrolled"

        await db.flush()

    except Exception as exc:
        enroll_error.labels(reason="db_error").inc()
        log.error("DB write failed request_id=%s: %s", request_id, exc, exc_info=True)
        await _write_audit(db, request_id, user_nin, "enroll", ip_address, success=False, error_detail="db_error")
        raise HTTPException(status_code=500, detail="Enrolment failed. Please try again.")

    # ── 6. NEW: Blockchain Registration ──────────────────────────────────────
    try:
        # Hash the NIN to ensure PII is never stored in plaintext on the blockchain
        nin_hash = hashlib.sha256(user_nin.encode('utf-8')).hexdigest()

        # For this prototype, we use the local DB UUID as our storage pointer. 
        # In a full IPFS system, this would be the IPFS CID.
        storage_cid = f"local-db:{enrollment_id}"

        # Run the Web3 transaction in a thread so it doesn't block FastAPI
        tx_hash = await run_in_thread(
            register_identity_on_chain,
            user_wallet_address,
            nin_hash,
            storage_cid
        )
        log.info("Blockchain registration success. TX Hash: %s", tx_hash)
    except Exception as exc:
        log.error("Blockchain registration failed for NIN=%s: %s", user_nin, exc)
        # Note: We log the error but don't fail the whole request if the DB succeeded, 
        # depending on your desired fault-tolerance logic.

    # ── 7. Audit log ─────────────────────────────────────────────────────────
    await _write_audit(db, request_id, user_nin, "enroll", ip_address, success=True)
    enroll_success.inc()
    log.info("Enrolled NIN=%s status=%s request_id=%s", user_nin, status, request_id)

    return EnrollResponse(
        nin=user_nin,
        status=status,
        request_id=request_id,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )