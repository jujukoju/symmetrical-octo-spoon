"""
FastAPI dependency functions shared across route handlers.

Provides:
  - get_db()        — yields an async SQLAlchemy session per request
  - get_extractor() — returns the singleton EmbeddingExtractor
"""

import sys
import logging
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession

from database import AsyncSessionLocal
from config import EMBEDDING_DIM, MODEL_PATH

log = logging.getLogger("oracle_api.dependencies")

_extractor = None


def get_extractor():
    global _extractor
    if _extractor is None:
        ml_backend_dir = str((Path(__file__).parent.parent / "ml-backend").resolve())
        if ml_backend_dir not in sys.path:
            sys.path.insert(0, ml_backend_dir)

        from embedding import EmbeddingExtractor  # noqa: PLC0415

        _extractor = EmbeddingExtractor(
            model_path=str(MODEL_PATH),
            embedding_dim=EMBEDDING_DIM,
        )
        log.info("EmbeddingExtractor loaded from %s", MODEL_PATH)
    return _extractor

async def get_db() -> AsyncSession:
    """Yield a database session for a single request, then close it."""
    async with AsyncSessionLocal() as session:
        async with session.begin():
            yield session
