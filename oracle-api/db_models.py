"""
oracle-api/db_models.py
------------------------
SQLAlchemy ORM models for the NINAuth Oracle API.

Tables:
  enrollments — one row per enrolled NIN (encrypted embedding stored inline)
  audit_logs  — append-only log of every enrol/verify request
"""

from datetime import datetime, timezone
from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Enrollment(Base):
    """One record per enrolled NIN.

    The encrypted_embedding column stores the AES-256-GCM encrypted
    128-D embedding as a base64 string (output of BiometricEncryptor.encrypt_vector).
    """
    __tablename__ = "enrollments"

    id: Mapped[str]  = mapped_column(String(36), primary_key=True)
    nin: Mapped[str] = mapped_column(String(11), unique=True, nullable=False, index=True)

    # AES-256-GCM encrypted embedding (base64 string, ~300 chars)
    encrypted_embedding: Mapped[str | None] = mapped_column(Text, nullable=True)

    # How many times this NIN has been enrolled/updated
    enrollment_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )

    def __repr__(self) -> str:
        return f"<Enrollment nin={self.nin} count={self.enrollment_count}>"


class AuditLog(Base):
    """Append-only audit trail for every enrol/verify request."""
    __tablename__ = "audit_logs"

    id: Mapped[str]         = mapped_column(String(36), primary_key=True)
    request_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    nin: Mapped[str]        = mapped_column(String(11), nullable=False, index=True)
    action: Mapped[str]     = mapped_column(String(16), nullable=False)   # enroll | verify

    # Verification-specific
    decision: Mapped[str | None]   = mapped_column(String(16), nullable=True)  # MATCH | NO_MATCH
    distance: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Request metadata
    ip_address: Mapped[str | None]   = mapped_column(String(45), nullable=True)
    success: Mapped[bool]            = mapped_column(Boolean, nullable=False, default=False)
    error_detail: Mapped[str | None] = mapped_column(String(256), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )

    def __repr__(self) -> str:
        return f"<AuditLog nin={self.nin} action={self.action} success={self.success}>"
