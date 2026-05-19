"""
data/pair_generator.py
-----------------------
Pre-built Siamese pair dataset for fingerprint verification training.

Label convention:
    label = 0  →  genuine pair  (same subject)   — pulled together
    label = 1  →  impostor pair (diff subject)   — pushed apart

Design decisions:
  - All pairs are materialised at __init__ time for deterministic indexing.
  - pos_neg_ratio controls the positive:negative balance (default 1:1).
  - __getitem__ uses idx directly so DataLoader workers stay consistent.

Future improvement (hard negatives):
  - Set hard_negative_mining=True once embeddings are available.
  - Replace random negatives with the closest non-matching embedding
    (semi-hard: d(anchor,neg) > d(anchor,pos)) for faster convergence.
"""

import random
import numpy as np
import pandas as pd
import torch
from PIL import Image
from pathlib import Path
from torch.utils.data import Dataset


class SiamesePairDataset(Dataset):
    """
    Pre-builds a balanced list of (img1, img2, label) pairs from metadata.csv.

    Args:
        metadata_path:      Path to metadata CSV produced by data/split.py.
        processed_dir:      Directory containing preprocessed .png files.
        split:              One of 'train', 'val', 'test'.
        transform:          Optional transform applied after loading an image.
        pos_neg_ratio:      Ratio of positive to negative pairs (default 1.0 = 1:1).
        seed:               RNG seed for reproducible pair generation.
        hard_negative_mining: Stub flag — no-op until embeddings are available.
    """

    def __init__(
        self,
        metadata_path: str,
        processed_dir: str,
        split: str = "train",
        transform=None,
        pos_neg_ratio: float = 1.0,
        seed: int = 42,
        hard_negative_mining: bool = False,  # future improvement hook
    ):
        self.df = pd.read_csv(metadata_path)
        self.df = self.df[self.df["split"] == split].reset_index(drop=True)
        self.processed_dir = Path(processed_dir)
        self.transform = transform
        self.pos_neg_ratio = pos_neg_ratio
        self.hard_negative_mining = hard_negative_mining  # documented stub

        rng = random.Random(seed)

        # Group row indices by subject_id
        self.subject_groups: dict = {}
        for idx, row in self.df.iterrows():
            sid = int(row["subject_id"])
            self.subject_groups.setdefault(sid, []).append(idx)

        subjects = list(self.subject_groups.keys())

        # ── Build pairs ────────────────────────────────────────────────────
        positive_pairs: list = []   # (idx_a, idx_b, label=0)
        negative_pairs: list = []   # (idx_a, idx_b, label=1)

        for sid, indices in self.subject_groups.items():
            other_subjects = [s for s in subjects if s != sid]
            if not other_subjects:
                continue

            for anchor_idx in indices:
                # Positive: another image of the SAME subject
                pos_pool = [i for i in indices if i != anchor_idx] or indices
                pos_idx = rng.choice(pos_pool)
                positive_pairs.append((anchor_idx, pos_idx, 0))

                # Negative: one image from a DIFFERENT subject (random)
                neg_subject = rng.choice(other_subjects)
                neg_idx = rng.choice(self.subject_groups[neg_subject])
                negative_pairs.append((anchor_idx, neg_idx, 1))

        # Balance: keep neg count = pos count / pos_neg_ratio
        n_neg = int(len(positive_pairs) / pos_neg_ratio)
        negative_pairs = rng.sample(negative_pairs, min(n_neg, len(negative_pairs)))

        self.pairs = positive_pairs + negative_pairs
        rng.shuffle(self.pairs)

    def __len__(self) -> int:
        return len(self.pairs)

    def _load_image(self, df_idx: int) -> torch.Tensor:
        """Load a preprocessed PNG by its DataFrame row index → (1, H, W) float tensor."""
        filename = self.df.loc[df_idx, "filename"]
        path = self.processed_dir / f"{Path(filename).stem}.png"
        img = Image.open(path).convert("L")           # grayscale
        arr = np.array(img, dtype=np.float32) / 255.0  # [0, 1]
        arr = np.expand_dims(arr, axis=0)              # (1, H, W)
        if self.transform:
            arr = self.transform(arr)
        return torch.from_numpy(arr).float()

    def __getitem__(self, idx: int) -> tuple:
        """
        Returns:
            img1  : First image tensor  (1, H, W).
            img2  : Second image tensor (1, H, W).
            label : 0 = genuine, 1 = impostor  (float32 scalar tensor).
        """
        a_idx, b_idx, label = self.pairs[idx]
        img1 = self._load_image(a_idx)
        img2 = self._load_image(b_idx)
        return img1, img2, torch.tensor(label, dtype=torch.float32)