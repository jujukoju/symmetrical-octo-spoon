"""
embedding.py
------------
Wraps the trained Siamese base network to extract 128-D embeddings
for any preprocessed fingerprint image (Standard 9).

Usage:
    extractor = EmbeddingExtractor(model_path="models/best_siamese.pth")
    embedding = extractor.get_embedding("path/to/fingerprint.png")
    # embedding.shape == (128,), dtype float32, L2-normalised
"""

import cv2  # <--- NEW: Added cv2 import!
import numpy as np
import torch
from pathlib import Path

from models.siamese import FingerprintSiamese
from preprocessing.pipeline import PreprocessingPipeline


class EmbeddingExtractor:
    """
    Loads a trained FingerprintSiamese model and extracts 128-D embeddings.

    The same instance is reused across the FastAPI service so the model
    is loaded only once (via dependency injection in oracle_api).

    Args:
        model_path:    Path to saved .pth state dict.
        embedding_dim: Must match the training config (default 128).
        device:        Torch device; auto-detected if None.
    """

    def __init__(
        self,
        model_path: str = "models/best_siamese.pth",
        embedding_dim: int = 128,
        device: torch.device = None,
    ):
        self.device = device or torch.device("cuda" if torch.cuda.is_available() else "cpu")

        self.model = FingerprintSiamese(embedding_dim=embedding_dim).to(self.device)
        self.model.load_state_dict(
            torch.load(str(model_path), map_location=self.device, weights_only=True)
        )
        self.model.eval()

        self.preprocessor = PreprocessingPipeline(img_size=(128, 128))

    def get_embedding(self, img):
        processed_img = self.preprocessor.process(img, augment=False)

        tensor = torch.tensor(processed_img, dtype=torch.float32)

        tensor = tensor.unsqueeze(0).unsqueeze(0)

        tensor = tensor.to(self.device)

        with torch.no_grad():
            embedding = self.model.forward_once(tensor)
            
        return embedding.cpu().numpy().flatten()