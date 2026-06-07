"""
oracle_api/schemas.py
----------------------
Pydantic request and response models for the NINAuth Oracle API.

All models use strict type annotations so FastAPI can auto-generate
accurate OpenAPI documentation.
"""

from datetime import datetime
from pydantic import BaseModel, Field

class EnrollResponse(BaseModel):
    """Response returned by POST /v1/enroll."""
    nin: str       = Field(..., description="11-digit Nigerian NIN")
    status: str    = Field(..., description="'enrolled' or 're-enrolled'")
    request_id: str
    timestamp: str = Field(..., description="ISO-8601 UTC timestamp")

    model_config = {"json_schema_extra": {
        "example": {
            "nin": "12345678901",
            "status": "enrolled",
            "request_id": "a3b4c5d6-...",
            "timestamp": "2026-05-19T20:00:00+00:00",
        }
    }}

class VerifyResponse(BaseModel):
    """Response returned by POST /v1/verify."""
    nin: str          = Field(..., description="11-digit Nigerian NIN")
    similarity: float = Field(..., ge=-1.0, le=1.0, description="Cosine similarity ∈ [-1, 1]")
    distance: float   = Field(..., ge=0.0,  le=2.0, description="Cosine distance ∈ [0, 2]")
    threshold: float  = Field(..., description="Operating threshold used for this request")
    decision: str     = Field(..., description="'MATCH' or 'NO_MATCH'")
    request_id: str
    timestamp: str    = Field(..., description="ISO-8601 UTC timestamp")

    model_config = {"json_schema_extra": {
        "example": {
            "nin": "12345678901",
            "similarity": 0.97,
            "distance": 0.03,
            "threshold": 0.5,
            "decision": "MATCH",
            "request_id": "a3b4c5d6-...",
            "timestamp": "2026-05-19T20:00:01+00:00",
        }
    }}

class HealthResponse(BaseModel):
    """Response returned by GET /health."""
    status: str       = Field(..., description="'ok' when all subsystems are healthy")
    model_loaded: bool
    db_ok: bool
    version: str
    timestamp: str

    model_config = {"json_schema_extra": {
        "example": {
            "status": "ok",
            "model_loaded": True,
            "db_ok": True,
            "version": "1.0.0",
            "timestamp": "2026-05-19T20:00:00+00:00",
        }
    }}
