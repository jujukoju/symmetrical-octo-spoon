"""
data/dataset.py
---------------
PyTorch Dataset for loading preprocessed fingerprint images.

Supports two modes:
  1. metadata_dir: loads image paths and labels from metadata.csv (preferred).
  2. auto-discover: scans processed_dir for .png files, uses parent folder name as class.

Used by get_dataloader() for standard classification experiments.
For Siamese pair training, use SiamesePairDataset (data/pair_generator.py).
"""

import cv2
import torch
from pathlib import Path
from typing import Optional
from torch.utils.data import Dataset

import albumentations as A
from albumentations.pytorch import ToTensorV2

from data.split import create_subject_wise_split   # for metadata generation helper


def _load_metadata(metadata_dir, split: Optional[str] = None) -> list:
    """Load metadata records from metadata.csv, optionally filtered by split."""
    import pandas as pd
    csv_path = Path(metadata_dir) / "metadata.csv"
    df = pd.read_csv(csv_path)
    if split:
        df = df[df["split"] == split]
    return df.to_dict("records")


class PalmDataset(Dataset):
    """
    Dataset for loading preprocessed fingerprint .png images.

    Args:
        root:         Directory containing preprocessed PNG images.
        augment:      Apply albumentations augmentations (training mode).
        img_size:     Target spatial size (H, W).
        pipeline:     PreprocessingPipeline instance; its .augment transform is used.
        split:        Filter by split ('train', 'val', 'test') when using metadata.
        metadata_dir: If provided, load from metadata.csv instead of auto-discover.
    """

    def __init__(
        self,
        root,
        augment: bool = False,
        img_size: tuple = (128, 128),
        pipeline=None,
        split: Optional[str] = None,
        metadata_dir: Optional[str] = None,
    ):
        self.root = Path(root)
        self.augment = augment
        self.img_size = img_size
        self.split = split

        # Augmentation transform: use pipeline's augment if provided
        if pipeline is not None:
            self._aug = pipeline.augment
        else:
            self._aug = A.Compose([
                A.Resize(height=img_size[0], width=img_size[1]),
                ToTensorV2(),
            ])

        if metadata_dir:
            self.samples, self.class_to_idx = self._load_from_metadata(metadata_dir, split)
        else:
            self.samples, self.class_to_idx = self._discover(self.root)

        if not self.samples:
            raise RuntimeError(f"No images found in {self.root} (split={split})")

    def _load_from_metadata(self, metadata_dir, split) -> tuple:
        records = _load_metadata(metadata_dir, split=split)

        subjects = sorted({r["subject_id"] for r in records})
        class_to_idx = {str(s): i for i, s in enumerate(subjects)}

        samples = []
        for r in records:
            # processed PNG lives in self.root with the same stem
            p = self.root / f"{Path(r['filename']).stem}.png"
            if p.exists():
                samples.append((p, class_to_idx[str(r["subject_id"])]))

        return samples, class_to_idx

    def _discover(self, root: Path) -> tuple:
        """Fallback: discover PNGs in root and use parent folder name as class."""
        paths = sorted(root.rglob("*.png"))
        classes = sorted({p.parent.name for p in paths})
        class_to_idx = {c: i for i, c in enumerate(classes)}
        samples = [(p, class_to_idx[p.parent.name]) for p in paths]
        return samples, class_to_idx

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int) -> tuple:
        path, label = self.samples[idx]

        img = cv2.imread(str(path), cv2.IMREAD_GRAYSCALE)
        if img is None:
            raise RuntimeError(f"Failed to read image: {path}")

        img = cv2.resize(img, self.img_size)

        if self.augment:
            img = self._aug(image=img)["image"]
        else:
            img = torch.from_numpy(img).unsqueeze(0).float() / 255.0

        return img, label