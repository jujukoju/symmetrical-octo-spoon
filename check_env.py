"""
check_env.py
------------
Environment sanity checker for the NINAuth system.

Checks:
  1. Python version >= 3.10
  2. GPU availability (via torch if installed)
  3. Node.js version >= 18
  4. .env file exists in current directory
  5. AES_MASTER_KEY is set and has the correct length (64 hex chars = 32 bytes)

Run from the final_system/ root:
    python check_env.py

Exit codes:
  0 — all critical checks passed
  1 — one or more critical checks failed
"""

import os
import sys
import shutil
import subprocess
from pathlib import Path

# ── ANSI colour helpers ────────────────────────────────────────────────────
GREEN  = "\033[92m"
YELLOW = "\033[93m"
RED    = "\033[91m"
BOLD   = "\033[1m"
RESET  = "\033[0m"

PASS  = f"{GREEN}✓ PASS{RESET}"
WARN  = f"{YELLOW}⚠ WARN{RESET}"
FAIL  = f"{RED}✗ FAIL{RESET}"

CRITICAL = True
OPTIONAL = False


def _row(status: str, label: str, detail: str) -> str:
    return f"  {status}  {BOLD}{label:<30}{RESET} {detail}"


results: list[tuple[bool, bool]] = []  # (passed, is_critical)


def check(label: str, passed: bool, detail: str, critical: bool = True) -> None:
    symbol = PASS if passed else (FAIL if critical else WARN)
    print(_row(symbol, label, detail))
    results.append((passed, critical))


# ─────────────────────────────────────────────────────────────────────────────

def check_python() -> None:
    v = sys.version_info
    ver_str = f"{v.major}.{v.minor}.{v.micro}"
    ok = (v.major, v.minor) >= (3, 10)
    check(
        "Python version",
        ok,
        f"{ver_str}  {'(OK — ≥ 3.10)' if ok else '(NEED ≥ 3.10)'}",
        critical=True,
    )


def check_gpu() -> None:
    try:
        import torch
        cuda = torch.cuda.is_available()
        device = torch.cuda.get_device_name(0) if cuda else "CPU only"
        check("GPU / CUDA", cuda, device, critical=False)
    except ImportError:
        check("GPU / CUDA", False, "torch not installed — skipping", critical=False)


def check_node() -> None:
    node = shutil.which("node")
    if node is None:
        check("Node.js", False, "not found in PATH", critical=False)
        return
    try:
        out = subprocess.check_output(["node", "--version"], text=True).strip()
        # out = "v20.11.0"
        major = int(out.lstrip("v").split(".")[0])
        ok = major >= 18
        check(
            "Node.js version",
            ok,
            f"{out}  {'(OK — ≥ 18)' if ok else '(NEED ≥ 18)'}",
            critical=False,
        )
    except Exception as exc:
        check("Node.js version", False, str(exc), critical=False)


def check_env_file() -> None:
    env_path = Path(".env")
    ok = env_path.is_file()
    check(
        ".env file present",
        ok,
        str(env_path.resolve()) if ok else "Run: cp .env.example .env",
        critical=True,
    )


def check_aes_key() -> None:
    # Load .env manually (avoid requiring python-dotenv at this stage)
    env_path = Path(".env")
    key = os.environ.get("AES_MASTER_KEY", "")
    if not key and env_path.is_file():
        for line in env_path.read_text().splitlines():
            if line.startswith("AES_MASTER_KEY="):
                key = line.split("=", 1)[1].strip()
                break

    if not key:
        check("AES_MASTER_KEY set", False, "Missing — run: make gen-key >> .env", critical=True)
        return

    # Must be placeholder-free and exactly 64 hex chars (32 bytes = 256 bits)
    placeholder = "0" * 64
    if key == placeholder:
        check("AES_MASTER_KEY value", False,
              "Still set to all-zeros placeholder — generate a real key", critical=True)
        return

    ok = len(key) == 64
    try:
        bytes.fromhex(key)
        valid_hex = True
    except ValueError:
        valid_hex = False

    check(
        "AES_MASTER_KEY value",
        ok and valid_hex,
        f"{'64-char hex key present' if ok and valid_hex else 'Invalid — must be 64 hex characters (256-bit)'}",
        critical=True,
    )


def check_model_file() -> None:
    # Resolve relative to this file's location
    here = Path(__file__).parent
    model_candidates = [
        here / "ml-backend" / "models" / "best_siamese.pth",
        Path(os.environ.get("MODEL_PATH", "ml-backend/models/best_siamese.pth")),
    ]
    found = any(p.is_file() for p in model_candidates)
    path_str = str(model_candidates[0])
    check(
        "Siamese model weights",
        found,
        f"{path_str} {'(found)' if found else '(not found — run: make train)'}",
        critical=False,
    )


# ─────────────────────────────────────────────────────────────────────────────

def main() -> int:
    print(f"\n{BOLD}NINAuth — Environment Sanity Check{RESET}")
    print("=" * 60)

    check_python()
    check_gpu()
    check_node()
    check_env_file()
    check_aes_key()
    check_model_file()

    print("=" * 60)

    critical_failures = sum(1 for passed, crit in results if crit and not passed)
    warnings         = sum(1 for passed, crit in results if not crit and not passed)

    if critical_failures:
        print(f"\n{RED}{BOLD}  {critical_failures} critical check(s) FAILED.{RESET}")
        print(f"  {warnings} warning(s).\n")
        return 1
    else:
        print(f"\n{GREEN}{BOLD}  All critical checks passed.{RESET}", end="")
        if warnings:
            print(f"  {YELLOW}({warnings} optional warning(s)){RESET}", end="")
        print("\n")
        return 0


if __name__ == "__main__":
    sys.exit(main())
