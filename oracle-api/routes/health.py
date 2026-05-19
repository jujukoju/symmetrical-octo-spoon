"""
oracle-api/routes/health.py
----------------------------
GET /health — lightweight liveness + readiness probe.

Returns:
  - model_loaded : True if the EmbeddingExtractor singleton is initialised.
  - db_ok        : True if a simple SELECT 1 succeeds against the database.
  - version      : App version from APP_VERSION env variable.
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from config import APP_VERSION
from dependencies import get_db, get_extractor
from schemas import HealthResponse

router = APIRouter(tags=["Health"])
log    = logging.getLogger("oracle-api.health")


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Service health check",
)
async def health(db: AsyncSession = Depends(get_db)) -> HealthResponse:
    # Check database
    db_ok = False
    try:
        await db.execute(text("SELECT 1"))
        db_ok = True
    except Exception as exc:
        log.warning("Database health check failed: %s", exc)

    # Check model (lazy-loads on first call)
    model_loaded = False
    try:
        get_extractor()
        model_loaded = True
    except Exception as exc:
        log.warning("Model load check failed: %s", exc)

    status = "ok" if (db_ok and model_loaded) else "degraded"

    return HealthResponse(
        status=status,
        model_loaded=model_loaded,
        db_ok=db_ok,
        version=APP_VERSION,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )
