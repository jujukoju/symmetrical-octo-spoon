"""
oracle_api/routes/enroll.py
----------------------------
POST /v1/enroll — Fingerprint enrolment endpoint.

Flow:
  1. Validate NIN (11 digits) and image format immediately (Fail-Fast).
  2. Return 202 Accepted with a job_id.
  3. [Background Task] Run Siamese embedding extraction.
  4. [Background Task] Encrypt the 128-D embedding with AES-256-GCM.
  5. [Background Task] Upsert the encrypted embedding into the database.
  6. [Background Task] Hash the NIN with a secret Pepper.
  7. [Background Task] Register identity on the Sepolia blockchain.
"""
import os
import logging
import uuid
import hashlib
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, BackgroundTasks
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import verify_api_key
from crypto import BiometricEncryptor
from db_models import AuditLog, Enrollment
from dependencies import get_db, get_extractor
from inference_pool import run_in_thread
from metrics import enroll_error, enroll_success
from validators import validate_image_bytes, validate_nin
from blockchain import register_identity_on_chain

router = APIRouter(tags=["Enrolment"])
log    = logging.getLogger("oracle_api.enroll")

# ── Security & State Setup ───────────────────────────────────────────────────
# In production, load this from .env. It ensures the on-chain hash cannot be reverse-engineered.
NIN_PEPPER = os.getenv("NIN_SECRET_PEPPER", "default_government_secure_salt_value")

# In-memory dictionary to track async job statuses. 
# NOTE: For a multi-worker production environment, replace this with Redis.
JOB_STORE = {}

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


# ── Async Worker Task ────────────────────────────────────────────────────────
async def process_enrollment_background(
    job_id: str,
    user_nin: str,
    user_wallet_address: str,
    img, # Decoded image array
    request_id: str,
    ip_address: str
):
    """Handles ML, DB, and Blockchain operations in the background."""
    
    # Safely acquire a new database session for the background thread
    db_iterator = get_db()
    db = await anext(db_iterator)
    
    try:
        # 1. Extract embedding
        JOB_STORE[job_id] = {"status": "processing", "step": "Extracting biometric features"}
        extractor = get_extractor()
        try:
            embedding = await run_in_thread(extractor.get_embedding, img)
        except Exception as exc:
            raise RuntimeError("inference_error")

        # Encrypt embedding
        JOB_STORE[job_id] = {"status": "processing", "step": "Encrypting payload"}
        try:
            encryptor = BiometricEncryptor()
            encrypted_blob = encryptor.encrypt_vector(embedding)
        except Exception as exc:
            raise RuntimeError("crypto_error")

        # Upsert enrollment record (Off-Chain Storage)
        JOB_STORE[job_id] = {"status": "processing", "step": "Saving to secure database"}
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
            else:
                db.add(Enrollment(
                    id=enrollment_id,
                    nin=user_nin,
                    encrypted_embedding=encrypted_blob,
                    enrollment_count=1,
                ))
            await db.flush()
        except Exception as exc:
            raise RuntimeError("db_error")

        # 4. Blockchain Registration
        JOB_STORE[job_id] = {"status": "processing", "step": "Broadcasting to Sepolia blockchain"}
        try:
            # Salt the NIN to protect against Rainbow Table attacks
            salted_input = user_nin + NIN_PEPPER
            nin_hash = hashlib.sha256(salted_input.encode('utf-8')).hexdigest()

            storage_cid = f"local-db:{enrollment_id}"

            tx_hash = await run_in_thread(
                register_identity_on_chain,
                user_wallet_address,
                nin_hash,
                storage_cid
            )
            log.info("Blockchain registration success. TX Hash: %s", tx_hash)
        except Exception as exc:
            log.error("Blockchain registration failed for NIN=%s: %s", user_nin, exc)
            # We don't fail the job if DB succeeded, but we note it in the logs
            tx_hash = "Failed to broadcast to network"

        # 5. Success cleanup
        await _write_audit(db, request_id, user_nin, "enroll", ip_address, success=True)
        await db.commit()
        enroll_success.inc()
        
        JOB_STORE[job_id] = {
            "status": "completed", 
            "step": "Done", 
            "tx_hash": tx_hash,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

    except RuntimeError as exc:
        # Rollback and log failure
        await db.rollback()
        error_reason = str(exc)
        enroll_error.labels(reason=error_reason).inc()
        await _write_audit(db, request_id, user_nin, "enroll", ip_address, success=False, error_detail=error_reason)
        JOB_STORE[job_id] = {"status": "failed", "step": "Halted", "error": error_reason}
        
    finally:
        # Close the DB session
        try:
            await anext(db_iterator)
        except StopAsyncIteration:
            pass


# ── REST Endpoints ───────────────────────────────────────────────────────────

@router.post(
    "/v1/enroll",
    status_code=202,
    summary="Initiate asynchronous citizen enrolment",
)
async def enroll(
    request: Request,
    background_tasks: BackgroundTasks,
    nin: str = Form(..., description="11-digit Nigerian NIN"),
    user_wallet_address: str = Form(..., description="Citizen's Ethereum Wallet Address"),
    fingerprint: UploadFile = File(..., description="Fingerprint image (JPEG, PNG, or BMP)"),
    db: AsyncSession = Depends(get_db),
    _auth: str = Depends(verify_api_key),
):
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    ip_address = request.client.host if request.client else None

    # 1. Synchronous Validation (Fail-Fast)
    try:
        user_nin = validate_nin(nin)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    try:
        contents = await fingerprint.read()
        if not contents:
            raise ValueError("Uploaded image file is empty.")
        img = validate_image_bytes(contents, fingerprint.content_type or "")
    except ValueError as exc:
        await _write_audit(db, request_id, user_nin, "enroll", ip_address, success=False, error_detail=str(exc))
        raise HTTPException(status_code=422, detail=str(exc))

    # 2. Dispatch Background Task
    job_id = str(uuid.uuid4())
    JOB_STORE[job_id] = {"status": "pending", "step": "Queued for processing"}

    background_tasks.add_task(
        process_enrollment_background,
        job_id=job_id,
        user_nin=user_nin,
        user_wallet_address=user_wallet_address,
        img=img,
        request_id=request_id,
        ip_address=ip_address
    )

    # 3. Return immediate 202 response
    return {
        "message": "Enrolment accepted and is processing.",
        "job_id": job_id,
        "nin": user_nin,
        "status_url": f"/v1/enroll/status/{job_id}"
    }


@router.get(
    "/v1/enroll/status/{job_id}",
    summary="Check the status of an enrolment job"
)
async def check_job_status(job_id: str):
    job_info = JOB_STORE.get(job_id)
    if not job_info:
        raise HTTPException(status_code=404, detail="Job ID not found.")
    
    return {"job_id": job_id, **job_info}