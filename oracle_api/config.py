"""
Environment-variable driven configuration for the Oracle API.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env", override=False)
load_dotenv(Path(__file__).parent.parent / ".env", override=False)

AES_MASTER_KEY: str = os.getenv("AES_MASTER_KEY", "")

API_KEY_HASHES: frozenset[str] = frozenset(
    [os.environ[k].strip() for k in os.environ if k.startswith("API_KEY_HASH_") if os.environ[k].strip()]
)

DATABASE_URL=pDATABASE_URL=postgresql+asyncpg://postgres:@localhost:5432/ninauth_db

DB_POOL_SIZE = 10
DB_MAX_OVERFLOW = 20
USE_ALEMBIC: bool    = os.getenv("USE_ALEMBIC", "false").lower() == "true"

_raw_model_path = os.getenv("MODEL_PATH", "../ml-backend/models/best_siamese.pth")
MODEL_PATH: Path = (Path(__file__).parent / _raw_model_path).resolve()

EMBEDDING_DIM: int = int(os.getenv("EMBEDDING_DIM", "128"))

VERIFY_THRESHOLD: float = float(os.getenv("VERIFY_THRESHOLD", "0.5"))

_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
ALLOWED_ORIGINS: list[str] = [o.strip() for o in _raw_origins.split(",") if o.strip()]

INFERENCE_WORKERS: int = int(os.getenv("INFERENCE_WORKERS", str(os.cpu_count() or 4)))

LOG_LEVEL: str      = os.getenv("LOG_LEVEL", "INFO").upper()
ENABLE_METRICS: bool = os.getenv("ENABLE_METRICS", "true").lower() == "true"
APP_VERSION: str    = os.getenv("APP_VERSION", "1.0.0")

ENV: str            = os.getenv("ENV", "development").lower()
IS_PRODUCTION: bool = ENV == "production"
