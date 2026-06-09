# ── STAGE 1: Build & Wheel Compilation ────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install only the minimal system compilation tools required for dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy your requirements configuration matrix
COPY oracle_api/requirements.txt .

# Pre-compile wheels into a cache directory to speed up layer generation
RUN pip install --no-cache-dir --upgrade pip \
    && pip wheel --no-cache-dir --no-deps --wheel-dir /app/wheels -r requirements.txt


# ── STAGE 2: High-Performance Production Runner ───────────────────────────────
FROM python:3.11-slim AS runner

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV ENV=production

# Install essential shared system libs required specifically for headless OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libgl1-mesa-glx \
    && rm -rf /var/lib/apt/lists/*

# Retrieve pre-compiled python dependency wheels directly from builder stage
COPY --from=builder /app/wheels /wheels
RUN pip install --no-cache-dir --no-index --find-links=/wheels /wheels/* \
    && rm -rf /wheels

# Copy application files into place
COPY oracle_api/ /app/oracle_api/
COPY ml-backend/ /app/ml-backend/

# Enforce strict security: Run everything as an unprivileged system user
RUN useradd -u 8888 appuser && chown -R appuser:appuser /app
USER appuser

# Set working directory context directly inside your API microservice folder
WORKDIR /app/oracle_api
EXPOSE 8001

# Execute server initialization using optimized production routing configurations
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "2", "--log-level", "info"]