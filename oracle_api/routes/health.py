"""
oracle_api/routes/health.py
----------------------------
GET /v1/health — lightweight liveness + readiness probe.
Optimized to audit IPFS gateway availability and model execution singletons securely.
"""

import httpx
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, status
from config import IPFS_RPC_URL, APP_VERSION
from dependencies import get_extractor
from schemas import HealthResponse

# Clean consolidated instantiation using proper microservice routing prefixes
router = APIRouter(prefix="/v1", tags=["System Health"])
log = logging.getLogger("oracle_api.health")


@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Service health check",
)
async def health() -> HealthResponse:
    """
    Evaluates microservice health parameters.
    Verifies state matching for the model singleton and queries the IPFS RPC endpoint.
    """
    # 1. Audit Decentralized Storage availability via IPFS gateway check
    ipfs_ok = False
    try:
        # Check IPFS daemon health using its native RPC utility endpoint
        async with httpx.AsyncClient(timeout=2.0) as client:
            # Querying the version endpoint is a low-overhead, side-effect-free ping
            response = await client.post(f"{IPFS_RPC_URL}/api/v0/version")
            if response.status_code == status.HTTP_200_OK:
                ipfs_ok = True
            else:
                log.warning("IPFS daemon responded with non-200 status code: %d", response.status_code)
    except Exception as exc:
        log.warning("IPFS storage RPC gateway check failed: %s", exc)

    # 2. Audit Neural Network memory allocation state
    model_loaded = False
    try:
        get_extractor()
        model_loaded = True
    except Exception as exc:
        log.error("Model extractor singleton verification failed: %s", exc)

    # 3. Determine unified operational system state
    status_msg = "ok" if (ipfs_ok and model_loaded) else "degraded"

    return HealthResponse(
        status=status_msg,
        model_loaded=model_loaded,
        ipfs_ok=ipfs_ok,  # Matches the updated schemas configuration field
        version=APP_VERSION,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )