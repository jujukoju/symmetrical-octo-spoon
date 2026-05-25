"""
oracle_api/tests/test_health.py
--------------------------------
Integration tests for GET /health.
"""

import pytest


@pytest.mark.asyncio
async def test_health_returns_200(client):
    resp = await client.get("/health")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_health_response_schema(client):
    """All required fields are present in the response."""
    resp = await client.get("/health")
    data = resp.json()
    assert "status"       in data
    assert "model_loaded" in data
    assert "db_ok"        in data
    assert "version"      in data
    assert "timestamp"    in data


@pytest.mark.asyncio
async def test_health_db_ok(client):
    """Database connectivity check should pass with SQLite test DB."""
    resp = await client.get("/health")
    assert resp.json()["db_ok"] is True


@pytest.mark.asyncio
async def test_health_request_id_propagated(client):
    """X-Request-ID sent in request should appear in response headers."""
    my_id = "test-request-id-abc123"
    resp  = await client.get("/health", headers={"X-Request-ID": my_id})
    assert resp.headers.get("X-Request-ID") == my_id


@pytest.mark.asyncio
async def test_health_generates_request_id(client):
    """If no X-Request-ID is sent, one should be generated in the response."""
    resp = await client.get("/health")
    assert "X-Request-ID" in resp.headers
    assert len(resp.headers["X-Request-ID"]) > 0
