"""
oracle-api/main.py
-------------------
NINAuth Oracle API — FastAPI application entrypoint.

Startup sequence:
  1. Load configuration from .env.
  2. Create DB tables if USE_ALEMBIC=false (development / SQLite).
  3. Register middleware (Request ID, CORS).
  4. Mount Prometheus /metrics if ENABLE_METRICS=true.
  5. Register route routers: /health, /v1/enroll, /v1/verify.

Run locally:
    uvicorn main:app --reload --port 8001

Swagger docs (development only):
    http://localhost:8001/docs
"""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import ALLOWED_ORIGINS, APP_VERSION, ENABLE_METRICS, IS_PRODUCTION, LOG_LEVEL, USE_ALEMBIC
from database import create_all_tables
from inference_pool import shutdown_pool
from middleware.request_id import RequestIDMiddleware
from routes import enroll, health, verify

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s | %(levelname)-8s | %(name)s — %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
log = logging.getLogger("oracle-api")


# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("NINAuth Oracle API v%s starting up…", APP_VERSION)

    if not USE_ALEMBIC:
        await create_all_tables()
    else:
        log.info("USE_ALEMBIC=true — skipping create_all_tables (run alembic upgrade head).")

    yield  # ← application is live

    shutdown_pool()
    log.info("NINAuth Oracle API shut down cleanly.")


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="NINAuth Oracle API",
    description=(
        "Middleware service for the NINAuth Decentralised Biometric Identity Verification Platform.\n\n"
        "Provides fingerprint enrolment and real-time verification using a trained Siamese "
        "Neural Network with AES-256-GCM encrypted template storage."
    ),
    version=APP_VERSION,
    lifespan=lifespan,
    # Hide docs in production
    docs_url=None  if IS_PRODUCTION else "/docs",
    redoc_url=None if IS_PRODUCTION else "/redoc",
)

# ── Middleware ────────────────────────────────────────────────────────────────
app.add_middleware(RequestIDMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# ── Prometheus metrics ────────────────────────────────────────────────────────
if ENABLE_METRICS:
    try:
        from prometheus_client import make_asgi_app
        metrics_app = make_asgi_app()
        app.mount("/metrics", metrics_app)
        log.info("Prometheus metrics mounted at /metrics.")
    except ImportError:
        log.warning("prometheus_client not installed — metrics endpoint disabled.")

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(health.router)
app.include_router(enroll.router)
app.include_router(verify.router)
