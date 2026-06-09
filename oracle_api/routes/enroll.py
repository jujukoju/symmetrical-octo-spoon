"""
oracle_api/routes/enroll.py
----------------------------
POST /v1/enroll — Production-Grade Fingerprint Enrolment Endpoint with Distributed IPFS/Blockchain Storage.
De-coupled from relational databases to support pure decentralized validation and 1:N fraud checking.
"""

import os
import json
import logging
import uuid
import hashlib
from datetime import datetime, timezone
import numpy as np

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, BackgroundTasks
from document_parser import IngestionParser

from auth import verify_api_key
from crypto import BiometricEncryptor
from db_models import generate_secure_nin  # Utility function
from dependencies import get_extractor
from inference_pool import run_in_thread
from metrics import enroll_error, enroll_success
from validators import validate_image_bytes
from blockchain import register_identity_on_chain, get_all_registered_identity_hashes, get_ipfs_cid_from_blockchain
from config import VERIFY_THRESHOLD, MODEL_VERSION
from ipfs import upload_to_ipfs, fetch_from_ipfs

router = APIRouter(tags=["Enrolment"])
log = logging.getLogger("oracle_api.enroll")

NIN_PEPPER = os.getenv("NIN_SECRET_PEPPER", "default_government_secure_salt_value")

# In-memory status tracking cache. Reusable cross-endpoint.
JOB_STORE = {}


# ── Production 1:N Biometric Deduplication Scanner ────────────────────────────
async def perform_biometric_deduplication(new_embedding, extractor) -> bool:
    """
    Executes a 1:N cross-match anti-fraud check over existing decentralized registers.
    Queries the blockchain ledger to pull down active template references and verify uniqueness.
    """
    try:
        encryptor = BiometricEncryptor()
        
        # Coerce input embedding explicitly to standard float32 array
        target_vector = np.asarray(new_embedding, dtype=np.float32)
        
        # 1. Query smart contract storage mappings to discover all registered identity hashes
        active_identity_hashes = await get_all_registered_identity_hashes()
        
        for nin_hash in active_identity_hashes:
            # 2. Resolve the immutable IPFS pointer for each anchored user mapping
            ipfs_cid = await get_ipfs_cid_from_blockchain(nin_hash)
            if not ipfs_cid:
                continue
                
            # 3. Fetch the metadata payload string from the IPFS cluster
            ipfs_raw_payload = await fetch_from_ipfs(ipfs_cid)
            if not ipfs_raw_payload:
                continue
                
            # 4. FIX: Safely parse the version-bounded JSON container to decouple metadata from cryptography
            try:
                metadata_block = json.loads(ipfs_raw_payload)
                
                # Defend against version space collisions: Skip if generation versions do not match
                if metadata_block.get("model_version") != MODEL_VERSION:
                    log.info("Skipping verification match loop for identity hash %s due to version mismatch.", nin_hash)
                    continue
                    
                encrypted_b64 = metadata_block["encrypted_biometric_template"]
            except (json.JSONDecodeError, KeyError):
                # Fallback support for legacy un-wrapped flat text files during migration tests
                encrypted_b64 = ipfs_raw_payload
                
            # 5. Decrypt the template vector matrix using un-drifted AES-256-GCM parameters
            stored_embedding = encryptor.decrypt_vector(encrypted_b64)
            stored_vector = np.asarray(stored_embedding, dtype=np.float32)
            
            # 6. Measure structural cosine distance over the 1D vectors
            a_norm = target_vector / (np.linalg.norm(target_vector) + 1e-8)
            b_norm = stored_vector / (np.linalg.norm(stored_vector) + 1e-8)
            distance = float(1.0 - np.dot(a_norm, b_norm))
            
            # If distance falls below your verified threshold, flag it as an identical match
            if distance < VERIFY_THRESHOLD:
                log.warning("Biometric duplication threat intercepted! Matches existing on-chain hash: %s", nin_hash)
                return True
                
    except Exception as exc:
        log.error("1:N decentralized biometric fraud scan encountered an execution error: %s", exc, exc_info=True)
        # Fall back to False to prevent structural initialization deadlocks if network reads stall
        return False
        
    return False


# ── Async Distributed Worker Pipeline ──────────────────────────────────────────
async def process_enrollment_background(
    job_id: str,
    user_wallet_address: str,
    first_name: str,
    last_name: str,
    dob_parsed: datetime,
    img, 
    request_id: str,
    ip_address: str
):
    """Handles deep-learning inference, deduplication, IPFS uploading, and smart contract anchoring."""
    try:
        # 1. Feature Extraction via Siamese Neural Network
        JOB_STORE[job_id] = {"status": "processing", "step": "Extracting 128-D biometric embeddings"}
        extractor = get_extractor()
        try:
            # Captures uniform 1D NumPy array shape (128,) matching Batch-Hard parameters
            embedding = await run_in_thread(extractor.get_embedding, img)
        except Exception as inf_exc:
            log.error("Model inference pass failed: %s", inf_exc)
            raise RuntimeError("inference_error")

        # 2. 1:N Cross-Match Deduplication Scan
        JOB_STORE[job_id] = {"status": "processing", "step": "Running 1:N fraud deduplication search"}
        is_duplicate = await perform_biometric_deduplication(embedding, extractor)
        if is_duplicate:
            raise RuntimeError("biometric_deduplication_failed")

        # 3. Algorithmic Identity Generation (Secure, Automatic, Non-Sequential NIN)
        JOB_STORE[job_id] = {"status": "processing", "step": "Generating algorithmic identity payload"}
        assigned_nin = generate_secure_nin()

        # 4. Cryptographic Encryption (AES-256-GCM)
        JOB_STORE[job_id] = {"status": "processing", "step": "Encrypting template payload"}
        try:
            encryptor = BiometricEncryptor()
            # Clean Base64 string containing both ciphertext and nonce uniformly
            encrypted_b64 = encryptor.encrypt_vector(embedding)
        except Exception as crypto_exc:
            log.error("Cryptographic packaging failed: %s", crypto_exc)
            raise RuntimeError("crypto_error")

        # 5. Distributed Storage Upload (IPFS JSON Package Packing)
        JOB_STORE[job_id] = {"status": "processing", "step": "Pushing encrypted template to decentralized IPFS cluster"}
        try:
            # FIX: Encapsulate the raw ciphertext block within a metadata container to prevent model drift breaks
            metadata_payload = {
                "model_version": MODEL_VERSION,
                "encrypted_biometric_template": encrypted_b64,
                "generated_timestamp": datetime.now(timezone.utc).isoformat()
            }
            serialized_payload = json.dumps(metadata_payload, indent=4)
            
            # Pass the structured JSON package string to your IPFS upload utility
            ipfs_cid = await upload_to_ipfs(serialized_payload, assigned_nin)
        except Exception as exc:
            log.error("IPFS daemon cluster persistence connection loss: %s", exc)
            raise RuntimeError("ipfs_upload_failed")

        # 6. Cryptographic On-Chain Anchoring (Sepolia Network Smart Contract)
        JOB_STORE[job_id] = {"status": "processing", "step": "Anchoring identity mapping to Sepolia Blockchain"}
        try:
            # Salt and pepper the assigned NIN to eliminate dictionary brute-force tracking attacks
            salted_input = assigned_nin + NIN_PEPPER
            nin_hash = hashlib.sha256(salted_input.encode('utf-8')).hexdigest()

            # Execute transaction targeting deployed smart contract using the generated IPFS CID string
            tx_hash = await register_identity_on_chain(
                user_wallet_address,
                nin_hash,
                ipfs_cid
            )
        except Exception as exc:
            log.error("Blockchain network anchoring failure: %s", exc)
            raise RuntimeError("blockchain_sync_error")

        # 7. Pipeline Success Resolution
        enroll_success.inc()
        log.info("Enrollment finalized successfully. NIN=%s CID=%s TX=%s", assigned_nin, ipfs_cid, tx_hash)
        
        JOB_STORE[job_id] = {
            "version_space": MODEL_VERSION,
            "status": "completed", 
            "step": "Registration Finalized Successfully", 
            "assigned_nin": assigned_nin,
            "ipfs_cid": ipfs_cid,
            "tx_hash": tx_hash,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

    except RuntimeError as exc:
        error_reason = str(exc)
        enroll_error.labels(reason=error_reason).inc()
        log.warning("Enrollment background execution halted: %s", error_reason)
        JOB_STORE[job_id] = {"status": "failed", "step": "Halted", "error": error_reason}


# ── REST Endpoints ───────────────────────────────────────────────────────────

@router.post(
    "/v1/enroll",
    status_code=202,
    summary="Initiate asynchronous corporate citizen enrolment",
)
async def enroll(
    request: Request,
    background_tasks: BackgroundTasks,
    first_name: str = Form(..., description="Legal Given Names"),
    last_name: str = Form(..., description="Legal Surname Family Name"),
    date_of_birth: str = Form(..., description="ISO Format Date string (YYYY-MM-DD)"),
    user_wallet_address: str = Form(..., description="Citizen's Ethereum Public Address Target"),
    fingerprint: UploadFile = File(..., description="Raw biometric fingerprint data scan"),
    _auth: str = Depends(verify_api_key),
):
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    ip_address = request.client.host if request.client else None

    # Parse Date of Birth Formats Safely
    try:
        dob_parsed = datetime.strptime(date_of_birth.strip(), "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=422, detail="Date of birth configuration parameter must follow standard YYYY-MM-DD format mappings.")

    # Biometric Structure Integrity Verification
    try:
        contents = await fingerprint.read()
        if not contents:
            raise ValueError("Uploaded fingerprint raw byte image stream cannot evaluate to empty structures.")
        # Perform magic byte checking and size boundary verification
        img = validate_image_bytes(contents, fingerprint.content_type or "")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    # CRITICAL INGESTION GUARD: Force computer vision analysis to confirm actual fingerprint ridge lines
    try:
        IngestionParser.verify_is_fingerprint(img)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=422, detail="Biometric pattern audit failed to resolve valid fingerprint textures.")

    # Allocate Asynchronous Execution Tracking Handle
    job_id = str(uuid.uuid4())
    JOB_STORE[job_id] = {"status": "pending", "step": "Enrolment transaction request queued"}

    # Pass the extraction context into the async background task pipeline loop
    background_tasks.add_task(
        process_enrollment_background,
        job_id=job_id,
        user_wallet_address=user_wallet_address,
        first_name=first_name,
        last_name=last_name,
        dob_parsed=dob_parsed,
        img=img,
        request_id=request_id,
        ip_address=ip_address
    )

    return {
        "message": "Citizen data accepted. Biometric verification checking loop is now initialized.",
        "job_id": job_id,
        "status_url": f"/v1/enroll/status/{job_id}"
    }


@router.get(
    "/v1/enroll/status/{job_id}",
    summary="Fetch operational results or background execution metrics for identity registration jobs"
)
async def check_job_status(job_id: str):
    job_info = JOB_STORE.get(job_id)
    if not job_info:
        raise HTTPException(status_code=404, detail="Requested identity background operation handle not found.")
    return job_info