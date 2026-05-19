"""
data/split.py
-------------
Subject-wise dataset splitting for the SOCOFing fingerprint dataset.

Parses all image filenames (Real + Altered) into a metadata DataFrame with:
  subject_id, sex, hand, finger_name, alteration_type, difficulty,
  filename, full_path, split

Split ratios: 70% train / 15% val / 15% test (subject-wise, no leakage).
"""

import pandas as pd
from pathlib import Path
from typing import Optional
from sklearn.model_selection import train_test_split


# ── Filename parser ────────────────────────────────────────────────────────

def parse_filename(filename: str) -> dict:
    """
    Parse a SOCOFing filename into its metadata components.

    Real format:
        {id}__{sex}_{hand}_{finger}_finger.BMP
        e.g. 100__M_Left_index_finger.BMP

    Altered format:
        {id}__{sex}_{hand}_{finger}_finger_{alteration}_{difficulty}.BMP
        e.g. 100__M_Left_index_finger_CR_Easy.BMP

    Returns a dict with keys:
        subject_id, sex, hand, finger_name,
        alteration_type, difficulty, filename
    """
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
        # meta = [sex, hand, finger, "finger", (alteration,), (difficulty,)]

        sex = meta[0] if len(meta) > 0 else None          # M / F
        hand = meta[1] if len(meta) > 1 else None          # Left / Right
        finger_name = meta[2] if len(meta) > 2 else None   # index / little / ...

        # meta[3] is always the literal "finger" — skip it
        alteration_type = meta[4] if len(meta) > 4 else "real"   # CR / Obl / Zcut / real
        difficulty_raw = meta[5] if len(meta) > 5 else "real"    # Easy / Medium / Hard / real
        difficulty = difficulty_raw.lower()                        # normalise

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


# ── Split generator ────────────────────────────────────────────────────────

def create_subject_wise_split(
    socofing_root: str = "data/SOCOFing",
    output_dir: str = "data/metadata",
    train_ratio: float = 0.70,
    val_ratio: float = 0.15,
    random_state: int = 42,
) -> pd.DataFrame:
    """
    Scan all images in socofing_root, build metadata, perform subject-wise
    70/15/15 train/val/test split, and save metadata.csv.

    Subjects never appear in more than one split (no leakage).

    Args:
        socofing_root:  Root of SOCOFing dataset containing Real/ and Altered/.
        output_dir:     Directory where metadata.csv will be saved.
        train_ratio:    Fraction of subjects for training (default 0.70).
        val_ratio:      Fraction of subjects for validation (default 0.15).
        random_state:   RNG seed for reproducibility.

    Returns:
        Full metadata DataFrame with 'split' column assigned.
    """
    root = Path(socofing_root)
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    records = []
    for img_path in root.rglob("*.BMP"):
        meta = parse_filename(img_path.name)
        if meta["subject_id"] is None:
            continue
        meta["full_path"] = str(img_path)
        records.append(meta)

    # Also catch lowercase .bmp files
    for img_path in root.rglob("*.bmp"):
        meta = parse_filename(img_path.name)
        if meta["subject_id"] is None:
            continue
        key = str(img_path).lower()
        meta["full_path"] = str(img_path)
        records.append(meta)

    df = pd.DataFrame(records).drop_duplicates(subset=["full_path"])
    df = df.dropna(subset=["subject_id"])
    df["subject_id"] = df["subject_id"].astype(int)

    # ── Subject-wise split (no subject leakage) ────────────────────────────
    unique_subjects = df["subject_id"].unique()

    # 70% train  |  30% temp
    train_subj, temp_subj = train_test_split(
        unique_subjects,
        test_size=(1 - train_ratio),
        random_state=random_state,
    )
    # 50% of temp → val, 50% → test  (= 15% / 15% of total)
    val_subj, test_subj = train_test_split(
        temp_subj,
        test_size=0.5,
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
    print(f"  Test  subjects : {len(test_subj)} ({val_ratio*100:.0f}%)")
    print(f"  Metadata saved : {metadata_path}")
    print("\n  Image counts per split:")
    print(df["split"].value_counts().to_string())

    return df


if __name__ == "__main__":
    create_subject_wise_split()
