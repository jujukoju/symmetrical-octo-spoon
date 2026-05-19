# NINAuth — Naming Conventions

Consistent naming keeps the mono-repo navigable. Follow these conventions
across all languages and layers.

---

## Directory & File Names

| Scope | Convention | Example |
|-------|-----------|---------|
| Python packages | `snake_case` | `oracle-api/`, `ml-backend/` |
| Python modules | `snake_case.py` | `pair_generator.py`, `inference_pool.py` |
| Python classes | `PascalCase` | `FingerprintSiamese`, `BiometricEncryptor` |
| Python functions | `snake_case` | `extract_roi()`, `validate_nin()` |
| Python constants | `UPPER_SNAKE_CASE` | `EMBEDDING_DIM`, `VERIFY_THRESHOLD` |
| Solidity contracts | `PascalCase.sol` | `NINRegistry.sol`, `AccessControl.sol` |
| Solidity functions | `camelCase` | `enrollIdentity()`, `verifyHash()` |
| React components | `PascalCase.tsx` | `EnrollForm.tsx`, `VerifyDashboard.tsx` |
| React hooks | `useXxx.ts` | `useNINAuth.ts`, `useWallet.ts` |
| CSS/styles | `kebab-case` | `enroll-form.module.css` |
| Env variables | `UPPER_SNAKE_CASE` | `AES_MASTER_KEY`, `DATABASE_URL` |
| Docker services | `kebab-case` | `oracle-api`, `ml-backend` |

---

## API Endpoints

| Pattern | Rule | Example |
|---------|------|---------|
| Resource paths | `/v{n}/noun` | `/v1/enroll`, `/v1/verify` |
| Health check | `/health` (no version prefix) | `/health` |
| Metrics | `/metrics` | `/metrics` |
| HTTP methods | POST for mutations, GET for reads | — |
| Response fields | `snake_case` JSON keys | `request_id`, `encrypted_embedding` |

---

## Database

| Object | Convention | Example |
|--------|-----------|---------|
| Tables | `snake_case` plural | `enrollments`, `audit_logs` |
| Columns | `snake_case` | `subject_id`, `enrollment_count` |
| Primary key | `id` (UUID string) | `id VARCHAR(36)` |
| Foreign keys | `{table_singular}_id` | `enrollment_id` |
| Timestamps | `created_at`, `updated_at` | — |
| Boolean flags | `is_` or `has_` prefix | `is_active`, `has_biometric` |

---

## ML Artefacts

| Artefact | Convention | Example |
|----------|-----------|---------|
| Model weights | `best_{model_name}.pth` | `best_siamese.pth` |
| Metadata CSV | `metadata.csv` in `data/metadata/` | — |
| Processed images | `{original_stem}.png` in `data/processed_png/` | `100__M_Left_index_finger.png` |
| Reports | `{metric}_{curve}.png` | `roc_curve.png`, `det_curve.png` |
| Training config | `training_config.json` alongside weights | — |

---

## Branch & Commit Conventions (Git)

| Item | Convention | Example |
|------|-----------|---------|
| Feature branches | `feature/{short-description}` | `feature/enroll-endpoint` |
| Bugfix branches | `fix/{short-description}` | `fix/nin-validation` |
| Commit prefix | `feat:`, `fix:`, `docs:`, `test:`, `chore:` | `feat: add /v1/verify endpoint` |
