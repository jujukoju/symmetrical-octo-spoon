"""
losses.py
---------
Loss functions for Siamese fingerprint verification training.

Label convention (matches SiamesePairDataset):
    label = 0  →  genuine pair  (same subject)   → pull embeddings closer
    label = 1  →  impostor pair (diff subjects)  → push embeddings apart

Distance metric: cosine distance d = 1 - cosine_similarity ∈ [0, 2].
"""

import torch
import torch.nn.functional as F


def contrastive_loss(
    emb1: torch.Tensor,
    emb2: torch.Tensor,
    label: torch.Tensor,
    margin: float = 1.0,
) -> torch.Tensor:
    # Force embeddings to have unit magnitude (length of 1)
    emb1_norm = F.normalize(emb1, p=2, dim=1)
    emb2_norm = F.normalize(emb2, p=2, dim=1)
    
    cosine_sim = F.cosine_similarity(emb1_norm, emb2_norm, dim=1)
    distance = 1.0 - cosine_sim  # Now strictly bounded and stable

    genuine_loss = (1.0 - label) * torch.pow(distance, 2)
    impostor_loss = label * torch.pow(torch.clamp(margin - distance, min=0.0), 2)

    return torch.mean(genuine_loss + impostor_loss)


def triplet_loss(
    anchor: torch.Tensor,
    positive: torch.Tensor,
    negative: torch.Tensor,
    margin: float = 0.5,
) -> torch.Tensor:
    """
    Triplet Loss with cosine distance.

    Prepared for future hard-negative mining experiments (Standard 5).

    Loss = mean(max(0, d(anchor, pos) - d(anchor, neg) + margin))

    Args:
        anchor:   Anchor embeddings  (B, D).
        positive: Positive embeddings (B, D) — same subject as anchor.
        negative: Negative embeddings (B, D) — different subject.
        margin:   Minimum gap between positive and negative distances.

    Returns:
        Scalar mean triplet loss over the batch.
    """
    d_pos = 1.0 - F.cosine_similarity(anchor, positive, dim=1)
    d_neg = 1.0 - F.cosine_similarity(anchor, negative, dim=1)
    return torch.mean(torch.clamp(d_pos - d_neg + margin, min=0.0))