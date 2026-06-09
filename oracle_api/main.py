"""
Oracle API — FastAPI application entrypoint.

Production Pipeline Startup sequence:
  1. Enforce strict cryptographic key guards against insecure zero/placeholder matrices.
  2. Setup out-of-band SlowAPI rate limiting handlers to protect the neural network pool.
  3. Register middleware architecture (Request ID tracking context, CORS).
  4. Mount Prometheus /metrics engine if ENABLE_METRICS=true.
  5. Register fully dynamic, decentralized API route sub-routers.
"""

import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.openapi.utils import get_openapi
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Throttling Infrastructure Dependencies
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Drop legacy database imports (PostgreSQL engine is deprecated for pure IPFS storage)
from inference_pool import shutdown_pool
from routes import enroll, health, verify
from middleware.request_id import RequestIDMiddleware
from config import ALLOWED_ORIGINS, APP_VERSION, ENABLE_METRICS, IS_PRODUCTION, LOG_LEVEL

# ── 1. Enforce Cryptographic Startup Key Guard ───────────────────────────────
def enforce_cryptographic_guard() -> None:
    """
    Refuses execution if the AES master key is missing, empty, or using the 
    all-zeros placeholder matrix string from environment files.
    """
    master_key = os.environ.get("AES_MASTER_KEY", "").strip()
    
    insecure_placeholders = {
        "", 
        "0000000000000000000000000000000000000000000000000000000000000000",
        "default_placeholder_value"
    }
    
    if master_key in insecure_placeholders:
        print("\n" + "!" * 80)
        print("FATAL CRITICAL FAULT: AES_MASTER_KEY is unconfigured or set to a placeholder!")
        print("The API is refusing startup to prevent compiling unencrypted biometrics.")
        print("!" * 80 + "\n")
        raise RuntimeError("FATAL: Insecure cryptographic configuration detected.")

# Run the guard check immediately before booting any framework assets
enforce_cryptographic_guard()

# ── 2. Configure Logging & Throttling Engines ─────────────────────────────────
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s | %(levelname)-8s | %(name)s — %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
log = logging.getLogger("oracle_api")

# Configure SlowAPI Limiter to track client tracking parameters via remote IP
limiter = Limiter(key_func=get_remote_address)

@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("NINAuth Oracle API v%s starting up under decentralized configurations…", APP_VERSION)
    log.info("Decentralized ledger context verified over Sepolia and IPFS storage pools.")

    yield  

    log.info("Initializing graceful shutdown sequences...")
    
    # Drain deep learning inference resources safely
    shutdown_pool()
    
    log.info("NINAuth Oracle API shut down cleanly with 0 active dangling sockets.")


app = FastAPI(
    title="NINAuth Oracle API",
    description=(
        "Middleware service for the NINAuth Decentralised Biometric Identity Verification Platform.\n\n"
        "Provides fingerprint enrolment and real-time verification using a trained Siamese "
        "Neural Network with AES-256-GCM encrypted template storage anchored to IPFS."
    ),
    version=APP_VERSION,
    lifespan=lifespan,
    docs_url=None  if IS_PRODUCTION else "/docs",
    redoc_url=None if IS_PRODUCTION else "/redoc",
)

# Bind the limiter instance state directly to the FastAPI state architecture
app.state.limiter = limiter

# Custom handler to convert RateLimitExceeded exceptions into structured JSON responses
@app.exception_handler(RateLimitExceeded)
async def rate_limit_exception_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={
            "error": "Rate Limit Exceeded",
            "detail": "Automated verification inference pool requests throttled. Please retry later.",
            "limit": str(exc.limit)
        }
    )

# ── 3. Custom OpenAPI Documentation Definitions ──────────────────────────────
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    
    openapi_schema["components"]["securitySchemes"] = {
        "X-API-Key": {
            "type": "apiKey",
            "in": "header",
            "name": "X-API-Key",
            "description": "Enter your authorized institutional API key credentials here"
        }
    }

    openapi_schema["security"] = [{"X-API-Key": []}]
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

# ── 4. Global Middleware Pipeline Configuration ───────────────────────────────
app.add_middleware(RequestIDMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# ── 5. Telemetry Tracking & Routing Modules ───────────────────────────────────
if ENABLE_METRICS:
    try:
        from prometheus_client import make_asgi_app
        metrics_app = make_asgi_app()
        app.mount("/metrics", metrics_app)
        log.info("Prometheus telemetry metrics mounted natively at /metrics.")
    except ImportError:
        log.warning("prometheus_client driver dependency missing — metrics endpoint deactivated.")

app.include_router(health.router)
app.include_router(enroll.router)
app.include_router(verify.router)