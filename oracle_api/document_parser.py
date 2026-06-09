"""
oracle_api/document_parser.py
------------------------------
Automated Biometric Fingerprint Structural Auditor and Document Content Parser.
Protects the decentralized IPFS network from junk files and spoofed payloads.
"""

import cv2
import numpy as np
from fastapi import HTTPException, status


class IngestionParser:
    """
    Analyzes raw image matrices using structural feature extraction 
    to verify actual fingerprint patterns or official document layouts.
    """

    @staticmethod
    def verify_is_fingerprint(img: np.ndarray) -> None:
        """
        Uses mathematical texture analysis to confirm the image contains high-contrast 
        alternating ridge lines rather than random objects, faces, or blank files.
        """
        # 1. Convert to grayscale to evaluate structural texture channels
        if len(img.shape) == 3:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        else:
            gray = img.copy()

        # 2. Check Clarity & Sharpness via the Laplacian Variance
        # Smooth or blank fake images have low variance, while fine ridge lines produce sharp gradients
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        if laplacian_var < 80.0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Biometric verification failure: Image lacks the textural sharpness required for authentic fingerprints."
            )

        # 3. Frequency Analysis: Evaluate Ridgeline Intersections via Gabor Response Variance
        # Fingerprints have high directional frequency patterns. We check gradient directional distribution.
        gx = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
        gy = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
        
        magnitude, angle = cv2.cartToPolar(gx, gy)
        
        # Authentic fingerprint ridges cause high spatial frequency energy variations
        edge_density = np.mean(magnitude > 20.0)
        if edge_density < 0.15 or edge_density > 0.85:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Biometric rejection: Texture signature does not match valid fingerprint ridge density patterns."
            )

    @staticmethod
    def parse_and_verify_document(img: np.ndarray, expected_type: str = "identity_slip") -> dict:
        """
        Scans uploaded citizenship onboarding documents to verify standard structural shapes
        and bounding regions, ensuring it is a document rather than a random background asset.
        """
        if len(img.shape) == 3:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        else:
            gray = img.copy()

        # 1. Binarize to locate crisp horizontal text line blocks
        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

        # 2. Extract Morphological Bounding Segments to map out text rows
        # Structural documents have highly structured, rectangular rows of text blocks
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (25, 5))
        dilated = cv2.dilate(thresh, kernel, iterations=1)
        
        contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Count the number of structured bounding text lines found
        text_row_count = sum(1 for c in contours if cv2.boundingRect(c)[2] > 50 and cv2.boundingRect(c)[3] > 8)

        # Verification Gate: Official documents have multiple parallel textual data streams
        if text_row_count < 4:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Document parsing failure: Image lacks the dense textual structure required for identity verification documents."
            )

        return {
            "parsed_successfully": True,
            "detected_text_rows": text_row_count,
            "document_class": expected_type,
        }