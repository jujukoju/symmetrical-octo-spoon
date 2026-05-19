# NINAuth — Makefile
# Usage: make <target>
# Assumes you are in the final_system/ root directory.
# On Windows, install 'make' via: winget install GnuWin32.Make
#   or run the commands inside each recipe manually.

.PHONY: sanity train eval api test lint help

# ── Environment check ─────────────────────────────────────────────────────────
sanity:
	python check_env.py

# ── ML backend ───────────────────────────────────────────────────────────────
split:
	cd ml-backend && python data/split.py

preprocess:
	cd ml-backend && python scripts/run_pipeline.py

train:
	cd ml-backend && python train.py

eval:
	cd ml-backend && python evaluate.py

# ── Oracle API ────────────────────────────────────────────────────────────────
api:
	cd oracle-api && uvicorn main:app --reload --port 8001

# ── Tests ─────────────────────────────────────────────────────────────────────
test:
	cd oracle-api && pytest tests/ -v --tb=short

# ── Linting ───────────────────────────────────────────────────────────────────
lint:
	cd oracle-api && ruff check .
	cd ml-backend && ruff check .

# ── Key generation helper ─────────────────────────────────────────────────────
gen-key:
	@python -c "from cryptography.hazmat.primitives.ciphers.aead import AESGCM; print('AES_MASTER_KEY=' + AESGCM.generate_key(256).hex())"

# ── Help ──────────────────────────────────────────────────────────────────────
help:
	@echo "Available targets:"
	@echo "  sanity      Run environment sanity checks"
	@echo "  split       Build subject-wise dataset split + metadata.csv"
	@echo "  preprocess  Preprocess raw SOCOFing images → processed_png/"
	@echo "  train       Train the Siamese model"
	@echo "  eval        Evaluate model on test split (ROC/DET/EER)"
	@echo "  api         Start the FastAPI oracle-api on port 8001"
	@echo "  test        Run pytest integration tests"
	@echo "  lint        Run ruff linter on oracle-api + ml-backend"
	@echo "  gen-key     Generate a fresh AES_MASTER_KEY"
