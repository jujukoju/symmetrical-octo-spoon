# Chapter 2 — Environment Setup & Repository Structure

## 2.2 Mono-Repo Structure

```
final_system/
├── ml-backend/          # Siamese model, preprocessing, training (PyTorch)
├── oracle-api/          # FastAPI microservice (enroll/verify/health)
├── blockchain/          # Solidity contracts — Phase 6 (placeholder)
├── frontend/            # React / Next.js portal — Phase 7 (placeholder)
├── docs/                # This documentation
├── check_env.py         # Sanity checker
├── .env.example         # Environment template
├── Makefile             # Dev workflow shortcuts
├── .gitignore
└── README.md
```

## 2.3 Local Environment Validation

Run `python check_env.py` from `final_system/`. It checks:

| Check | Critical? | Notes |
|-------|----------|-------|
| Python ≥ 3.10 | ✅ Yes | Uses `match` statements and `str | None` unions |
| GPU / CUDA available | ⚠ Optional | CPU training is supported but slow |
| Node.js ≥ 18 | ⚠ Optional | Needed only for Phase 7 frontend |
| `.env` file present | ✅ Yes | Copy `.env.example` → `.env` |
| `AES_MASTER_KEY` set & valid | ✅ Yes | 64-char hex; run `make gen-key` |
| `best_siamese.pth` exists | ⚠ Optional | Required for API; run `make train` first |

### Generating a master key
```bash
make gen-key          # prints AES_MASTER_KEY=...
# or manually:
python -c "from cryptography.hazmat.primitives.ciphers.aead import AESGCM; print(AESGCM.generate_key(256).hex())"
```

Append the output to your `.env` file.
