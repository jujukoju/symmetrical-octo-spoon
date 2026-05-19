"""
scripts/run_pipeline.py
------------------------
Orchestration script that wires all pipeline stages together:

  Step 1 — Preprocess raw SOCOFing images → cached PNGs
  Step 2 — Parse filenames, build metadata.csv, perform 70/15/15 subject split
  Step 3 — Validate: build train DataLoader and print one batch shape

Run from the ml-backend/ directory:
    cd nin_system/ml-backend
    python scripts/run_pipeline.py
"""

import sys
import logging
from pathlib import Path

# Ensure ml-backend root is on the path
sys.path.insert(0, str(Path(__file__).parent.parent))

from preprocessing.pipeline import PreprocessingPipeline
from data.split import create_subject_wise_split
from data.pair_generator import SiamesePairDataset
from torch.utils.data import DataLoader
from config import (
    SOCOFING_ROOT, PROCESSED_DIR, METADATA_DIR, METADATA_PATH,
    IMG_SIZE, GABOR, BATCH_SIZE, NUM_WORKERS, SPLIT,
)
import numpy as np

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)
log = logging.getLogger("run_pipeline")


def main():
    # ── Step 1: Preprocess raw images ─────────────────────────────────────
    log.info("=== Step 1: Preprocessing raw fingerprint images ===")
    pipeline = PreprocessingPipeline(
        img_size=IMG_SIZE,
        gabor_ksize=GABOR["ksize"],
        gabor_sigma=GABOR["sigma"],
        gabor_thetas=GABOR["thetas"],
        gabor_lambda=GABOR["lambda"],
        gabor_gamma=GABOR["gamma"],
    )
    pipeline.process_directory(
        input_dir=SOCOFING_ROOT,
        output_dir=PROCESSED_DIR,
        augment=False,
    )

    # ── Step 2: Build metadata + subject-wise split ────────────────────────
    log.info("\n=== Step 2: Building metadata and subject-wise split ===")
    df = create_subject_wise_split(
        socofing_root=str(SOCOFING_ROOT),
        output_dir=str(METADATA_DIR),
        train_ratio=SPLIT["train"],
        val_ratio=SPLIT["val"],
        random_state=SPLIT["seed"],
    )

    # ── Step 3: Validate pair DataLoader ──────────────────────────────────
    log.info("\n=== Step 3: Validating train DataLoader ===")
    train_dataset = SiamesePairDataset(
        metadata_path=str(METADATA_PATH),
        processed_dir=str(PROCESSED_DIR),
        split="train",
        pos_neg_ratio=1.0,
        seed=SPLIT["seed"],
    )
    train_loader = DataLoader(
        train_dataset,
        batch_size=BATCH_SIZE,
        shuffle=True,
        num_workers=NUM_WORKERS,
    )

    img1, img2, labels = next(iter(train_loader))
    log.info(f"  img1 shape  : {img1.shape}")
    log.info(f"  img2 shape  : {img2.shape}")
    log.info(f"  labels      : {labels[:8].tolist()}")
    log.info(f"  Total pairs : {len(train_dataset)}")

    log.info("\n✓ Pipeline validation complete. Ready to train.")


if __name__ == "__main__":
    main()