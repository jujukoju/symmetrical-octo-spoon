"""
oracle_api/tests/test_enroll.py
--------------------------------
Integration tests for POST /v1/enroll.

Covers:
  - Happy path: valid NIN + valid BMP → 200, correct schema
  - Re-enrolment: same NIN submitted twice → 200, status='re-enrolled'
  - Invalid NIN: wrong format → 422
  - Missing image: no fingerprint field → 422
  - Invalid image bytes: text payload instead of image → 422
  - NIN too short / too long → 422
  - NIN with letters → 422
"""

import pytest


# ── Happy path ────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_enroll_success(client, dummy_bmp_bytes, random_nin):
    resp = await client.post(
        "/v1/enroll",
        data={
            "nin": random_nin,
            "user_wallet_address": "0x1234567890123456789012345678901234567890",
        },
        files={"fingerprint": ("fp.bmp", dummy_bmp_bytes, "image/bmp")},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["nin"]    == random_nin
    assert data["status"] == "enrolled"
    assert "request_id"   in data
    assert "timestamp"    in data


@pytest.mark.asyncio
async def test_enroll_response_has_request_id_header(client, dummy_bmp_bytes, random_nin):
    resp = await client.post(
        "/v1/enroll",
        data={
            "nin": random_nin,
            "user_wallet_address": "0x1234567890123456789012345678901234567890",
        },
        files={"fingerprint": ("fp.bmp", dummy_bmp_bytes, "image/bmp")},
    )
    assert "X-Request-ID" in resp.headers


# ── Re-enrolment ──────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_reenroll_same_nin(client, dummy_bmp_bytes, random_nin):
    """Second enrolment of the same NIN returns status='re-enrolled'."""
    # First enrolment
    await client.post(
        "/v1/enroll",
        data={
            "nin": random_nin,
            "user_wallet_address": "0x1234567890123456789012345678901234567890",
        },
        files={"fingerprint": ("fp.bmp", dummy_bmp_bytes, "image/bmp")},
    )
    # Second enrolment
    resp = await client.post(
        "/v1/enroll",
        data={
            "nin": random_nin,
            "user_wallet_address": "0x1234567890123456789012345678901234567890",
        },
        files={"fingerprint": ("fp.bmp", dummy_bmp_bytes, "image/bmp")},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "re-enrolled"


# ── NIN validation ────────────────────────────────────────────────────────────

@pytest.mark.asyncio
@pytest.mark.parametrize("bad_nin", [
    "123456789",          # too short (9 digits)
    "123456789012",       # too long (12 digits)
    "1234567890A",        # contains a letter
    "12345 67890",        # contains a space
    "",                   # empty
    "ABCDEFGHIJK",        # all letters
])
async def test_enroll_invalid_nin(client, dummy_bmp_bytes, bad_nin):
    resp = await client.post(
        "/v1/enroll",
        data={
            "nin": bad_nin,
            "user_wallet_address": "0x1234567890123456789012345678901234567890",
        },
        files={"fingerprint": ("fp.bmp", dummy_bmp_bytes, "image/bmp")},
    )
    assert resp.status_code == 422, f"Expected 422 for NIN='{bad_nin}', got {resp.status_code}"


# ── Image validation ──────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_enroll_missing_image(client, random_nin):
    """Request without a fingerprint file should return 422."""
    resp = await client.post(
        "/v1/enroll",
        data={
            "nin": random_nin,
            "user_wallet_address": "0x1234567890123456789012345678901234567890",
        },
        # No 'files' argument
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_enroll_invalid_image_bytes(client, random_nin):
    """Sending plain text as the image should return 422."""
    resp = await client.post(
        "/v1/enroll",
        data={
            "nin": random_nin,
            "user_wallet_address": "0x1234567890123456789012345678901234567890",
        },
        files={"fingerprint": ("fp.bmp", b"this is not an image", "image/bmp")},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_enroll_oversized_image(client, random_nin):
    """Image exceeding the 10 MB limit should return 422."""
    big = b"\x00" * (11 * 1024 * 1024)   # 11 MB of zeros
    resp = await client.post(
        "/v1/enroll",
        data={
            "nin": random_nin,
            "user_wallet_address": "0x1234567890123456789012345678901234567890",
        },
        files={"fingerprint": ("big.bmp", big, "image/bmp")},
    )
    assert resp.status_code == 422
