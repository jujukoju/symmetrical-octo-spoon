"""
oracle_api/config.py
--------------------
Environment-variable driven configuration for the NINAuth Oracle API.

All values are read at import time so the service fails fast if anything
critical is missing. Add new settings here rather than scattering
os.getenv() calls across the codebase.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from the oracle_api/ directory, then fall back to root .env
load_dotenv(Path(__file__).parent / ".env", override=False)
load_dotenv(Path(__file__).parent.parent / ".env", override=False)


# ── Security ──────────────────────────────────────────────────────────────────
AES_MASTER_KEY: str = os.getenv("AES_MASTER_KEY", "")

# Load and cache all API_KEY_HASH_n values from environment variables at startup
API_KEY_HASHES: frozenset[str] = frozenset(
    [os.environ[k].strip() for k in os.environ if k.startswith("API_KEY_HASH_") if os.environ[k].strip()]
)

# ── Database ──────────────────────────────────────────────────────────────────
DATABASE_URL: str = os.getenv(
    "DATABASE_URL",
    "sqlite+aiosqlite:///./dev.db",
)
DB_POOL_SIZE: int    = int(os.getenv("DB_POOL_SIZE", "10"))
DB_MAX_OVERFLOW: int = int(os.getenv("DB_MAX_OVERFLOW", "20"))
USE_ALEMBIC: bool    = os.getenv("USE_ALEMBIC", "false").lower() == "true"

# ── ML model ─────────────────────────────────────────────────────────────────
# Resolved relative to oracle_api/ working directory.
_raw_model_path = os.getenv("MODEL_PATH", "../ml-backend/models/best_siamese.pth")
MODEL_PATH: Path = (Path(__file__).parent / _raw_model_path).resolve()

EMBEDDING_DIM: int = int(os.getenv("EMBEDDING_DIM", "128"))

# ── Verification ──────────────────────────────────────────────────────────────
VERIFY_THRESHOLD: float = float(os.getenv("VERIFY_THRESHOLD", "0.5"))

# ── CORS ──────────────────────────────────────────────────────────────────────
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
ALLOWED_ORIGINS: list[str] = [o.strip() for o in _raw_origins.split(",") if o.strip()]

# ── Performance ───────────────────────────────────────────────────────────────
INFERENCE_WORKERS: int = int(os.getenv("INFERENCE_WORKERS", str(os.cpu_count() or 4)))

# ── Observability ─────────────────────────────────────────────────────────────
LOG_LEVEL: str      = os.getenv("LOG_LEVEL", "INFO").upper()
ENABLE_METRICS: bool = os.getenv("ENABLE_METRICS", "true").lower() == "true"
APP_VERSION: str    = os.getenv("APP_VERSION", "1.0.0")

# ── Environment ───────────────────────────────────────────────────────────────
ENV: str            = os.getenv("ENV", "development").lower()
IS_PRODUCTION: bool = ENV == "production"
