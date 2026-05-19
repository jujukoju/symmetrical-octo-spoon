# NINAuth — Decentralised Biometric Identity Verification

A privacy-preserving, decentralised identity platform combining:
- **Siamese Neural Network** fingerprint verification (128-D cosine embeddings)
- **AES-256-GCM** encrypted biometric templates
- **FastAPI** microservice for enrolment and real-time verification
- **Blockchain** on-chain identity registry (Phase 6)

---

## Mono-Repo Structure

```
final_system/
├── ml-backend/          # Siamese model, preprocessing, training, evaluation
│   ├── config.py        # Central configuration (paths, hyperparameters)
│   ├── preprocessing/   # ROI extraction, Gabor filtering, normalisation
│   ├── models/          # FingerprintSiamese architecture
│   ├── data/            # Pair generator, dataset splits, metadata
│   ├── train.py         # Training loop with early stopping
│   ├── evaluate.py      # ROC/DET/EER evaluation
│   └── embedding.py     # EmbeddingExtractor wrapper
│
├── oracle-api/          # FastAPI ML microservice
│   ├── main.py          # App entrypoint
│   ├── routes/          # /enroll  /verify  /health
│   ├── crypto.py        # AES-256-GCM BiometricEncryptor
│   ├── database.py      # SQLAlchemy async (SQLite / PostgreSQL)
│   └── tests/           # pytest integration test suite
│
├── blockchain/          # Solidity contracts + Hardhat (Phase 6)
├── frontend/            # Next.js citizen + verifier portal (Phase 7)
│
├── docs/                # Architecture diagrams, chapter notes
├── check_env.py         # Environment sanity checker
├── .env.example         # Template — copy to .env and fill values
├── Makefile             # One-command dev workflows
└── .gitignore
```

---

## Quick Start

### 1. Clone & configure
```bash
git clone <repo>
cd final_system/
cp .env.example .env
# Edit .env — set AES_MASTER_KEY, MODEL_PATH, etc.
```

### 2. Check your environment
```bash
python check_env.py
```

### 3. Install ML backend dependencies
```bash
cd ml-backend/
pip install -r requirements.txt
```

### 4. Preprocess dataset (requires SOCOFing at ml-backend/data/SOCOFing/)
```bash
cd ml-backend/
python scripts/run_pipeline.py
```

### 5. Train the Siamese model
```bash
cd ml-backend/
python train.py
```

### 6. Evaluate the model
```bash
cd ml-backend/
python evaluate.py
```

### 7. Run the API
```bash
cd oracle-api/
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
# Swagger docs → http://localhost:8001/docs
```

### 8. Run integration tests
```bash
cd oracle-api/
pytest tests/ -v
```

---

## Makefile shortcuts
```bash
make sanity   # run check_env.py
make train    # cd ml-backend && python train.py
make eval     # cd ml-backend && python evaluate.py
make api      # cd oracle-api && uvicorn main:app --reload --port 8001
make test     # cd oracle-api && pytest tests/ -v
```

---

## Naming Conventions

See [`docs/naming_conventions.md`](docs/naming_conventions.md).

---

## Dataset

Uses the [SOCOFing dataset](https://www.kaggle.com/datasets/ruizgara/socofing):
- Place at: `ml-backend/data/SOCOFing/Real/` and `ml-backend/data/SOCOFing/Altered/`

---

## License

MIT — see LICENSE.
