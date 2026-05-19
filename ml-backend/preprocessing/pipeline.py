"""
preprocessing/pipeline.py
--------------------------
Modular fingerprint preprocessing pipeline.

Reusable in:
  - Training scripts  (process_directory → cached PNGs)
  - FastAPI service   (process → single image array)

Output format: grayscale PNG images saved to disk.
"""

import cv2
import time
import numpy as np
from pathlib import Path
from typing import Optional

import albumentations as A
from albumentations.pytorch import ToTensorV2


class PreprocessingPipeline:
    """End-to-end fingerprint preprocessing pipeline with modular steps."""

    def __init__(
        self,
        img_size: tuple = (128, 128),
        gabor_ksize: int = 21,
        gabor_sigma: float = 5.0,
        gabor_thetas: Optional[list] = None,
        gabor_lambda: float = 10.0,
        gabor_gamma: float = 0.5,
    ):
        if gabor_thetas is None:
            gabor_thetas = [0, np.pi / 4, np.pi / 2, 3 * np.pi / 4]

        self.img_size = img_size
        self.gabor_ksize = gabor_ksize
        self.gabor_sigma = gabor_sigma
        self.gabor_thetas = gabor_thetas
        self.gabor_lambda = gabor_lambda
        self.gabor_gamma = gabor_gamma

        # Augmentation pipeline used only during training
        self.augment = A.Compose([
            A.Rotate(limit=10, p=0.5),
            A.HorizontalFlip(p=0.5),
            A.GaussNoise(p=0.3),
            A.RandomScale(scale_limit=0.1, p=0.5),
            A.RandomBrightnessContrast(p=0.3),
            A.Resize(height=img_size[0], width=img_size[1]),
            ToTensorV2(),
        ])

    # ── Modular preprocessing steps ────────────────────────────────────────

    def load_image(self, path) -> np.ndarray:
        """Load an image from disk as a BGR numpy array."""
        img = cv2.imread(str(path))
        if img is None:
            raise ValueError(f"Could not read image: {path}")
        return img

    def to_grayscale(self, img: np.ndarray) -> np.ndarray:
        """Convert BGR or colour image to grayscale."""
        if len(img.shape) == 3:
            img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        return img

    def extract_roi(self, img: np.ndarray) -> np.ndarray:
        # 1. Convert to float32 for accurate mathematical operations
        img_f = img.astype(np.float32)
        
        # 2. Calculate local variance ( E[X^2] - (E[X])^2 )
        # A block size of 11x11 is large enough to span ridge-valley gaps
        block_size = (11, 11)
        mu = cv2.blur(img_f, block_size)
        mu_sq = cv2.blur(img_f**2, block_size)
        variance = mu_sq - mu**2
        
        # 3. Normalize the variance map to standard 8-bit image format (0-255)
        variance = cv2.normalize(variance, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
        
        # 4. Soft Thresholding
        # Any texture (variance > 15) is kept. This low threshold ensures 
        # faint ridges from worn-down prints are protected.
        _, thresh = cv2.threshold(variance, 15, 255, cv2.THRESH_BINARY)
        
        # 5. Morphological Closing
        # Worn-down prints might have "holes" in the variance map. 
        # Closing bridges these gaps to create one unified solid shape.
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (25, 25))
        closed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
        
        # 6. Find the bounding box of the largest texture blob
        contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if contours:
            largest = max(contours, key=cv2.contourArea)
            x, y, w, h = cv2.boundingRect(largest)
            
            # Add a 5-pixel safety buffer around the crop to avoid cutting the edges
            x1, y1 = max(0, x - 5), max(0, y - 5)
            x2, y2 = min(img.shape[1], x + w + 5), min(img.shape[0], y + h + 5)
            
            return img[y1:y2, x1:x2]
            
        return img

    def enhance_image(self, img: np.ndarray) -> np.ndarray:
        """Apply CLAHE contrast enhancement."""
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        return clahe.apply(img)

    def apply_gabor_filter(self, img: np.ndarray) -> np.ndarray:
        """Apply Gabor filter bank and return mean response as uint8."""
        responses = []
        for theta in self.gabor_thetas:
            kernel = cv2.getGaborKernel(
                (self.gabor_ksize, self.gabor_ksize),
                self.gabor_sigma,
                theta,
                self.gabor_lambda,
                self.gabor_gamma,
            )
            filtered = cv2.filter2D(img, cv2.CV_64F, kernel)
            responses.append(filtered)
        enhanced = np.mean(responses, axis=0)
        enhanced = cv2.normalize(enhanced, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
        return enhanced

    def resize_image(self, img: np.ndarray) -> np.ndarray:
        """Resize to target img_size (width, height)."""
        return cv2.resize(img, self.img_size)

    def normalize_image(self, img: np.ndarray) -> np.ndarray:
        """Normalise pixel values to [0, 1] float32."""
        return img.astype("float32") / 255.0

    # ── Pipeline orchestration ──────────────────────────────────────────────

    def process(self, img: np.ndarray, augment: bool = False) -> np.ndarray:
        """
        Run the full preprocessing pipeline on a single image array.

        Args:
            img:     Raw image as numpy array (BGR or grayscale).
            augment: Apply random augmentations (training only).

        Returns:
            Processed image as float32 in [0,1], shape (H, W).
        """
        img = self.to_grayscale(img)
        img = self.extract_roi(img)
        img = self.enhance_image(img)
        img = self.apply_gabor_filter(img)
        img = self.resize_image(img)

        if augment:
            if img.dtype != np.uint8:
                img = (img * 255).astype(np.uint8)
            result = self.augment(image=img)["image"]
        else:
            result = self.normalize_image(img)

        return result

    def process_directory(
        self,
        input_dir,
        output_dir,
        augment: bool = False,
        max_images: Optional[int] = None,
    ) -> None:
        """
        Preprocess an entire directory of raw fingerprint images and save
        the results as .png files in output_dir (flat structure).

        Args:
            input_dir:  Root directory containing raw images (recurses).
            output_dir: Destination for processed PNGs.
            augment:    Apply augmentation (training mode).
            max_images: Optional cap on number of images to process.
        """
        input_dir = Path(input_dir)
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        extensions = ("*.bmp", "*.BMP", "*.png", "*.jpg", "*.jpeg")
        image_paths: list = []
        for ext in extensions:
            image_paths.extend(input_dir.rglob(ext))

        # De-duplicate (case-insensitive filesystems may double-count)
        seen: set = set()
        deduped: list = []
        for p in image_paths:
            key = str(p).lower()
            if key not in seen:
                seen.add(key)
                deduped.append(p)
        image_paths = deduped

        if max_images:
            image_paths = image_paths[:max_images]

        print(f"Starting preprocessing of {len(image_paths)} images → {output_dir}")
        total_start = time.perf_counter()
        times: list = []
        failed = 0

        for i, img_path in enumerate(image_paths):
            step_start = time.perf_counter()
            try:
                img = self.load_image(img_path)
                processed = self.process(img, augment=augment)

                # Convert float32 back to uint8 for lossless PNG storage
                if processed.dtype == np.float32:
                    save_img = (processed * 255).astype(np.uint8)
                else:
                    save_img = processed

                out_path = output_dir / f"{img_path.stem}.png"
                cv2.imwrite(str(out_path), save_img)

                step_time = time.perf_counter() - step_start
                times.append(step_time)

                if (i + 1) % 500 == 0 or (i + 1) == len(image_paths):
                    avg = np.mean(times) if times else 0.0
                    print(f"  [{i+1}/{len(image_paths)}] Avg {avg:.4f}s/img")

            except Exception as e:
                failed += 1
                print(f"  FAILED {img_path.name}: {e}")

        total_time = time.perf_counter() - total_start
        n = max(len(image_paths), 1)
        print("\n=== Preprocessing Complete ===")
        print(f"  Total images : {len(image_paths)}")
        print(f"  Failed       : {failed}")
        print(f"  Total time   : {total_time:.2f}s")
        print(f"  Avg/image    : {total_time / n:.4f}s")
        print(f"  Output dir   : {output_dir}")