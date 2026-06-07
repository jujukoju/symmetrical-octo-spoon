"""
Input validation for NIN and fingerprint images.

NIN format:
  - Exactly 11 decimal digits (no spaces, no letters, no hyphens).
  - Reference: NIMC (National Identity Management Commission) specification.

Image validation:
  - Accepts JPEG, PNG, BMP uploads.
  - Decodes the raw bytes with OpenCV to confirm the image is valid.
  - Enforces a maximum upload size (10 MB) as a defence against denial-of-service.
  
"""

import re
import cv2
import numpy as np

_NIN_RE = re.compile(r"^\d{11}$")

MAX_IMAGE_BYTES = 10 * 1024 * 1024   # 10 MB
ALLOWED_MIME_PREFIXES = ("image/jpeg", "image/jpg", "image/png", "image/bmp")


def validate_nin(nin: str) -> str:
    nin = nin.strip()
    if not _NIN_RE.match(nin):
        raise ValueError(
            f"Invalid NIN '{nin}'. "
            "An NIN must be exactly 11 decimal digits with no spaces or letters."
        )
    return nin


def validate_image_bytes(contents: bytes, content_type: str) -> np.ndarray:
    if len(contents) > MAX_IMAGE_BYTES:
        raise ValueError(
            f"Image is too large ({len(contents) / 1024 / 1024:.1f} MB). "
            f"Maximum allowed size is {MAX_IMAGE_BYTES // 1024 // 1024} MB."
        )

    ct = (content_type or "").lower()
    if ct and not any(ct.startswith(p) for p in ALLOWED_MIME_PREFIXES):
        raise ValueError(
            f"Unsupported image type '{content_type}'. "
            "Accepted formats: JPEG, PNG, BMP."
        )

    buf = np.frombuffer(contents, dtype=np.uint8)
    img = cv2.imdecode(buf, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError(
            "Could not decode the uploaded file as an image. "
            "Ensure the file is a valid JPEG, PNG, or BMP."
        )
    return img
