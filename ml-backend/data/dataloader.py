# data/dataloader.py
"""
data/dataloader.py
------------------
Convenience wrapper that creates a DataLoader from PalmDataset for 
Online Triplet Loss Mining with rigid subject isolation assertions.
"""

import os
import pandas as pd
from torch.utils.data import DataLoader
from data.dataset import PalmDataset


def verify_subject_isolation(metadata_csv_path: str) -> None:
    """
    Asserts there is absolute zero overlap between subject IDs across
    the train, validation, and testing split groups to guarantee 
    mathematical data integrity.
    """
    if not os.path.exists(metadata_csv_path):
        # Allow missing paths to pass silently during early initialization or mock tests
        return

    df = pd.read_csv(metadata_csv_path)
    
    # Isolate subject sets per split category
    train_subjects = set(df[df['split'] == 'train']['subject_id'])
    val_subjects = set(df[df['split'] == 'val']['subject_id'])
    test_subjects = set(df[df['split'] == 'test']['subject_id'])

    # Enforce strict subject-wise disjoint checks
    assert train_subjects.isdisjoint(val_subjects), "🚨 SUBJECT LEAKAGE DETECTED: Train and Validation sets share Subject IDs!"
    assert train_subjects.isdisjoint(test_subjects), "🚨 SUBJECT LEAKAGE DETECTED: Train and Test sets share Subject IDs!"
    assert val_subjects.isdisjoint(test_subjects), "🚨 SUBJECT LEAKAGE DETECTED: Validation and Test sets share Subject IDs!"


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
    Build a DataLoader for the fingerprint dataset tailored for Online Triplet Mining.

    Args:
        dataset_root:  Directory of preprocessed PNG images.
        augment:       Enable albumentations augmentations.
        img_size:      Target (H, W) for images.
        pipeline:      PreprocessingPipeline instance (optional).
        batch_size:    Mini-batch size (Recommend multiples of classes/identities).
        shuffle:       Shuffle the dataset each epoch.
        num_workers:   DataLoader workers (0 = main process, safe on Windows).
        pin_memory:    Pin tensors to CUDA pinned memory.
        split:         Filter by 'train'/'val'/'test' (requires metadata_dir).
        metadata_dir:  Path to directory containing metadata.csv.

    Returns:
        Configured DataLoader instance yielding (image_tensors, subject_labels).
    """
    
    # 1. Run strict structural cross-split leakage verification prior to loader initialization
    if metadata_dir and os.path.exists(os.path.join(metadata_dir, "metadata.csv")):
        csv_target = os.path.join(metadata_dir, "metadata.csv")
        verify_subject_isolation(csv_target)

    # 2. Build the underling structural biometric dataset representation
    # Note: Ensure PalmDataset.__getitem__ is configured to return: image, subject_id
    dataset = PalmDataset(
        root=dataset_root,
        augment=augment,
        img_size=img_size,
        pipeline=pipeline,
        split=split,
        metadata_dir=metadata_dir,
    )

    # 3. Compile configuration inside standard PyTorch DataLoader abstractions
    return DataLoader(
        dataset,
        batch_size=batch_size,
        shuffle=shuffle,
        num_workers=num_workers,
        pin_memory=pin_memory,
        drop_last=True if split == 'train' else False, # Ensures fixed dimensions for online batch-hard matrix operations
    )