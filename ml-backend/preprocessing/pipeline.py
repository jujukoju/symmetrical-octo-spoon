"""
preprocessing/pipeline.py
--------------------------
Modular fingerprint preprocessing pipeline with Dynamic Gabor Tuning.
Fixed return type contradictions, cross-platform path safety, and robust gradient safeguards.
"""

import cv2
import time
import numpy as np
from pathlib import Path
from typing import Optional

import albumentations as A


class PreprocessingPipeline:
    """End-to-end fingerprint preprocessing pipeline with adaptive modular steps."""

    def __init__(
        self,
        img_size: tuple = (128, 128),
        gabor_ksize: int = 21,
    ):
        self.img_size = img_size
        self.gabor_ksize = gabor_ksize

        # Augmentations return NumPy arrays to maintain structural consistency
        self.augment = A.Compose([
            A.Rotate(limit=10, p=0.5),
            A.HorizontalFlip(p=0.5),
            A.GaussNoise(p=0.3),
            A.RandomScale(scale_limit=0.1, p=0.5),
            A.RandomBrightnessContrast(p=0.3),
            A.Resize(height=img_size[0], width=img_size[1]),
        ])

    def load_image(self, path: Path) -> np.ndarray:
        img = cv2.imread(str(path))
        if img is None:
            raise ValueError(f"Could not read image: {path}")
        return img

    def to_grayscale(self, img: np.ndarray) -> np.ndarray:
        if len(img.shape) == 3:
            img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        return img

    def extract_roi(self, img: np.ndarray) -> np.ndarray:
        img_f = img.astype(np.float32)

        block_size = (11, 11)
        mu = cv2.blur(img_f, block_size)
        mu_sq = cv2.blur(img_f**2, block_size)
        variance = mu_sq - mu**2

        variance = cv2.normalize(variance, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
        _, thresh = cv2.threshold(variance, 15, 255, cv2.THRESH_BINARY)

        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (25, 25))
        closed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)

        contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if contours:
            largest = max(contours, key=cv2.contourArea)
            x, y, w, h = cv2.boundingRect(largest)

            x1, y1 = max(0, x - 5), max(0, y - 5)
            x2, y2 = min(img.shape[1], x + w + 5), min(img.shape[0], y + h + 5)
            
            return img[y1:y2, x1:x2]
            
        return img

    def enhance_image(self, img: np.ndarray) -> np.ndarray:
        """Apply CLAHE contrast enhancement."""
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        return clahe.apply(img)

    def _estimate_ridge_parameters(self, img: np.ndarray) -> tuple[float, float]:
        """
        Dynamically estimates the global ridge frequency wavelength (lambda) and 
        dominant orientation variance (sigma scaling) using spatial gradients.
        """
        gx = cv2.Sobel(img, cv2.CV_32F, 1, 0, ksize=3)
        gy = cv2.Sobel(img, cv2.CV_32F, 0, 1, ksize=3)

        gxx = gx * gx
        gyy = gy * gy
        
        mean_gxx = np.mean(gxx)
        mean_gyy = np.mean(gyy)

        # Derive adaptive wavelength
        row_proj = np.mean(img, axis=1)
        zero_crossings = np.where(np.diff(np.sign(row_proj - np.mean(row_proj))))[0]
        
        # Guard against sparse or noisy zero-crossing allocations in worn/damaged prints
        if len(zero_crossings) > 6:
            computed_lambda = float(np.mean(np.diff(zero_crossings)) * 2.0)
        else:
            computed_lambda = 8.0 # Tighter fallback pattern target for high-noise/scarred profiles

        computed_lambda = np.clip(computed_lambda, 4.0, 14.0)

        total_energy = mean_gxx + mean_gyy
        if total_energy > 100.0:
            computed_sigma = computed_lambda * 0.55
        else:
            computed_sigma = computed_lambda * 0.40

        return computed_lambda, computed_sigma

    def apply_gabor_filter(self, img: np.ndarray) -> np.ndarray:
        """Dynamically tunes filter parameters per image context."""
        dynamic_lambda, dynamic_sigma = self._estimate_ridge_parameters(img)
        
        thetas = [0, np.pi / 4, np.pi / 2, 3 * np.pi / 4]
        gamma = 0.5
        
        responses = []
        for theta in thetas:
            kernel = cv2.getGaborKernel(
                (self.gabor_ksize, self.gabor_ksize),
                dynamic_sigma,
                theta,
                dynamic_lambda,
                gamma,
            )
            filtered = cv2.filter2D(img, cv2.CV_64F, kernel)
            responses.append(filtered)
            
        enhanced = np.mean(responses, axis=0)
        enhanced = cv2.normalize(enhanced, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
        return enhanced

    def resize_image(self, img: np.ndarray) -> np.ndarray:
        return cv2.resize(img, self.img_size)

    def normalize_image(self, img: np.ndarray) -> np.ndarray:
        return img.astype("float32") / 255.0

    # ── Pipeline orchestration ──────────────────────────────────────────────

    def process(self, img: np.ndarray, augment: bool = False) -> np.ndarray:
        """
        Processes a single input fingerprint array.
        Guarantees a clean NumPy return signature regardless of execution flags.
        """
        img = self.to_grayscale(img)
        img = self.extract_roi(img)
        img = self.enhance_image(img)
        img = self.apply_gabor_filter(img)
        img = self.resize_image(img)

        if augment:
            if img.dtype != np.uint8:
                img = (img * 255).astype(np.uint8)
            # Extracted result is explicitly kept as an image matrix array
            img = self.augment(image=img)["image"]

        # Ensure both validation and training passes share standard scaling normalization
        return self.normalize_image(img)

    def process_directory(
        self,
        input_dir,
        output_dir,
        augment: bool = False,
        max_images: Optional[int] = None,
    ) -> None:
        input_dir = Path(input_dir)
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        # Cross-platform case safety check
        all_files = set(input_dir.rglob("*"))
        image_paths = [f for f in all_files if f.suffix.lower() in [".bmp", ".png", ".jpg", ".jpeg"]]

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

        print(f"Starting adaptive preprocessing of {len(image_paths)} images → {output_dir}")
        total_start = time.perf_counter()
        times: list = []
        failed = 0

        for i, img_path in enumerate(image_paths):
            step_start = time.perf_counter()
            try:
                img = self.load_image(img_path)
                processed = self.process(img, augment=augment)

                # Safe explicit NumPy conversion for image disk serialization
                save_img = (processed * 255).astype(np.uint8)

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


if __name__ == "__main__":
    # Execution entry point
    pipeline = PreprocessingPipeline()