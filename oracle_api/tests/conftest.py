"""
oracle_api/tests/conftest.py
-----------------------------
Shared pytest fixtures for integration tests.

Fixtures:
  aes_key         — fresh 256-bit AES key set as AES_MASTER_KEY env var
  client          — async httpx.AsyncClient backed by the FastAPI test app
  dummy_bmp_bytes — minimal 10×10 BMP image bytes for upload tests
  enrolled_nin    — NIN that has already been enrolled (calls /v1/enroll)

Usage:
    # Run all tests from the oracle_api/ directory
    pytest tests/ -v --tb=short
"""

import io
import os
import struct
import uuid
import numpy as np
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient


# ── Force SQLite in-memory DB and a fresh AES key for every test run ──────────
@pytest.fixture(scope="session", autouse=True)
def configure_test_env():
    os.environ["DATABASE_URL"]  = "sqlite+aiosqlite:///./test_oracle.db"
    os.environ["ENV"]           = "development"
    os.environ["ENABLE_METRICS"] = "false"
    os.environ["USE_ALEMBIC"]   = "false"
    os.environ["LOG_LEVEL"]     = "WARNING"

    # Clear and prevent API_KEY_HASH_* environment variables from loading in tests
    for k in list(os.environ.keys()) + ["API_KEY_HASH_1", "API_KEY_HASH_2", "API_KEY_HASH_3"]:
        if k.startswith("API_KEY_HASH_"):
            os.environ[k] = ""

    # Fresh AES key for every test session
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    key = AESGCM.generate_key(bit_length=256).hex()
    os.environ["AES_MASTER_KEY"] = key
    yield
    # Cleanup test DB file
    import asyncio
    from database import engine
    try:
        asyncio.run(engine.dispose())
    except Exception:
        pass
    import pathlib
    pathlib.Path("test_oracle.db").unlink(missing_ok=True)


@pytest.fixture(scope="session", autouse=True)
def mock_blockchain_transactions():
    """Mock the blockchain identity registration to prevent real transactions on Sepolia during testing."""
    from unittest.mock import patch
    with patch("routes.enroll.register_identity_on_chain", return_value="0xmocktxhash"):
        yield


@pytest_asyncio.fixture(scope="session", autouse=True)
async def init_db(configure_test_env):
    """Initialize the database schema for the test session."""
    from database import create_all_tables
    await create_all_tables()


@pytest_asyncio.fixture(scope="session")
async def client(configure_test_env):
    """Async httpx client connected to the FastAPI test app."""
    # Import after env vars are set
    from main import app
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as c:
        yield c


# ── Minimal BMP image factory ─────────────────────────────────────────────────

def _make_bmp(width: int = 10, height: int = 10) -> bytes:
    """Generate a valid grayscale BMP file (no external libs required)."""
    # 24-bit BMP, each row padded to a multiple of 4 bytes
    row_size = (width * 3 + 3) & ~3
    pixel_data_size = row_size * height
    file_size = 54 + pixel_data_size

    bmp_header = struct.pack(
        "<2sIHHI",
        b"BM",
        file_size,
        0, 0,
        54,  # pixel data offset
    )
    dib_header = struct.pack(
        "<IiiHHIIiiII",
        40,          # header size
        width, height,
        1,           # colour planes
        24,          # bits per pixel
        0,           # compression (none)
        pixel_data_size,
        2835, 2835,  # pixels per metre (72 DPI)
        0, 0,        # colours in table
    )
    # Grey pixels (128, 128, 128) — BGR order, padded rows
    row = bytes([128, 128, 128] * width) + bytes(row_size - width * 3)
    pixel_data = row * height

    return bmp_header + dib_header + pixel_data


@pytest.fixture(scope="session")
def dummy_bmp_bytes() -> bytes:
    return _make_bmp(width=128, height=128)


@pytest.fixture
def random_nin() -> str:
    """Generate a random valid 11-digit NIN for test isolation."""
    return "".join(str(d) for d in np.random.randint(0, 10, size=11))


@pytest_asyncio.fixture
async def enrolled_nin(client, dummy_bmp_bytes) -> str:
    """Enrol a random NIN and return it (for verify tests)."""
    nin = "".join(str(d) for d in np.random.randint(0, 10, size=11))
    resp = await client.post(
        "/v1/enroll",
        data={
            "nin": nin,
            "user_wallet_address": "0x1234567890123456789012345678901234567890",
        },
        files={"fingerprint": ("fp.bmp", dummy_bmp_bytes, "image/bmp")},
    )
    assert resp.status_code == 202, f"Setup enrolment failed: {resp.text}"
    return nin
