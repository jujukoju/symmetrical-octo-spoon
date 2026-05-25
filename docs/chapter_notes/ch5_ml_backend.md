# Chapter 5 — ML Backend & Embedding Encryption

## 5.1 Embedding Generation

`EmbeddingExtractor` (`ml-backend/embedding.py`) wraps the trained Siamese backbone:

```python
from embedding import EmbeddingExtractor

extractor = EmbeddingExtractor(model_path="models/best_siamese.pth")
embedding = extractor.get_embedding("path/to/fingerprint.png")
# embedding.shape → (128,), dtype float32, L2-normalised
```

- Accepts file path **or** a pre-loaded numpy array.
- Runs preprocessing internally if given a file path.
- Thread-safe (read-only model weights after load).

## 5.2 AES-256-GCM Encryption

### Key Management (Prototype)

| Approach | Description |
|----------|------------|
| **Single master key** (current) | One `AES_MASTER_KEY` env variable per deployment. All embeddings encrypted with the same key. Simple, fast. |
| **Per-user keys** (Phase 2+) | Derive a unique key per NIN using HKDF. Limits blast radius of key compromise. |

```python
from crypto import BiometricEncryptor

enc  = BiometricEncryptor()                    # reads AES_MASTER_KEY from env
blob = enc.encrypt_vector(embedding)           # → base64 string (~300 chars)
vec  = enc.decrypt_vector(blob)                # → float32 ndarray (128,)
```

### Security Properties
- **AESGCM** provides authenticated encryption — any tampering is detected.
- **12-byte random nonce** is generated fresh for every `encrypt_vector()` call.
- Nonce is prepended to the ciphertext in the base64 payload; no nonce reuse.

## 5.3 FastAPI Microservice

### Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | None | Liveness + readiness probe |
| `/v1/enroll` | POST | X-API-Key | Enrol a fingerprint — stores encrypted embedding in DB |
| `/v1/verify` | POST | X-API-Key | Verify live fingerprint against stored template |
| `/metrics` | GET | None | Prometheus metrics (if ENABLE_METRICS=true) |

### Running the API
```bash
cd oracle_api/
pip install -r requirements.txt
uvicorn main:app --reload --port 8001

# Swagger UI: http://localhost:8001/docs
```

### Environment Variables (oracle-api)

| Variable | Required | Description |
|----------|----------|-------------|
| `AES_MASTER_KEY` | ✅ | 64-char hex AES-256 key |
| `DATABASE_URL` | ✅ | SQLite (dev) or PostgreSQL URI |
| `MODEL_PATH` | ✅ | Path to `best_siamese.pth` |
| `VERIFY_THRESHOLD` | ✅ | Cosine distance threshold (from EER) |
| `API_KEY_HASH_1` | Optional | SHA-256 hash of API key (skipped in dev) |
| `ALLOWED_ORIGINS` | Optional | CORS origins (default: localhost:3000) |
| `ENABLE_METRICS` | Optional | Expose /metrics endpoint (default: true) |

## 5.4 Integration Tests

```bash
cd oracle_api/
pytest tests/ -v --tb=short
```

Tests use:
- SQLite in-memory DB (no Postgres needed)
- A fresh AES key per session
- A synthetic 128×128 BMP image (no real dataset needed)

| Test Module | Coverage |
|------------|---------|
| `test_health.py` | Status codes, schema, DB check, request ID |
| `test_enroll.py` | Happy path, re-enrol, NIN validation, image validation |
| `test_verify.py` | Schema, distance sanity, 404 unregistered, 422 invalid input |
