"""
evaluate.py
-----------
Post-training evaluation of the Siamese fingerprint verification model.

Computes (Standard 8):
  - Accuracy at the configured operating threshold
  - FAR  — False Accept Rate  (impostors accepted as genuine)
  - FRR  — False Reject Rate  (genuines rejected as impostors)
  - ROC curve (TPR vs FPR)
  - DET curve (FRR vs FAR)
  - EER  — Equal Error Rate  (FAR ≈ FRR, the natural operating point)

Outputs:
  - reports/roc_curve.png
  - reports/det_curve.png
  - reports/metrics_summary.json
  - Console summary table
"""

import json
import torch
import numpy as np
from pathlib import Path
from tqdm import tqdm
from torch.utils.data import DataLoader

import sys
sys.path.insert(0, str(Path(__file__).parent))

from config import (
    METADATA_PATH, PROCESSED_DIR, MODEL_SAVE_DIR,
    EMBEDDING_DIM, BATCH_SIZE, NUM_WORKERS, THRESHOLD,
)
from models.siamese import FingerprintSiamese
from data.pair_generator import SiamesePairDataset
from utils.logger import get_logger

log = get_logger("evaluate")
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

REPORTS_DIR = Path("reports")


def _compute_metrics(distances: np.ndarray, labels: np.ndarray, threshold: float) -> dict:
    """Compute accuracy, FAR, FRR at a single threshold."""
    preds   = (distances < threshold).astype(int)  # 1=match prediction
    truth   = (labels == 0).astype(int)            # 1=genuine pair ground truth

    tp = int(((preds == 1) & (truth == 1)).sum())
    tn = int(((preds == 0) & (truth == 0)).sum())
    fp = int(((preds == 1) & (truth == 0)).sum())
    fn = int(((preds == 0) & (truth == 1)).sum())

    accuracy = (tp + tn) / max(tp + tn + fp + fn, 1)
    far  = fp / max(fp + tn, 1)   # False Accept Rate
    frr  = fn / max(fn + tp, 1)   # False Reject Rate

    return {"accuracy": accuracy, "FAR": far, "FRR": frr, "TP": tp, "TN": tn, "FP": fp, "FN": fn}


def evaluate(model_path: str = None, split: str = "test") -> dict:
    """
    Run full evaluation on the test split.

    Args:
        model_path: Path to saved .pth weights (defaults to config MODEL_SAVE_DIR).
        split:      Dataset split to evaluate on ('test' by default).

    Returns:
        Summary metrics dictionary.
    """
    if model_path is None:
        model_path = MODEL_SAVE_DIR / "best_siamese.pth"

    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    # ── Load model ─────────────────────────────────────────────────────────
    model = FingerprintSiamese(embedding_dim=EMBEDDING_DIM).to(device)
    model.load_state_dict(torch.load(str(model_path), map_location=device))
    model.eval()
    log.info(f"Loaded model from {model_path}")

    # ── Test pairs ─────────────────────────────────────────────────────────
    test_dataset = SiamesePairDataset(
        metadata_path=str(METADATA_PATH),
        processed_dir=str(PROCESSED_DIR),
        split=split,
        pos_neg_ratio=1.0,
        seed=0,
    )
    test_loader = DataLoader(
        test_dataset,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=NUM_WORKERS,
    )
    log.info(f"Test pairs: {len(test_dataset)}")

    # ── Collect distances & labels ─────────────────────────────────────────
    all_distances: list = []
    all_labels: list    = []

    with torch.no_grad():
        for img1, img2, labels in tqdm(test_loader, desc="Evaluating"):
            img1   = img1.to(device)
            img2   = img2.to(device)
            _, _, dist = model(img1, img2)
            all_distances.append(dist.cpu().numpy())
            all_labels.append(labels.numpy())

    distances = np.concatenate(all_distances)
    labels    = np.concatenate(all_labels)

    # ── Threshold sweep → ROC / DET data ──────────────────────────────────
    thresholds = np.linspace(0.0, 2.0, 400)
    fprs, tprs, fars, frrs = [], [], [], []

    for thr in thresholds:
        m = _compute_metrics(distances, labels, thr)
        tprs.append(1.0 - m["FRR"])       # TPR = 1 - FRR (Genuine Acceptance Rate)
        fprs.append(m["FAR"])
        fars.append(m["FAR"])
        frrs.append(m["FRR"])

    # EER: point where FAR ≈ FRR
    diffs = np.abs(np.array(fars) - np.array(frrs))
    eer_idx = int(np.argmin(diffs))
    eer = float((fars[eer_idx] + frrs[eer_idx]) / 2)
    eer_threshold = float(thresholds[eer_idx])

    # Metrics at configured operating threshold
    op_metrics = _compute_metrics(distances, labels, THRESHOLD)

    summary = {
        "operating_threshold": THRESHOLD,
        "accuracy":  op_metrics["accuracy"],
        "FAR":       op_metrics["FAR"],
        "FRR":       op_metrics["FRR"],
        "EER":       eer,
        "EER_threshold": eer_threshold,
        "n_pairs":   int(len(distances)),
    }

    # ── Print summary ──────────────────────────────────────────────────────
    log.info("\n=== Evaluation Results ===")
    for k, v in summary.items():
        log.info(f"  {k:<25}: {v:.4f}" if isinstance(v, float) else f"  {k:<25}: {v}")

    # ── Save metrics ───────────────────────────────────────────────────────
    with open(REPORTS_DIR / "metrics_summary.json", "w") as f:
        json.dump(summary, f, indent=4)

    # ── ROC & DET plots (optional — requires matplotlib) ───────────────────
    try:
        import matplotlib.pyplot as plt

        # ROC Curve
        fig, ax = plt.subplots()
        ax.plot(fprs, tprs, lw=2, label=f"ROC (EER={eer:.3f})")
        ax.plot([0, 1], [0, 1], "k--", lw=1)
        ax.set_xlabel("False Accept Rate (FAR)")
        ax.set_ylabel("True Accept Rate (1 - FRR)")
        ax.set_title("ROC Curve — Fingerprint Verification")
        ax.legend()
        fig.savefig(REPORTS_DIR / "roc_curve.png", dpi=150, bbox_inches="tight")
        plt.close(fig)

        # DET Curve
        fig, ax = plt.subplots()
        ax.plot(fars, frrs, lw=2, color="darkorange", label=f"DET (EER={eer:.3f})")
        ax.set_xlabel("False Accept Rate (FAR)")
        ax.set_ylabel("False Reject Rate (FRR)")
        ax.set_title("DET Curve — Fingerprint Verification")
        ax.legend()
        fig.savefig(REPORTS_DIR / "det_curve.png", dpi=150, bbox_inches="tight")
        plt.close(fig)

        log.info(f"Plots saved to {REPORTS_DIR}/")

    except ImportError:
        log.warning("matplotlib not installed — skipping plot generation.")

    return summary


if __name__ == "__main__":
    evaluate()
