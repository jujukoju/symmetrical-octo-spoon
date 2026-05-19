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

import numpy as np
import torch
from pathlib import Path

from models.siamese import FingerprintSiamese
from preprocessing.pipeline import PreprocessingPipeline


class EmbeddingExtractor:
    """
    Loads a trained FingerprintSiamese model and extracts 128-D embeddings.

    The same instance is reused across the FastAPI service so the model
    is loaded only once (via dependency injection in oracle-api).

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

    def get_embedding(self, image_path_or_array) -> np.ndarray:
        """
        Extract a 128-D L2-normalised embedding vector.

        Args:
            image_path_or_array: File path (str/Path) OR pre-loaded numpy array.
                If a path, the image is loaded and fully preprocessed.
                If an array, it is assumed to already be preprocessed (float32, H×W).

        Returns:
            1-D float32 numpy array of shape (128,), L2-normalised.
        """
        if isinstance(image_path_or_array, (str, Path)):
            raw = self.preprocessor.load_image(image_path_or_array)
            processed = self.preprocessor.process(raw, augment=False)
        else:
            processed = image_path_or_array   # assume already preprocessed

        # Ensure shape is (1, H, W)
        if processed.ndim == 2:
            processed = np.expand_dims(processed, axis=0)

        # Add batch dimension → (1, 1, H, W)
        tensor = torch.from_numpy(processed).unsqueeze(0).float().to(self.device)

        with torch.no_grad():
            embedding = self.model.forward_once(tensor)  # (1, 128)

        return embedding.cpu().numpy()[0]  # (128,)