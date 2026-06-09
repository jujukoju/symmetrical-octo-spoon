"""
losses.py
---------
Batch-Hard Online Triplet Loss for the NINAuth biometric verification backend.
Deals with single-batch feature tensors by calculating all-pairs Euclidean 
distance matrices and mining the hardest positive and hardest negative samples online.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F


class BatchHardTripletLoss(nn.Module):
    """
    Batch-Hard Triplet Loss with Online Negative Mining.
    
    For each anchor in a batch:
      - Positive: Mines the furthest sample belonging to the SAME subject ID (Hardest Positive).
      - Negative: Mines the closest sample belonging to a DIFFERENT subject ID (Hardest Negative).
    """

    def __init__(self, margin: float = 1.0):
        super().__init__()
        # Margin parameter is tightly bounded as embeddings are strictly L2-normalised
        self.margin = margin

    def _pairwise_distances(self, embeddings: torch.Tensor) -> torch.Tensor:
        """
        Computes the 2D matrix of pairwise Euclidean distances between all embeddings in a batch.
        Mathematically safe to prevent negative values from precision drift.
        """
        # Formulate: ||a - b||^2 = ||a||^2 - 2<a,b> + ||b||^2
        dot_product = torch.matmul(embeddings, embeddings.t())
        square_norm = torch.diag(dot_product)

        # Broadcast square norms across the grid
        distances = square_norm.unsqueeze(0) - 2.0 * dot_product + square_norm.unsqueeze(1)
        
        # Clamp to avoid taking the square root of negative numbers due to floating point drift
        distances = F.relu(distances)
        
        # Mask diagonals precisely
        mask = torch.eye(distances.size(0), device=distances.device).bool()
        distances[mask] = 0.0

        return torch.sqrt(distances + 1e-16)

    def forward(self, embeddings: torch.Tensor, labels: torch.Tensor) -> torch.Tensor:
        """
        Args:
            embeddings: Tensor of shape (B, embedding_dim), pre-L2-normalized.
            labels: 1D Ground-truth subject IDs of shape (B,).

        Returns:
            Calculated batch-hard triplet loss scalar.
        """
        # 1. Compute the all-pairs pairwise distance matrix
        distance_matrix = self._pairwise_distances(embeddings)

        # 2. Construct binary matrices mapping matching and non-matching identities
        labels_equal = labels.unsqueeze(0) == labels.unsqueeze(1)
        
        # Mask out self-matching identities on the exact diagonal matrix positions
        i_equal_j = torch.eye(labels.size(0), device=labels.device).bool()
        mask_anchor_positive = labels_equal ^ i_equal_j

        # 3. Mine Hardest Positives: Max distance with the same label
        # To find maximums safely, fill non-matching positions with 0.0
        anchor_positive_dist = distance_matrix * mask_anchor_positive.float()
        hardest_positive_dist, _ = torch.max(anchor_positive_dist, dim=1, keepdim=True)

        # 4. Mine Hardest Negatives: Min distance with different labels
        # To find minimums safely, fill matching positions with an artificially large infinity ceiling
        max_dist, _ = torch.max(distance_matrix, dim=1, keepdim=True)
        mask_anchor_negative = ~labels_equal
        anchor_negative_dist = distance_matrix + max_dist * (~mask_anchor_negative).float()
        hardest_negative_dist, _ = torch.min(anchor_negative_dist, dim=1, keepdim=True)

        # 5. Formulate the final Triplet Hinge Loss
        triplet_loss = hardest_positive_dist - hardest_negative_dist + self.margin
        
        # Clamp negative losses to 0.0 (active triplets that violate the margin boundary conditions)
        triplet_loss = F.relu(triplet_loss)

        # Return the mean loss across all valid mined identities in the batch execution window
        return torch.mean(triplet_loss)