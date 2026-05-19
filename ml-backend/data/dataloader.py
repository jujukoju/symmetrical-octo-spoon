"""
data/dataloader.py
------------------
Convenience wrapper that creates a DataLoader from PalmDataset.
"""

from torch.utils.data import DataLoader
from data.dataset import PalmDataset


def get_dataloader(
    dataset_root: str,
    augment: bool = False,
    img_size: tuple = (128, 128),
    pipeline=None,
    batch_size: int = 32,
    shuffle: bool = True,
    num_workers: int = 0,
    pin_memory: bool = True,
    split: str = None,
    metadata_dir: str = None,
) -> DataLoader:
    """
    Build a DataLoader for the fingerprint dataset.

    Args:
        dataset_root:  Directory of preprocessed PNG images.
        augment:       Enable albumentations augmentations.
        img_size:      Target (H, W) for images.
        pipeline:      PreprocessingPipeline instance (optional).
        batch_size:    Mini-batch size.
        shuffle:       Shuffle the dataset each epoch.
        num_workers:   DataLoader workers (0 = main process, safe on Windows).
        pin_memory:    Pin tensors to CUDA pinned memory.
        split:         Filter by 'train'/'val'/'test' (requires metadata_dir).
        metadata_dir:  Path to directory containing metadata.csv.

    Returns:
        Configured DataLoader instance.
    """
    dataset = PalmDataset(
        root=dataset_root,
        augment=augment,
        img_size=img_size,
        pipeline=pipeline,
        split=split,
        metadata_dir=metadata_dir,
    )

    return DataLoader(
        dataset,
        batch_size=batch_size,
        shuffle=shuffle,
        num_workers=num_workers,
        pin_memory=pin_memory,
    )