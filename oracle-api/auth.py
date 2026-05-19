"""
oracle-api/auth.py
------------------
API key authentication for the NINAuth Oracle API.

How it works:
  - API consumers receive a plaintext key (e.g. from `make gen-key`).
  - This service stores only the SHA-256 hash of each valid key.
  - On each request the incoming key is hashed and compared to stored hashes.
  - Keys are read from env vars: API_KEY_HASH_1, API_KEY_HASH_2, ...

Key generation:
    python auth.py --generate
    # Prints both the plaintext key and its hash.
    # Add the hash to .env; give the plaintext to the API consumer.
"""

import hashlib
import os
import secrets
import sys
from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader


_api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def _load_valid_hashes() -> frozenset[str]:
    """Load all API_KEY_HASH_n values from environment variables."""
    hashes: set[str] = set()
    i = 1
    while True:
        val = os.environ.get(f"API_KEY_HASH_{i}")
        if val is None:
            break
        stripped = val.strip()
        if stripped:
            hashes.add(stripped)
        i += 1
    return frozenset(hashes)


def _hash_key(plaintext: str) -> str:
    return hashlib.sha256(plaintext.encode()).hexdigest()


async def verify_api_key(api_key: str | None = Security(_api_key_header)) -> str:
    """FastAPI dependency — raises 403 if the key is missing or invalid.

    Usage:
        @router.post("/v1/enroll")
        async def enroll(_auth: str = Depends(verify_api_key)):
            ...
    """
    valid_hashes = _load_valid_hashes()

    # If no keys are configured (dev mode), skip auth
    if not valid_hashes:
        return "dev-no-auth"

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="X-API-Key header is required.",
        )

    if _hash_key(api_key) not in valid_hashes:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid API key.",
        )

    return api_key


# ── CLI helper ────────────────────────────────────────────────────────────────

def _cli_generate() -> None:
    plaintext = secrets.token_hex(32)
    hashed    = _hash_key(plaintext)
    print("\n=== New API Key ===")
    print(f"Plaintext (give to consumer):  {plaintext}")
    print(f"Hash (add to .env):            API_KEY_HASH_1={hashed}\n")


if __name__ == "__main__":
    if "--generate" in sys.argv:
        _cli_generate()
    else:
        print("Usage: python auth.py --generate")
