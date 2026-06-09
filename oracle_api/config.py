"""
Environment-variable driven configuration for the Oracle API.
De-coupled from SQL databases and fortified with production-grade runtime guards.
"""

import os
import logging
from pathlib import Path
from dotenv import load_dotenv

log = logging.getLogger("oracle_api.config")

# Load environment boundaries safely across local directory footprints
load_dotenv(Path(__file__).parent / ".env", override=False)
load_dotenv(Path(__file__).parent.parent / ".env", override=False)

ENV: str = os.getenv("ENV", "development").lower()
IS_PRODUCTION: bool = ENV == "production"
APP_VERSION: str = os.getenv("APP_VERSION", "1.0.0")
LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO").upper()

# ── 1. Cryptographic Startup Identity & Key Guards ───────────────────────────
AES_MASTER_KEY: str = os.getenv("AES_MASTER_KEY", "").strip()

# Refuse startup inside config directly if key is unconfigured or left as placeholder
if AES_MASTER_KEY in {
    "", 
    "0000000000000000000000000000000000000000000000000000000000000000", 
    "default_placeholder_value"
}:
    raise RuntimeError(
        "FATAL CRYPTOGRAPHIC FAULT: 'AES_MASTER_KEY' is empty or set to an all-zeros placeholder. "
        "The API refuses initialization to protect biometric templates from insecure encryption."
    )

API_KEY_HASHES: frozenset[str] = frozenset(
    [os.environ[k].strip() for k in os.environ if k.startswith("API_KEY_HASH_") if os.environ[k].strip()]
)

# ── 2. Pure Decentralized Storage Parameters (SQL Purged) ───────────────────
IPFS_RPC_URL: str = os.getenv("IPFS_RPC_URL", "http://127.0.0.1:5001")

# ── 3. Model Space and Empirical Threshold Safety ───────────────────────────
_raw_model_path = os.getenv("MODEL_PATH", "../ml-backend/models/best_siamese_v1.pth")
MODEL_PATH: Path = (Path(__file__).parent / _raw_model_path).resolve()

EMBEDDING_DIM: int = int(os.getenv("EMBEDDING_DIM", "128"))

# Enforce explicit evaluation parameters — remove untrained default (0.5) fallback
_threshold_raw = os.getenv("VERIFY_THRESHOLD")
if _threshold_raw is None:
    raise RuntimeError(
        "FATAL CONFIGURATION FAULT: 'VERIFY_THRESHOLD' is unconfigured. "
        "You must explicitly provide an empirically derived threshold matching your "
        "trained model's Equal Error Rate (EER) inside your environment profile."
    )
try:
    VERIFY_THRESHOLD: float = float(_threshold_raw)
except ValueError:
    raise RuntimeError("VERIFY_THRESHOLD must be a valid floating-point representation.")

# ── 4. Cross-Origin Production Safety ─────────────────────────────────────────
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
ALLOWED_ORIGINS: list[str] = [o.strip() for o in _raw_origins.split(",") if o.strip()]

if IS_PRODUCTION:
    for origin in ALLOWED_ORIGINS:
        if "localhost" in origin or "127.0.0.1" in origin or origin == "*":
            raise RuntimeError(
                f"CRITICAL CONFIGURATION ERROR: Permissive cross-origin target '{origin}' "
                f"discovered while running under production constraints. Localhost/wildcards are forbidden."
            )

# ── 5. Environment-Aware Compute Allocations ─────────────────────────────────
def _get_optimal_workers() -> int:
    if os.name == "nt":  # Safe multi-processing boundary fallback for Windows systems
        return 0
    # Dynamically optimize Unix infrastructure cores leaving processing margins
    cores = os.cpu_count()
    return max(1, cores - 1) if cores else 1

INFERENCE_WORKERS: int = int(os.getenv("INFERENCE_WORKERS", str(_get_optimal_workers())))
ENABLE_METRICS: bool = os.getenv("ENABLE_METRICS", "true").lower() == "true"