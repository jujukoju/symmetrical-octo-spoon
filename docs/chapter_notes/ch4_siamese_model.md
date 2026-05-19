# Chapter 4 — Siamese Model Design & Training

## 4.1 Architecture

### Backbone (shared weights)
```
Input: (B, 1, 128, 128) grayscale tensor

Block 1: Conv2d(1→32, k=3, p=1) → BN → ReLU → MaxPool2d(2) → Dropout(0.2)
Block 2: Conv2d(32→64)           → BN → ReLU → MaxPool2d(2) → Dropout(0.3)
Block 3: Conv2d(64→128)          → BN → ReLU → MaxPool2d(2) → Dropout(0.4)
Block 4: Conv2d(128→256)         → BN → ReLU → MaxPool2d(2) → Dropout(0.4)

Spatial: 128 → 64 → 32 → 16 → 8
Flatten: 256 × 8 × 8 = 16 384
```

### Embedding Head
```
FC(16384 → 512) → BN1d → ReLU → Dropout(0.5)
FC(512 → 128)
L2-normalise → embedding ∈ ℝ¹²⁸ (unit hypersphere)
```

### Distance Metric
- **Cosine distance** = 1 − cosine_similarity ∈ [0, 2]
- Lower distance = more similar pair.

## 4.2 Pair Generation

| Type | Label | Strategy |
|------|-------|---------|
| Positive (genuine) | `0` | Two images from **same subject** |
| Negative (impostor) | `1` | One image each from **different subjects** |

- Ratio: 1:1 (positive : negative) — configurable via `POS_NEG_RATIO`.
- All pairs materialised at `__init__` for deterministic DataLoader indexing.
- Hard negative mining: stub in place (`hard_negative_mining=True` flag) for future Phase 2 improvement.

## 4.3 Loss Function

### Contrastive Loss (chosen)
```
L = (1 − y) · d²  +  y · max(0, margin − d)²

y = 0 → genuine pair  → minimise distance
y = 1 → impostor pair → push distance above margin
```

Margin = **1.0** (cosine distance space; empirically stable).

### Triplet Loss (available)
```
L = max(0, d(a, pos) − d(a, neg) + margin)
```
Implemented in `losses.py`; swap in for Phase 2 hard-negative mining experiments.

## 4.4 Training Configuration

| Hyperparameter | Value | Rationale |
|---------------|-------|-----------|
| Optimizer | Adam | Adaptive LR, robust to lr choice |
| Initial LR | 1e-3 | Standard starting point |
| Batch size | 32 | Balanced memory / gradient quality |
| Max epochs | 50 | Early stopping prevents overfitting |
| Early stop patience | 8 epochs | Generous; LR annealing kicks in first |
| LR scheduler | ReduceLROnPlateau(factor=0.5, patience=5) | Halves LR on val loss plateau |
| Embedding dim | 128 | Balance: rich enough vs compact |

```bash
# Train
cd ml-backend/
python train.py
# Best weights → models/best_siamese.pth
# Config + history → models/training_config.json
```

## 4.5 Evaluation Metrics

| Metric | Definition |
|--------|-----------|
| Accuracy | (TP + TN) / total pairs at operating threshold |
| FAR | FP / (FP + TN) — impostors accepted as genuine |
| FRR | FN / (FN + TP) — genuines rejected as impostors |
| EER | Point where FAR ≈ FRR — natural operating point |
| ROC | TPR vs FAR sweep across thresholds |
| DET | FRR vs FAR sweep (used in biometrics standards) |

```bash
cd ml-backend/
python evaluate.py
# → reports/roc_curve.png
# → reports/det_curve.png
# → reports/metrics_summary.json
```

**After evaluation**, set `VERIFY_THRESHOLD` in `.env` to the `EER_threshold` from `metrics_summary.json`.
