"""
oracle_api/inference_pool.py
-----------------------------
Thread-pool executor for running synchronous PyTorch inference
inside FastAPI's async event loop without blocking it.

PyTorch's forward pass is CPU/GPU bound and not async-compatible.
Wrapping it in asyncio.get_event_loop().run_in_executor() offloads
it to a dedicated thread pool so other requests are not stalled.
"""

import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Callable

from config import INFERENCE_WORKERS

log = logging.getLogger("oracle_api.inference_pool")

_pool: ThreadPoolExecutor | None = None


def get_pool() -> ThreadPoolExecutor:
    global _pool
    if _pool is None:
        _pool = ThreadPoolExecutor(
            max_workers=INFERENCE_WORKERS,
            thread_name_prefix="ninauth-infer",
        )
        log.info("Inference thread pool started (workers=%d).", INFERENCE_WORKERS)
    return _pool


async def run_in_thread(fn: Callable, *args: Any) -> Any:
    """Run a synchronous callable in the inference thread pool.

    Args:
        fn:    Synchronous callable (e.g. extractor.get_embedding).
        *args: Positional arguments forwarded to fn.

    Returns:
        Whatever fn(*args) returns.
    """
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(get_pool(), fn, *args)


def shutdown_pool() -> None:
    """Gracefully shut down the thread pool on app shutdown."""
    global _pool
    if _pool is not None:
        _pool.shutdown(wait=True)
        log.info("Inference thread pool shut down.")
        _pool = None
