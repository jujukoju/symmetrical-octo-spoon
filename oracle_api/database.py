"""
oracle_api/database.py
-----------------------
Async SQLAlchemy engine and session factory.

Supports:
  - SQLite (via aiosqlite)  — default for local dev (no extra services needed)
  - PostgreSQL (via asyncpg) — for production

The active driver is selected by DATABASE_URL in .env.
"""

import logging
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from config import DATABASE_URL, DB_MAX_OVERFLOW, DB_POOL_SIZE

log = logging.getLogger("oracle_api.database")

# SQLite needs check_same_thread=False; pool settings don't apply to StaticPool
_is_sqlite = DATABASE_URL.startswith("sqlite")

_engine_kwargs: dict = {
    "echo": False,
}
if not _is_sqlite:
    _engine_kwargs["pool_size"]    = DB_POOL_SIZE
    _engine_kwargs["max_overflow"] = DB_MAX_OVERFLOW

engine = create_async_engine(DATABASE_URL, **_engine_kwargs)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Shared declarative base for all ORM models."""
    pass


async def create_all_tables() -> None:
    """Create all tables if they do not already exist (development / SQLite)."""
    from db_models import AuditLog, Enrollment  # noqa: F401 — register models

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    log.info("Database tables created/verified.")
