"""
embedding.py
------------
Wraps the trained Siamese base network to extract 128-D embeddings
for any preprocessed fingerprint image asset or inbound live bytes payload.
Thread-safe and optimized for production FastAPI microservice injection.
"""

import cv2
import numpy as np
import torch
from pathlib import Path
from typing import Union

from models.siamese import FingerprintSiamese
from preprocessing.pipeline import PreprocessingPipeline


class EmbeddingExtractor:
    """
    Loads a trained FingerprintSiamese model and extracts 128-D embeddings.
    Thread-safe implementation decoupled from state variables for multi-threaded inference.
    """

    def __init__(
        self,
        model_path: Union[str, Path] = "models/best_siamese.pth",
        embedding_dim: int = 128,
        device: torch.device = None,
    ):
        self.device = device or torch.device("cuda" if torch.cuda.is_available() else "cpu")

        # Initialize core metric model architecture matching structural updates
        self.model = FingerprintSiamese(embedding_dim=embedding_dim).to(self.device)
        
        # Safe weight deserialization using weights_only constraints
        state_dict = torch.load(str(model_path), map_location=self.device, weights_only=True)
        
        # Strip unexpected module prefixes if the state dict was saved from data parallel loops
        if next(iter(state_dict.keys())).startswith("module."):
            state_dict = {k.replace("module.", ""): v for k, v in state_dict.items()}
            
        self.model.load_state_dict(state_dict)
        self.model.eval()

    def get_embedding(self, img_input: Union[str, Path, bytes, np.ndarray]) -> np.ndarray:
        """
        Extracts a 128-D L2-normalised feature vector from a given input.
        Thread-safe: Preprocessing instances are isolated completely within the local frame scope.
        
        Args:
            img_input: File path string, Path object, raw file bytes, or loaded NumPy matrix.
            
        Returns:
            1D float32 NumPy array representation bounded on a unit hypersphere.
        """
        # 1. Thread-Safe Fix: Instantiate pipeline locally within the frame execution stack
        preprocessor = PreprocessingPipeline(img_size=(128, 128))

        # 2. Ingestion Handler: Resolve API byte buffers vs database paths dynamically
        if isinstance(img_input, (str, Path)):
            raw_img = cv2.imread(str(img_input))
            if raw_img is None:
                raise ValueError(f"Inference Engine failed to read asset path: {img_input}")
        elif isinstance(img_input, bytes):
            # Parse network payload bytes directly into a usable OpenCV matrix buffer
            np_arr = np.frombuffer(img_input, np.uint8)
            raw_img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            if raw_img is None:
                raise ValueError("Inference Engine failed to decode inbound network byte bytes.")
        elif isinstance(img_input, np.ndarray):
            raw_img = img_input.copy()
        else:
            raise TypeError("Unsupported image ingestion format passed to EmbeddingExtractor.")

        # 3. Apply dynamic ridge tuning, CLAHE enhancement, and resizing
        processed_img = preprocessor.process(raw_img, augment=False)

        # 4. Enforce strict single-channel dimensions (B=1, C=1, H=128, W=128)
        tensor = torch.tensor(processed_img, dtype=torch.float32, device=self.device)
        tensor = tensor.unsqueeze(0).unsqueeze(0)

        # 5. Non-mutating thread-isolated evaluation pass
        with torch.no_grad():
            embedding = self.model.forward_once(tensor)
            
        return embedding.cpu().numpy().flatten()


if __name__ == "__main__":
    # Smoke test verification context
    extractor = EmbeddingExtractor()