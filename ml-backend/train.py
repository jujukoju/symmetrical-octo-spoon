"""
train.py
--------
Keras-style training script for the Siamese fingerprint verification model.

Features:
  - Consumes SiamesePairDataset (pair generators with 1:1 pos:neg ratio).
  - Logs train/val loss and a verification-accuracy proxy each epoch.
  - Saves best model weights (lowest val loss) via early stopping.
  - Uses ReduceLROnPlateau scheduler.
  - All hyper-parameters loaded from config.py.
"""

import json
import logging
import torch
from pathlib import Path
from tqdm import tqdm

import torch.optim as optim
from torch.utils.data import DataLoader

import sys
sys.path.insert(0, str(Path(__file__).parent))

from config import (
    METADATA_PATH, PROCESSED_DIR, MODEL_SAVE_DIR,
    EMBEDDING_DIM, BATCH_SIZE, NUM_WORKERS, PIN_MEMORY,
    LEARNING_RATE, NUM_EPOCHS, MARGIN,
    POS_NEG_RATIO, EARLY_STOP_PATIENCE, LR_PATIENCE,
    THRESHOLD, SPLIT,
)
from models.siamese import FingerprintSiamese
from data.pair_generator import SiamesePairDataset
from losses import contrastive_loss
from utils.logger import get_logger

log = get_logger("train")
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")


def _accuracy_proxy(distances: torch.Tensor, labels: torch.Tensor, threshold: float) -> float:
    """
    Verification accuracy proxy:
    Predict MATCH (0) if distance < threshold, else NO_MATCH (1).
    Compare against ground-truth labels and return accuracy.
    """
    preds = (distances < threshold).float()
    correct = (preds == labels).sum().item()
    return correct / len(labels)


def train() -> None:
    config = {
        "embedding_dim":      EMBEDDING_DIM,
        "batch_size":         BATCH_SIZE,
        "lr":                 LEARNING_RATE,
        "epochs":             NUM_EPOCHS,
        "margin":             MARGIN,
        "pos_neg_ratio":      POS_NEG_RATIO,
        "early_stop_patience": EARLY_STOP_PATIENCE,
        "threshold":          THRESHOLD,
        "metadata_path":      str(METADATA_PATH),
        "processed_dir":      str(PROCESSED_DIR),
        "seed":               SPLIT["seed"],
    }

    log.info(f"Device: {device}")
    log.info(f"Config: {json.dumps(config, indent=2)}")

    # ── Datasets & DataLoaders ─────────────────────────────────────────────
    train_dataset = SiamesePairDataset(
        metadata_path=str(METADATA_PATH),
        processed_dir=str(PROCESSED_DIR),
        split="train",
        pos_neg_ratio=POS_NEG_RATIO,
        seed=SPLIT["seed"],
    )
    val_dataset = SiamesePairDataset(
        metadata_path=str(METADATA_PATH),
        processed_dir=str(PROCESSED_DIR),
        split="val",
        pos_neg_ratio=POS_NEG_RATIO,
        seed=SPLIT["seed"],
    )

    train_loader = DataLoader(
        train_dataset,
        batch_size=BATCH_SIZE,
        shuffle=True,
        num_workers=NUM_WORKERS,
        pin_memory=PIN_MEMORY,
    )
    val_loader = DataLoader(
        val_dataset,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=NUM_WORKERS,
        pin_memory=PIN_MEMORY,
    )

    log.info(f"Train pairs: {len(train_dataset)} | Val pairs: {len(val_dataset)}")

    # ── Model, Optimiser, Scheduler ────────────────────────────────────────
    model = FingerprintSiamese(embedding_dim=EMBEDDING_DIM).to(device)
    optimizer = optim.Adam(model.parameters(), lr=LEARNING_RATE)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, mode="min", factor=0.5, patience=LR_PATIENCE, verbose=True
    )

    MODEL_SAVE_DIR.mkdir(parents=True, exist_ok=True)
    best_val_loss = float("inf")
    patience_counter = 0
    history = []

    # ── Training Loop ──────────────────────────────────────────────────────
    for epoch in range(1, NUM_EPOCHS + 1):
        # ─ Train ─
        model.train()
        train_loss = 0.0
        for img1, img2, labels in tqdm(train_loader, desc=f"Epoch {epoch}/{NUM_EPOCHS} [train]", leave=False):
            img1   = img1.to(device)
            img2   = img2.to(device)
            labels = labels.to(device)

            emb1, emb2, _ = model(img1, img2)
            loss = contrastive_loss(emb1, emb2, labels, margin=MARGIN)

            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            train_loss += loss.item()

        avg_train_loss = train_loss / len(train_loader)

        # ─ Validation ─
        model.eval()
        val_loss = 0.0
        all_distances: list = []
        all_labels: list = []

        with torch.no_grad():
            for img1, img2, labels in tqdm(val_loader, desc=f"Epoch {epoch}/{NUM_EPOCHS} [val]", leave=False):
                img1   = img1.to(device)
                img2   = img2.to(device)
                labels = labels.to(device)

                emb1, emb2, dist = model(img1, img2)
                loss = contrastive_loss(emb1, emb2, labels, margin=MARGIN)
                val_loss += loss.item()

                all_distances.append(dist.cpu())
                all_labels.append(labels.cpu())

        avg_val_loss = val_loss / len(val_loader)

        all_dist_t = torch.cat(all_distances)
        all_lbl_t  = torch.cat(all_labels)
        val_acc    = _accuracy_proxy(all_dist_t, all_lbl_t, THRESHOLD)

        scheduler.step(avg_val_loss)

        log.info(
            f"Epoch {epoch:>3} | "
            f"Train Loss: {avg_train_loss:.4f} | "
            f"Val Loss: {avg_val_loss:.4f} | "
            f"Val Acc: {val_acc:.4f}"
        )

        history.append({
            "epoch": epoch,
            "train_loss": avg_train_loss,
            "val_loss":   avg_val_loss,
            "val_acc":    val_acc,
        })

        # ─ Checkpoint best model ─
        if avg_val_loss < best_val_loss:
            best_val_loss = avg_val_loss
            patience_counter = 0
            torch.save(model.state_dict(), MODEL_SAVE_DIR / "best_siamese.pth")
            log.info(f"  ✓ Saved best model (val_loss={best_val_loss:.4f})")
        else:
            patience_counter += 1
            if patience_counter >= EARLY_STOP_PATIENCE:
                log.info(f"Early stopping triggered at epoch {epoch}.")
                break

    # ── Save config + history ──────────────────────────────────────────────
    config["history"] = history
    with open(MODEL_SAVE_DIR / "training_config.json", "w") as f:
        json.dump(config, f, indent=4)

    log.info(f"Training complete. Best val loss: {best_val_loss:.4f}")
    log.info(f"Model saved to: {MODEL_SAVE_DIR / 'best_siamese.pth'}")


if __name__ == "__main__":
    train()