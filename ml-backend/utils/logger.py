"""
utils/logger.py
---------------
Shared logger factory with optional file output and JSON formatting.
"""

import json
import logging
import sys
from pathlib import Path
from datetime import datetime, timezone


class _JsonFormatter(logging.Formatter):
    """Emit log records as single-line JSON (useful for log aggregators)."""

    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "ts":      datetime.now(timezone.utc).isoformat(),
            "level":   record.levelname,
            "logger":  record.name,
            "msg":     record.getMessage(),
        }
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        return json.dumps(payload)


def get_logger(
    name: str,
    level: int = logging.INFO,
    log_file: str = None,
    json_format: bool = False,
) -> logging.Logger:
    """
    Return a configured logger.

    Args:
        name:        Logger name (e.g. 'train', 'oracle-api.enroll').
        level:       Log level (default INFO).
        log_file:    Optional path to write logs to a file.
        json_format: If True, emit JSON-structured log lines.

    Returns:
        Configured logging.Logger instance.
    """
    logger = logging.getLogger(name)

    if logger.handlers:
        return logger   # already configured — don't add duplicate handlers

    logger.setLevel(level)

    if json_format:
        formatter = _JsonFormatter()
    else:
        formatter = logging.Formatter(
            "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )

    # Console handler
    ch = logging.StreamHandler(sys.stdout)
    ch.setFormatter(formatter)
    logger.addHandler(ch)

    # Optional file handler
    if log_file:
        Path(log_file).parent.mkdir(parents=True, exist_ok=True)
        fh = logging.FileHandler(log_file, encoding="utf-8")
        fh.setFormatter(formatter)
        logger.addHandler(fh)

    return logger