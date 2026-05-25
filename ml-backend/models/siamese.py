"""
models/siamese.py
-----------------
Siamese Neural Network for fingerprint verification.

Architecture:
  - Backbone : 4-block CNN (Conv→BN→ReLU→MaxPool→Dropout)
  - Head     : FC 16384 → 512 → 128 with BN, ReLU, Dropout
  - Embedding: 128-D, L2-normalised (unit hypersphere)
  - Distance : cosine distance = 1 - cosine_similarity ∈ [0, 2]

Input : single-channel grayscale images, shape (B, 1, 128, 128).
Output: pair of embeddings + cosine distance.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F


class FingerprintSiamese(nn.Module):
    """
    Shared-weight Siamese network for fingerprint pair verification.

    Two branches share identical weights via a single backbone + head.
    Call forward_once() directly to extract a 128-D embedding for a
    single preprocessed fingerprint (used by EmbeddingExtractor).
    """

    def __init__(self, embedding_dim: int = 128, img_size: int = 128):
        super().__init__()

        # CNN Backbone
        self.backbone = nn.Sequential(
            nn.Conv2d(1, 32, kernel_size=3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2),
            nn.Dropout(0.2),

            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2),
            nn.Dropout(0.3),

            nn.Conv2d(64, 128, kernel_size=3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2),
            nn.Dropout(0.4),

            nn.Conv2d(128, 256, kernel_size=3, padding=1),
            nn.BatchNorm2d(256),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2),
            nn.Dropout(0.4),
        )

        # Compute flattened size dynamically for any img_size
        spatial = img_size // (2 ** 4)        # 128 → 8
        fc_input_dim = 256 * spatial * spatial  # 256 * 8 * 8 = 16384

        # ── Embedding Head ─────────────────────────────────────────────────
        self.head = nn.Sequential(
            nn.Flatten(),
            nn.Linear(fc_input_dim, 512),
            nn.BatchNorm1d(512),
            nn.ReLU(inplace=True),
            nn.Dropout(0.5),
            nn.Linear(512, embedding_dim),
        )

    def forward_once(self, x: torch.Tensor) -> torch.Tensor:
        """
        Extract a 128-D L2-normalised embedding for a single image batch.

        Args:
            x: Image tensor of shape (B, 1, H, W).

        Returns:
            Embedding tensor of shape (B, embedding_dim), unit-norm.
        """
        features = self.backbone(x)
        embedding = self.head(features)
        embedding = F.normalize(embedding, p=2, dim=1)  # L2 normalise
        return embedding

    def forward(
        self,
        img1: torch.Tensor,
        img2: torch.Tensor,
    ) -> tuple:
        """
        Compute embeddings for a pair of images and their cosine distance.

        Args:
            img1: First image batch  (B, 1, H, W).
            img2: Second image batch (B, 1, H, W).

        Returns:
            emb1        : Embedding of img1 (B, D).
            emb2        : Embedding of img2 (B, D).
            cosine_dist : Cosine distance ∈ [0, 2] (B,). Lower = more similar.
        """
        emb1 = self.forward_once(img1)
        emb2 = self.forward_once(img2)
        cosine_sim = F.cosine_similarity(emb1, emb2, dim=1)
        cosine_dist = 1.0 - cosine_sim
        return emb1, emb2, cosine_dist