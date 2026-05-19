"""
config.py
---------
Centralised configuration for the ml-backend.

All paths are relative to the ml-backend/ working directory.
Override individual settings via environment variables or by editing this file.
"""

import os
from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────────────────
DATA_ROOT       = Path("data")
SOCOFING_ROOT   = DATA_ROOT / "SOCOFing"          # raw dataset root
RAW_DIR         = SOCOFING_ROOT / "Real"          # real fingerprints
ALTERED_DIR     = SOCOFING_ROOT / "Altered"       # altered fingerprints
PROCESSED_DIR   = DATA_ROOT / "processed_png"     # preprocessed .png cache
METADATA_DIR    = DATA_ROOT / "metadata"          # metadata.csv lives here
METADATA_PATH   = METADATA_DIR / "metadata.csv"
REPORTS_DIR     = Path("reports")                 # evaluation plots/outputs
MODEL_SAVE_DIR  = Path("models")
MODEL_PATH      = MODEL_SAVE_DIR / "best_siamese.pth"

# ── Image Processing ───────────────────────────────────────────────────────
IMG_SIZE = (128, 128)   # (width, height) — must match model FC input dim

# ── Gabor Filter ──────────────────────────────────────────────────────────
import numpy as np
GABOR = {
    "ksize":  21,
    "sigma":  5.0,
    "lambda": 10.0,
    "gamma":  0.5,
    "thetas": [0, np.pi / 4, np.pi / 2, 3 * np.pi / 4],
}

# ── Model ──────────────────────────────────────────────────────────────────
EMBEDDING_DIM = 128

# ── Training ───────────────────────────────────────────────────────────────
LEARNING_RATE   = 1e-3
BATCH_SIZE      = 32
NUM_EPOCHS      = 50
MARGIN          = 1.0         # contrastive loss margin
POS_NEG_RATIO   = 1.0         # positive : negative pair balance
EARLY_STOP_PATIENCE = 8
LR_PATIENCE     = 5           # ReduceLROnPlateau patience
# Windows multiprocessing note: set NUM_WORKERS=0 to avoid spawn issues
NUM_WORKERS     = int(os.getenv("NUM_WORKERS", "0"))
PIN_MEMORY      = True

# ── Split Ratios ───────────────────────────────────────────────────────────
SPLIT = {
    "train": 0.70,
    "val":   0.15,
    "test":  0.15,
    "seed":  42,
}

# ── Verification Threshold ─────────────────────────────────────────────────
# Cosine distance threshold: pairs with dist < THRESHOLD → MATCH decision.
# Tune this on the validation set after training (see evaluate.py).
THRESHOLD = 0.5