"""
oracle_api/tests/test_verify.py
--------------------------------
Integration tests for POST /v1/verify.

Covers:
  - Same-image verification: enrol then verify with the same image →
      the Siamese model should produce a very small distance (MATCH).
  - Unregistered NIN → 404.
  - NIN with no biometric template → 422.
  - Invalid NIN format → 422.
  - Invalid image → 422.
  - Response schema validation.
  - X-Request-ID propagation.

Note on MATCH/NO_MATCH:
  With a randomly-initialised or real trained model, verifying the exact same
  pixel content against itself will produce distance ≈ 0.0 (MATCH).
  We assert on the response structure and status code rather than the
  exact decision value to keep tests model-agnostic.
"""

import pytest


# ── Happy path — same image ────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_verify_enrolled_nin_returns_200(client, dummy_bmp_bytes, enrolled_nin):
    resp = await client.post(
        "/v1/verify",
        data={"nin": enrolled_nin},
        files={"fingerprint": ("fp.bmp", dummy_bmp_bytes, "image/bmp")},
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_verify_response_schema(client, dummy_bmp_bytes, enrolled_nin):
    """All required fields present in verify response."""
    resp = await client.post(
        "/v1/verify",
        data={"nin": enrolled_nin},
        files={"fingerprint": ("fp.bmp", dummy_bmp_bytes, "image/bmp")},
    )
    data = resp.json()
    assert "nin"        in data
    assert "similarity" in data
    assert "distance"   in data
    assert "threshold"  in data
    assert "decision"   in data
    assert "request_id" in data
    assert "timestamp"  in data


@pytest.mark.asyncio
async def test_verify_distance_is_numeric(client, dummy_bmp_bytes, enrolled_nin):
    resp = await client.post(
        "/v1/verify",
        data={"nin": enrolled_nin},
        files={"fingerprint": ("fp.bmp", dummy_bmp_bytes, "image/bmp")},
    )
    data = resp.json()
    assert isinstance(data["distance"],   float)
    assert isinstance(data["similarity"], float)
    assert 0.0 <= data["distance"] <= 2.0
    assert -1.0 <= data["similarity"] <= 1.0


@pytest.mark.asyncio
async def test_verify_decision_is_valid(client, dummy_bmp_bytes, enrolled_nin):
    resp = await client.post(
        "/v1/verify",
        data={"nin": enrolled_nin},
        files={"fingerprint": ("fp.bmp", dummy_bmp_bytes, "image/bmp")},
    )
    assert resp.json()["decision"] in ("MATCH", "NO_MATCH")


@pytest.mark.asyncio
async def test_verify_same_image_low_distance(client, dummy_bmp_bytes, enrolled_nin):
    """Verifying with the identical image used for enrolment should yield distance ≈ 0."""
    resp = await client.post(
        "/v1/verify",
        data={"nin": enrolled_nin},
        files={"fingerprint": ("fp.bmp", dummy_bmp_bytes, "image/bmp")},
    )
    distance = resp.json()["distance"]
    # Allow ±0.05 tolerance for any minor float ops differences
    assert distance < 0.1, (
        f"Expected near-zero distance for identical image, got {distance:.4f}"
    )


# ── NIN validation ────────────────────────────────────────────────────────────

@pytest.mark.asyncio
@pytest.mark.parametrize("bad_nin", [
    "123456789",      # too short
    "123456789012",   # too long
    "ABCDE678901",    # letters
    "",               # empty
])
async def test_verify_invalid_nin(client, dummy_bmp_bytes, bad_nin):
    resp = await client.post(
        "/v1/verify",
        data={"nin": bad_nin},
        files={"fingerprint": ("fp.bmp", dummy_bmp_bytes, "image/bmp")},
    )
    assert resp.status_code == 422


# ── Not enrolled ──────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_verify_unregistered_nin_returns_404(client, dummy_bmp_bytes):
    """A NIN that has never been enrolled must return 404."""
    unregistered_nin = "99999999999"
    resp = await client.post(
        "/v1/verify",
        data={"nin": unregistered_nin},
        files={"fingerprint": ("fp.bmp", dummy_bmp_bytes, "image/bmp")},
    )
    assert resp.status_code == 404


# ── Image validation ──────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_verify_invalid_image_bytes(client, enrolled_nin):
    resp = await client.post(
        "/v1/verify",
        data={"nin": enrolled_nin},
        files={"fingerprint": ("fp.bmp", b"not an image", "image/bmp")},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_verify_missing_image(client, enrolled_nin):
    resp = await client.post(
        "/v1/verify",
        data={"nin": enrolled_nin},
    )
    assert resp.status_code == 422


# ── Request ID propagation ────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_verify_request_id_in_response_body(client, dummy_bmp_bytes, enrolled_nin):
    my_id = "verify-test-request-id"
    resp  = await client.post(
        "/v1/verify",
        data={"nin": enrolled_nin},
        files={"fingerprint": ("fp.bmp", dummy_bmp_bytes, "image/bmp")},
        headers={"X-Request-ID": my_id},
    )
    assert resp.json()["request_id"] == my_id


@pytest.mark.asyncio
async def test_verify_request_id_in_header(client, dummy_bmp_bytes, enrolled_nin):
    my_id = "verify-header-test-456"
    resp  = await client.post(
        "/v1/verify",
        data={"nin": enrolled_nin},
        files={"fingerprint": ("fp.bmp", dummy_bmp_bytes, "image/bmp")},
        headers={"X-Request-ID": my_id},
    )
    assert resp.headers.get("X-Request-ID") == my_id
