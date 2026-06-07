"""
AES-256-GCM encryption utilities for biometric embedding vectors.
"""

import os
import json
import base64
import numpy as np
from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def generate_master_key() -> str:
    return AESGCM.generate_key(bit_length=256).hex()


class BiometricEncryptor:
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

    def encrypt_vector(self, feature_vector: np.ndarray) -> str:
        if isinstance(feature_vector, np.ndarray):
            data = json.dumps(feature_vector.tolist()).encode("utf-8")
        else:
            data = json.dumps(list(feature_vector)).encode("utf-8")

        nonce      = os.urandom(12)                     # 96-bit nonce
        ciphertext = self.aesgcm.encrypt(nonce, data, None)
        return base64.b64encode(nonce + ciphertext).decode("ascii")

    def decrypt_vector(self, encrypted_b64: str) -> np.ndarray:
        payload    = base64.b64decode(encrypted_b64)
        nonce      = payload[:12]
        ciphertext = payload[12:]
        plaintext  = self.aesgcm.decrypt(nonce, ciphertext, None)
        return np.array(json.loads(plaintext.decode("utf-8")), dtype=np.float32)

EmbeddingEncryptor = BiometricEncryptor


if __name__ == "__main__":
    print("Paste this line into your .env file:")
    print(f"AES_MASTER_KEY={generate_master_key()}")
