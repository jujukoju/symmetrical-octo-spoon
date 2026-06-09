"""
config.py
---------
Centralised configuration for the ml-backend.
Hardened with model versioning controls, adaptive worker scaling, 
and strict validation bounds for Online Triplet Loss execution.

All paths are relative to the ml-backend/ working directory.
"""

import os
import sys
import numpy as np
from pathlib import Path

# ── Paths & Model Versioning Space ──────────────────────────────────────────
DATA_ROOT       = Path("data")
SOCOFING_ROOT   = DATA_ROOT / "SOCOFing"          # raw dataset root
RAW_DIR         = SOCOFING_ROOT / "Real"          # real fingerprints
ALTERED_DIR     = SOCOFING_ROOT / "Altered"       # altered fingerprints
PROCESSED_DIR   = DATA_ROOT / "processed_png"     # preprocessed .png cache
METADATA_DIR    = DATA_ROOT / "metadata"          # metadata.csv lives here
METADATA_PATH   = METADATA_DIR / "metadata.csv"
REPORTS_DIR     = Path("reports")                 # evaluation plots/outputs
MODEL_SAVE_DIR  = Path("models")

# Explicit Model Versioning protects against embedding space drift when retraining
MODEL_VERSION   = os.getenv("MODEL_VERSION", "v1").lower()
MODEL_PATH      = MODEL_SAVE_DIR / f"best_siamese_{MODEL_VERSION}.pth"

# ── Image Processing & Gabor Configurations ─────────────────────────────────
IMG_SIZE = (128, 128)   # (width, height) — must match model FC input dim

GABOR_KSIZE = int(os.getenv("GABOR_KSIZE", "21")) # Preserving core baseline kernel dimensions

# ── Model Topology ──────────────────────────────────────────────────────────
EMBEDDING_DIM = int(os.getenv("EMBEDDING_DIM", "128"))

# ── Online Triplet Mining Training Parameters ────────────────────────────────
LEARNING_RATE       = float(os.getenv("LEARNING_RATE", "1e-3"))
BATCH_SIZE          = int(os.getenv("BATCH_SIZE", "32")) # Recommending multiples of identities (P*K)
NUM_EPOCHS          = int(os.getenv("NUM_EPOCHS", "50"))
TRIPLET_MARGIN      = float(os.getenv("TRIPLET_MARGIN", "1.0")) # Core hinge separation margin

# PxK Sampler constraints: Each batch contains P unique subjects, and K matching samples each
ONLINE_MINING_K     = int(os.getenv("ONLINE_MINING_K", "4")) 

EARLY_STOP_PATIENCE = int(os.getenv("EARLY_STOP_PATIENCE", "8"))
LR_PATIENCE         = int(os.getenv("LR_PATIENCE", "5"))   # ReduceLROnPlateau patience
PIN_MEMORY          = os.getenv("PIN_MEMORY", "true").lower() == "true"

# ── Environment-Aware Multiprocessing Workers ──────────────────────────────
def _get_optimal_train_workers() -> int:
    """
    Safely controls multi-threading workers to prevent spawn issues on Windows 
    while maximizing computational performance on Linux pipeline environments.
    """
    if os.name == "nt" or sys.platform.startswith("win"):
        return 0
    cpu_count = os.cpu_count()
    # Leave 1 core free for OS/Infrastructural operations
    return max(1, cpu_count - 1) if cpu_count else 1

NUM_WORKERS = int(os.getenv("NUM_WORKERS", str(_get_optimal_train_workers())))

# ── Split Ratios (Subject-Wise Partitioning constraints) ───────────────────
SPLIT = {
    "train": 0.70,
    "val":   0.15,
    "test":  0.15,
    "seed":  42,
}

# ── Verification Threshold Assertion (Untrained Default Purged) ──────────────
_threshold_raw = os.getenv("VERIFY_THRESHOLD")
if _threshold_raw is None:
    # If explicitly running an evaluation pass, allow initialization without crashing
    if "evaluate.py" in sys.argv[0] or "run_pipeline.py" in sys.argv[0]:
        THRESHOLD = None
    else:
        raise RuntimeError(
            "FATAL CONFIGURATION ERROR: 'VERIFY_THRESHOLD' is unconfigured. "
            "You must supply an empirically derived threshold matching your "
            "trained model version's Equal Error Rate (EER) inside your environment profile."
        )
else:
    THRESHOLD = float(_threshold_raw)