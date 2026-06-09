"""
data/dataloader.py
------------------
Convenience wrapper that creates a DataLoader from FingerprintDataset for 
Online Triplet Loss Mining using a strict PxK Identity Batch Sampler.
Fortified with environment-aware processing threads and high-speed label caching.
"""

import os
import sys
import collections
import random
from pathlib import Path
from typing import Optional, Iterator
import pandas as pd
import torch
from torch.utils.data import DataLoader, Sampler
from data.dataset import FingerprintDataset


def compute_optimal_training_workers() -> int:
    """
    Dynamically scales data-loading multiprocessing threads.
    Safely turns off parallel processes on Windows while leveraging core capacity on Linux servers.
    """
    if os.name == "nt" or sys.platform.startswith("win"):
        return 0
        
    # On Linux/macOS, use available CPU cores minus one to maintain operational stability
    cpu_count = os.cpu_count()
    if cpu_count:
        return max(1, cpu_count - 1)
    return 1


class PKSampler(Sampler[list[int]]):
    """
    Custom Batch Sampler ensuring each mini-batch contains exactly P subjects
    and K fingerprint samples per subject (Total Batch Size = P * K).
    Essential for stable Online Triplet Loss Mining.
    """
    def __init__(self, labels: list[int], num_subjects_per_batch: int, num_samples_per_subject: int):
        self.labels = labels
        self.num_subjects = num_subjects_per_batch
        self.num_samples = num_samples_per_subject
        self.batch_size = self.num_subjects * self.num_samples

        # Map each unique subject label to all its corresponding dataset indices
        self.label_to_indices = collections.defaultdict(list)
        for idx, label in enumerate(self.labels):
            self.label_to_indices[label].append(idx)

        self.unique_subjects = list(self.label_to_indices.keys())

        # Filter out subjects that don't have enough matching fingerprint alterations to satisfy K
        self.eligible_subjects = [
            subj for subj in self.unique_subjects 
            if len(self.label_to_indices[subj]) >= self.num_samples
        ]

    def __iter__(self) -> Iterator[list[int]]:
        # Shuffle subject lists at the start of each training epoch
        random.shuffle(self.eligible_subjects)
        
        # Pre-mix indices per subject to ensure diverse augmentation views
        for subj in self.eligible_subjects:
            random.shuffle(self.label_to_indices[subj])

        # Track tracking pointers per subject group
        pointers = {subj: 0 for subj in self.eligible_subjects}
        active_subjects = self.eligible_subjects.copy()

        while len(active_subjects) >= self.num_subjects:
            # Step 1: Sample P unique subjects for this batch
            batch_subjects = random.sample(active_subjects, self.num_subjects)
            batch_indices = []

            for subj in batch_subjects:
                start_ptr = pointers[subj]
                end_ptr = start_ptr + self.num_samples
                
                # Append K samples for this chosen subject
                batch_indices.extend(self.label_to_indices[subj][start_ptr:end_ptr])
                pointers[subj] = end_ptr

                # If a subject runs out of unmined samples, drop them from the current pool
                if len(self.label_to_indices[subj]) - pointers[subj] < self.num_samples:
                    active_subjects.remove(subj)

            # Yield complete structural index block map
            yield batch_indices

    def __len__(self) -> int:
        return len(self.eligible_subjects) // self.num_subjects


def verify_subject_isolation(metadata_csv_path: Path) -> None:
    """
    Asserts there is absolute zero overlap between subject IDs across
    the train, validation, and testing split groups to guarantee data integrity.
    """
    if not metadata_csv_path.exists():
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
    num_workers: Optional[int] = None,
    pin_memory: bool = True,
    split: str = "train",
    metadata_dir: str = None,
    num_samples_per_subject: int = 4,  # Default K=4 (8 Subjects * 4 Samples = Batch 32)
) -> DataLoader:
    """
    Builds a custom-sampled DataLoader for the fingerprint dataset tailored for Online Triplet Mining.
    Optimizes background worker pools and guarantees metric validation blending.
    """
    meta_dir_path = Path(metadata_dir) if metadata_dir else None
    
    # Resolve dynamic multiprocess thread worker structures safely
    if num_workers is None:
        num_workers = compute_optimal_training_workers()
    
    # 1. Run strict structural cross-split leakage verification
    if meta_dir_path and (meta_dir_path / "metadata.csv").exists():
        verify_subject_isolation(meta_dir_path / "metadata.csv")

    # 2. Build underlying biometric dataset representation
    dataset = FingerprintDataset(
        root=dataset_root,
        augment=augment,
        img_size=img_size,
        pipeline=pipeline,
        split=split,
        metadata_dir=metadata_dir,
    )

    # 3. Apply the PxK Sampler to the training loop to maximize online negative extraction mining
    if split == 'train':
        assert batch_size % num_samples_per_subject == 0, "Batch size must be perfectly divisible by num_samples_per_subject (K)."
        num_subjects_per_batch = batch_size // num_samples_per_subject
        
        # High-Speed Fix: Read pre-parsed lookup labels from dataset cache instead of invoking slow dynamic thread reads
        if hasattr(dataset, 'df') and 'subject_id' in dataset.df.columns:
            labels = dataset.df['subject_id'].astype(int).tolist()
        else:
            labels = [int(item['subject_id']) if isinstance(item, dict) else int(item[1]) for item in dataset]
        
        batch_sampler = PKSampler(
            labels=labels,
            num_subjects_per_batch=num_subjects_per_batch,
            num_samples_per_subject=num_samples_per_subject
        )

        return DataLoader(
            dataset,
            batch_sampler=batch_sampler,
            num_workers=num_workers,
            pin_memory=pin_memory,
        )
    
    # 4. FIX: Validation/testing loaders must use shuffle=True to construct valid cross-match metric batches
    return DataLoader(
        dataset,
        batch_size=batch_size,
        shuffle=True,  # Mixing ensures verification steps evaluate real false-match scenarios
        num_workers=num_workers,
        pin_memory=pin_memory,
        drop_last=False,
    )