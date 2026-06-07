"""
API key authentication for the NINAuth Oracle API.
"""

import os
import sys
import secrets
import hashlib
from fastapi.security import APIKeyHeader
from fastapi import HTTPException, Security, status

from config import API_KEY_HASHES

_api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def _hash_key(plaintext: str) -> str:
    return hashlib.sha256(plaintext.encode()).hexdigest()


async def verify_api_key(api_key: str | None = Security(_api_key_header)) -> str:
    if not API_KEY_HASHES:
        return "dev-no-auth"

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="X-API-Key header is required.",
        )

    if _hash_key(api_key) not in API_KEY_HASHES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid API key.",
        )

    return api_key


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
