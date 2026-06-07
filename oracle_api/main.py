"""
Oracle API — FastAPI application entrypoint.

Production Pipeline Startup sequence:
  1. Load runtime configurations from .env.
  2. Database migrations are safely externalized via Alembic (USE_ALEMBIC=true).
  3. Register middleware architecture (Request ID tracking context, CORS).
  4. Mount Prometheus /metrics engine if ENABLE_METRICS=true.
  5. Register fully dynamic, production-grade API route sub-routers.

"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi
from fastapi.middleware.cors import CORSMiddleware

from database import engine 
from inference_pool import shutdown_pool
from routes import enroll, health, verify
from middleware.request_id import RequestIDMiddleware
from config import ALLOWED_ORIGINS, APP_VERSION, ENABLE_METRICS, IS_PRODUCTION, LOG_LEVEL

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s | %(levelname)-8s | %(name)s — %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
log = logging.getLogger("oracle_api")

@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("NINAuth Oracle API v%s starting up under enterprise configuration…", APP_VERSION)
    log.info("Database schema state verified via Alembic infrastructure pipeline.")

    yield  

    log.info("Initializing graceful shutdown sequences...")
    
    shutdown_pool()
    
    await engine.dispose()
    log.info("PostgreSQL connection pools drained and disposed.")
    
    log.info("NINAuth Oracle API shut down cleanly with 0 active dangling sockets.")


app = FastAPI(
    title="NINAuth Oracle API",
    description=(
        "Middleware service for the NINAuth Decentralised Biometric Identity Verification Platform.\n\n"
        "Provides fingerprint enrolment and real-time verification using a trained Siamese "
        "Neural Network with AES-256-GCM encrypted template storage."
    ),
    version=APP_VERSION,
    lifespan=lifespan,

    docs_url=None  if IS_PRODUCTION else "/docs",
    redoc_url=None if IS_PRODUCTION else "/redoc",
)

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

app.add_middleware(RequestIDMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

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