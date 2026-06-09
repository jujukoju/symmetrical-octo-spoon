"""
oracle_api/auth.py
------------------
Hardened API Key authentication layer using PBKDF2 key-stretching and 
constant-time string comparisons to prevent timing side-channel attacks.
"""

import os
import hmac
import sys
import secrets
import hashlib
from fastapi.security import APIKeyHeader
from fastapi import HTTPException, Security, status

from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

from config import API_KEY_HASHES

_api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

# Fixed system-wide pepper/salt for key stretching derivation (stored securely in env)
AUTH_SALT = os.getenv("AUTH_SALT", "NINAuth_secure_institutional_key_stretching_salt_bytes").encode("utf-8")
ITERATIONS = 100_000  # High iteration count mitigates brute-force/rainbow table sweeps


def _stretch_and_hash_key(plaintext: str) -> str:
    """
    Applies PBKDF2-HMAC-SHA256 stretching over a raw API token string.
    Returns a secure hex string representation.
    """
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=AUTH_SALT,
        iterations=ITERATIONS,
    )
    stretched_bytes = kdf.derive(plaintext.encode("utf-8"))
    return stretched_bytes.hex()


async def verify_api_key(api_key: str | None = Security(_api_key_header)) -> str:
    """
    Validates the inbound X-API-Key header using constant-time evaluation traps.
    """
    if not API_KEY_HASHES:
        return "dev-no-auth"

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing required institutional 'X-API-Key' authorization header."
        )

    # Derive the stretched PBKDF2 representation of the incoming token
    inbound_stretched = _stretch_and_hash_key(api_key).encode("utf-8")

    # Audit the inbound value against all authorized hashes inside the environment
    is_valid = False
    for configured_hash in API_KEY_HASHES:
        # CRITICAL PROTECTION: hmac.compare_digest prevents side-channel timing analysis attacks
        if hmac.compare_digest(inbound_stretched, configured_hash.strip().encode("utf-8")):
            is_valid = True

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Invalid or revoked API key credentials supplied."
        )

    return api_key


def _cli_generate() -> None:
    """Generates a secure plaintext token along with its stretched environment key."""
    plaintext = secrets.token_hex(32)
    hashed = _stretch_and_hash_key(plaintext)
    print("\n=== Hardened PBKDF2 API Key ===")
    print(f"Plaintext (give to consumer):  {plaintext}")
    print(f"Hash (add to your .env):       API_KEY_HASH_1={hashed}\n")


if __name__ == "__main__":
    if "--generate" in sys.argv:
        _cli_generate()
    else:
        print("Usage: python auth.py --generate")