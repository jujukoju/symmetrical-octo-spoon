"""
data/split.py
-------------
Subject-wise dataset splitting for the SOCOFing fingerprint dataset.
Optimized to handle cross-platform filesystem casing and dynamic validation scaling.
"""

import pandas as pd
from pathlib import Path
from typing import Optional
from sklearn.model_selection import train_test_split


def parse_filename(filename: str) -> dict:
    """
    Parse a SOCOFing filename into its metadata components securely.
    Removes file extensions completely before indexing string segments.
    """
    # Force uppercase parsing extraction while discarding the trailing extension safely
    stem = Path(filename).stem
    parts = stem.split("__")

    empty = {
        "subject_id": None,
        "sex": None,
        "hand": None,
        "finger_name": None,
        "alteration_type": None,
        "difficulty": None,
        "filename": filename,
    }

    if len(parts) < 2:
        return empty

    try:
        subject_id = int(parts[0])
        meta = parts[1].split("_")

        sex = meta[0] if len(meta) > 0 else None           # M / F
        hand = meta[1] if len(meta) > 1 else None          # Left / Right
        finger_name = meta[2] if len(meta) > 2 else None   # index / little / ...

        # Handle structural metadata strings without trailing extension leaks
        alteration_type = meta[4] if len(meta) > 4 else "real"
        
        if len(meta) > 5:
            # Clean up potential extension remnants if stem parsing drifts
            difficulty_raw = meta[5].split(".")[0]
        else:
            difficulty_raw = "real"
            
        difficulty = difficulty_raw.lower()

        return {
            "subject_id": subject_id,
            "sex": sex,
            "hand": hand,
            "finger_name": finger_name,
            "alteration_type": alteration_type,
            "difficulty": difficulty,
            "filename": filename,
        }

    except Exception:
        return empty


def create_subject_wise_split(
    socofing_root: str = "data/SOCOFing",
    output_dir: str = "data/metadata",
    train_ratio: float = 0.70,
    val_ratio: float = 0.15,
    random_state: int = 42,
) -> pd.DataFrame:
    """
    Scan files with cross-platform filesystem case safety, apply dynamic split-scaling ratios, 
    and output clean validation subsets.
    """
    root = Path(socofing_root)
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    # Cross-platform case safety: Collect paths uniquely via a set
    all_files = set(root.rglob("*"))
    img_paths = [f for f in all_files if f.suffix.lower() in [".bmp"]]

    records = []
    for img_path in img_paths:
        meta = parse_filename(img_path.name)
        if meta["subject_id"] is None:
            continue
        meta["full_path"] = str(img_path)
        records.append(meta)

    df = pd.DataFrame(records).drop_duplicates(subset=["full_path"])
    df = df.dropna(subset=["subject_id"])
    df["subject_id"] = df["subject_id"].astype(int)

    unique_subjects = df["subject_id"].unique()

    # Dynamic target computation for split parameters
    total_remainder_ratio = 1.0 - train_ratio
    # Calculate what fraction val_ratio is of the remainder pool
    val_allocation_ratio = val_ratio / total_remainder_ratio

    # Step 1: Split train out from the tracking array
    train_subj, temp_subj = train_test_split(
        unique_subjects,
        test_size=total_remainder_ratio,
        random_state=random_state,
    )
    
    # Step 2: Dynamically calculate internal test vs validation weights
    val_subj, test_subj = train_test_split(
        temp_subj,
        test_size=(1.0 - val_allocation_ratio),
        random_state=random_state,
    )

    df["split"] = "train"
    df.loc[df["subject_id"].isin(val_subj), "split"] = "val"
    df.loc[df["subject_id"].isin(test_subj), "split"] = "test"

    metadata_path = out / "metadata.csv"
    df.to_csv(metadata_path, index=False)

    print("=== Subject-wise split complete ===")
    print(f"  Total images   : {len(df)}")
    print(f"  Total subjects : {len(unique_subjects)}")
    print(f"  Train subjects : {len(train_subj)} ({train_ratio*100:.0f}%)")
    print(f"  Val   subjects : {len(val_subj)} ({val_ratio*100:.0f}%)")
    print(f"  Test  subjects : {len(test_subj)} ({(1.0 - train_ratio - val_ratio)*100:.0f}%)")
    print(f"  Metadata saved : {metadata_path}")
    print("\n  Image counts per split:")
    print(df["split"].value_counts().to_string())

    return df


if __name__ == "__main__":
    create_subject_wise_split()