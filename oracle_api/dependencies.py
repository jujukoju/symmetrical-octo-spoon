"""
oracle_api/dependencies.py
---------------------------
FastAPI dependency functions shared across route handlers.

Provides:
  - get_db()        — yields an async SQLAlchemy session per request
  - get_extractor() — returns the singleton EmbeddingExtractor
"""

import logging
import sys
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession

from config import EMBEDDING_DIM, MODEL_PATH
from database import AsyncSessionLocal

log = logging.getLogger("oracle_api.dependencies")

# ── Embedding Extractor singleton ─────────────────────────────────────────────
# Loaded once at first request to avoid blocking startup if the model file
# is large. After the first call the same instance is reused.

_extractor = None


def get_extractor():
    """Return the singleton EmbeddingExtractor, loading the model on first call.

    The ml-backend directory is added to sys.path so that its internal
    imports (models.siamese, preprocessing.pipeline) resolve correctly.
    """
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


# ── Database session ──────────────────────────────────────────────────────────

async def get_db() -> AsyncSession:
    """Yield a database session for a single request, then close it."""
    async with AsyncSessionLocal() as session:
        async with session.begin():
            yield session
