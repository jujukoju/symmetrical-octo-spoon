"""
oracle_api/metrics.py
----------------------
Prometheus counters and histograms for the NINAuth Oracle API.

Metrics exposed at GET /metrics (mounted by main.py when ENABLE_METRICS=true).
"""

from prometheus_client import Counter, Histogram

# ── Enrolment ──────────────────────────────────────────────────────────────────
enroll_success = Counter(
    "ninauth_enroll_success_total",
    "Total successful enrolment requests.",
)

enroll_error = Counter(
    "ninauth_enroll_error_total",
    "Total failed enrolment requests.",
    ["reason"],   # reason label: validation_error | db_error | crypto_error
)

# ── Verification ───────────────────────────────────────────────────────────────
verification_decision = Counter(
    "ninauth_verification_decision_total",
    "Verification decisions by outcome.",
    ["decision"],  # MATCH | NO_MATCH
)

verification_error = Counter(
    "ninauth_verification_error_total",
    "Total failed verification requests.",
    ["reason"],
)

verification_latency = Histogram(
    "ninauth_verification_latency_seconds",
    "End-to-end verification latency.",
    buckets=[0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0],
)
