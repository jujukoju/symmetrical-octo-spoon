"""
oracle-api/crypto.py
---------------------
AES-256-GCM encryption utilities for biometric embedding vectors.

Key management (prototype):
  - One master key per deployment, stored in AES_MASTER_KEY env variable.
  - Key is a 64-character hex string representing 32 raw bytes (256 bits).
  - Each encrypt call uses a fresh 12-byte random nonce (AESGCM requirement).
  - The nonce is prepended to the ciphertext, then base64-encoded for storage.

Per-user key derivation is a Phase 2+ improvement — see docs/ch5_ml_backend.md.

Usage:
    enc = BiometricEncryptor()
    blob = enc.encrypt_vector(embedding_array)   # str
    vec  = enc.decrypt_vector(blob)               # np.ndarray
"""

import os
import json
import base64
import numpy as np
from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def generate_master_key() -> str:
    """Generate a cryptographically random 256-bit AES key as a hex string.

    Add the output to your .env:
        AES_MASTER_KEY=<output>
    """
    return AESGCM.generate_key(bit_length=256).hex()


class BiometricEncryptor:
    """
    AES-256-GCM encryptor for 128-D fingerprint embedding vectors.

    Args:
        hex_key: 64-character hex string (32 bytes). If None, reads
                 AES_MASTER_KEY from the environment.

    Raises:
        ValueError: If no key is provided or the key length is wrong.
    """

    def __init__(self, hex_key: str | None = None):
        key_str = hex_key or os.environ.get("AES_MASTER_KEY", "")
        if not key_str:
            raise ValueError(
                "AES_MASTER_KEY is not set. "
                "Run `make gen-key` and add the output to your .env file."
            )
        try:
            self.key = bytes.fromhex(key_str)
        except ValueError:
            raise ValueError("AES_MASTER_KEY must be a valid hex string.")
        if len(self.key) != 32:
            raise ValueError(
                f"AES_MASTER_KEY must be exactly 32 bytes (64 hex chars). "
                f"Got {len(self.key)} bytes."
            )
        self.aesgcm = AESGCM(self.key)

    # ── Public API ────────────────────────────────────────────────────────────

    def encrypt_vector(self, feature_vector: np.ndarray) -> str:
        """Encrypt a float32 numpy vector to a base64-encoded string.

        Format: base64(nonce[12] || ciphertext_with_tag)

        Args:
            feature_vector: 1-D float32 numpy array (e.g. shape (128,)).

        Returns:
            Base64-encoded encrypted payload string.
        """
        if isinstance(feature_vector, np.ndarray):
            data = json.dumps(feature_vector.tolist()).encode("utf-8")
        else:
            data = json.dumps(list(feature_vector)).encode("utf-8")

        nonce      = os.urandom(12)                     # 96-bit nonce
        ciphertext = self.aesgcm.encrypt(nonce, data, None)
        return base64.b64encode(nonce + ciphertext).decode("ascii")

    def decrypt_vector(self, encrypted_b64: str) -> np.ndarray:
        """Decrypt a base64-encoded payload back to a float32 numpy array.

        Args:
            encrypted_b64: Output of encrypt_vector().

        Returns:
            Reconstructed float32 numpy array.

        Raises:
            cryptography.exceptions.InvalidTag: If decryption/auth fails
                (tampered data or wrong key).
        """
        payload    = base64.b64decode(encrypted_b64)
        nonce      = payload[:12]
        ciphertext = payload[12:]
        plaintext  = self.aesgcm.decrypt(nonce, ciphertext, None)
        return np.array(json.loads(plaintext.decode("utf-8")), dtype=np.float32)


# ── Backward-compatible alias ──────────────────────────────────────────────────
EmbeddingEncryptor = BiometricEncryptor


if __name__ == "__main__":
    print("Paste this line into your .env file:")
    print(f"AES_MASTER_KEY={generate_master_key()}")
