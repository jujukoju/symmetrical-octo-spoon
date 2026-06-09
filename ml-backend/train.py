"""
train.py
--------
Consolidated Training Loop for NINAuth adjusted for Online Triplet Metric Learning.
Integrates PxK samplers, single-pass feature extractions, and online batch mining.
"""

import json
import logging
import torch
from pathlib import Path
from tqdm import tqdm

import torch.optim as optim

import sys
sys.path.insert(0, str(Path(__file__).parent))

from config import (
    METADATA_PATH, PROCESSED_DIR, MODEL_SAVE_DIR,
    EMBEDDING_DIM, BATCH_SIZE, NUM_WORKERS, PIN_MEMORY,
    LEARNING_RATE, NUM_EPOCHS, MARGIN,
    EARLY_STOP_PATIENCE, LR_PATIENCE, THRESHOLD, SPLIT,
)
from models.siamese import FingerprintSiamese
from data.dataloader import get_dataloader
from losses import BatchHardTripletLoss
from utils.logger import get_logger

log = get_logger("train")
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")


def _evaluate_accuracy_proxy(model: FingerprintSiamese, loader, threshold: float) -> tuple[float, float]:
    """
    Online Validation Evaluation Engine.
    Computes all-pairs pairwise distances across validation mini-batches to verify
    biometric separation parameters under unit-norm bounds.
    """
    model.eval()
    total_loss = 0.0
    correct_predictions = 0
    total_comparisons = 0
    criterion = BatchHardTripletLoss(margin=MARGIN)

    with torch.no_grad():
        for images, labels in loader:
            images = images.to(device)
            labels = labels.to(device)

            # Extract 128-D L2-normalised features
            embeddings = model.forward_once(images)
            loss = criterion(embeddings, labels)
            total_loss += loss.item()

            # Generate an all-pairs distance matrix to evaluate verification decisions
            dot_product = torch.matmul(embeddings, embeddings.t())
            square_norm = torch.diag(dot_product)
            distances_sq = square_norm.unsqueeze(0) - 2.0 * dot_product + square_norm.unsqueeze(1)
            distances = torch.sqrt(torch.clamp(distances_sq, min=1e-16))

            # Exclude identity diagonals from verification tests
            mask = ~torch.eye(distances.size(0), device=device).bool()
            valid_distances = distances[mask]
            
            # Construct a truth grid (0 for MATCH/Same ID, 1 for NO_MATCH/Different ID)
            truth_grid = (labels.unsqueeze(0) != labels.unsqueeze(1))[mask].float()
            
            # Prediction: Predict MATCH (0.0) if distance <= threshold, else NO_MATCH (1.0)
            predictions = (valid_distances > threshold).float()
            
            correct_predictions += (predictions == truth_grid).sum().item()
            total_comparisons += truth_grid.numel()

    avg_loss = total_loss / len(loader)
    accuracy = correct_predictions / max(total_comparisons, 1)
    return avg_loss, accuracy


def train() -> None:
    config = {
        "embedding_dim":       EMBEDDING_DIM,
        "batch_size":          BATCH_SIZE,
        "lr":                  LEARNING_RATE,
        "epochs":              NUM_EPOCHS,
        "margin":              MARGIN,
        "early_stop_patience": EARLY_STOP_PATIENCE,
        "threshold":           THRESHOLD,
        "metadata_path":       str(METADATA_PATH),
        "processed_dir":       str(PROCESSED_DIR),
        "seed":                SPLIT["seed"],
        "num_samples_per_subject": 4,  # Dynamic K parameter configuration
    }

    log.info(f"Device: {device}")
    log.info(f"Config: {json.dumps(config, indent=2)}")

    # ── Custom PxK Identity DataLoaders ──────────────────────────────────
    train_loader = get_dataloader(
        dataset_root=str(PROCESSED_DIR),
        augment=True,
        img_size=(128, 128),
        batch_size=BATCH_SIZE,
        num_workers=NUM_WORKERS,
        pin_memory=PIN_MEMORY,
        split="train",
        metadata_dir=str(METADATA_PATH.parent),
        num_samples_per_subject=config["num_samples_per_subject"],
    )

    val_loader = get_dataloader(
        dataset_root=str(PROCESSED_DIR),
        augment=False,
        img_size=(128, 128),
        batch_size=BATCH_SIZE,
        num_workers=NUM_WORKERS,
        pin_memory=PIN_MEMORY,
        split="val",
        metadata_dir=str(METADATA_PATH.parent),
    )

    # ── Model, Optimiser, and Online Metric Criterion ──────────────────────
    model = FingerprintSiamese(embedding_dim=EMBEDDING_DIM).to(device)
    criterion = BatchHardTripletLoss(margin=MARGIN)
    optimizer = optim.Adam(model.parameters(), lr=LEARNING_RATE)
    
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, 
        mode="min", 
        factor=0.5, 
        patience=LR_PATIENCE
    )

    MODEL_SAVE_DIR.mkdir(parents=True, exist_ok=True)
    best_val_loss = float("inf")
    patience_counter = 0
    history = []

    # ── Training Loop ──────────────────────────────────────────────────────
    for epoch in range(1, NUM_EPOCHS + 1):
        # ─ Training Phase ─
        model.train()
        train_loss = 0.0
        
        progress_bar = tqdm(train_loader, desc=f"Epoch {epoch}/{NUM_EPOCHS} [train]", leave=False)
        for images, labels in progress_bar:
            images = images.to(device)
            labels = labels.to(device)

            # Single forward pass maps images into an optimized representation
            embeddings = model.forward_once(images)
            loss = criterion(embeddings, labels)

            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            
            train_loss += loss.item()

        avg_train_loss = train_loss / len(train_loader)

        # ─ Validation Phase ─
        avg_val_loss, val_acc = _evaluate_accuracy_proxy(model, val_loader, THRESHOLD)

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

        # ─ Checkpoint Verification ─
        if avg_val_loss < best_val_loss:
            best_val_loss = avg_val_loss
            patience_counter = 0
            torch.save(model.state_dict(), MODEL_SAVE_DIR / "best_siamese.pth")
            log.info(f"  ✓ Saved best metric model weights (val_loss={best_val_loss:.4f})")
        else:
            patience_counter += 1
            if patience_counter >= EARLY_STOP_PATIENCE:
                log.info(f"Early stopping triggered at epoch {epoch}.")
                break

    # ── Save Workspace Artifacts ───────────────────────────────────────────
    config["history"] = history
    with open(MODEL_SAVE_DIR / "training_config.json", "w") as f:
        json.dump(config, f, indent=4)

    log.info(f"Training complete. Best val loss: {best_val_loss:.4f}")
    log.info(f"Weights serialized to: {MODEL_SAVE_DIR / 'best_siamese.pth'}")


if __name__ == "__main__":
    train()