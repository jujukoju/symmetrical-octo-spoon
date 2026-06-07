"""
Thread-pool executor for running synchronous PyTorch inference
inside FastAPI's async event loop without blocking it.

"""

import asyncio
import logging
from typing import Any, Callable
from concurrent.futures import ThreadPoolExecutor

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
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(get_pool(), fn, *args)


def shutdown_pool() -> None:
    global _pool
    if _pool is not None:
        _pool.shutdown(wait=True)
        log.info("Inference thread pool shut down.")
        _pool = None
