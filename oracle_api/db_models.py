from datetime import datetime, timezone
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text

from database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Enrollment(Base):
    __tablename__ = "enrollments"

    id: Mapped[str]  = mapped_column(String(36), primary_key=True)
    nin: Mapped[str] = mapped_column(String(11), unique=True, nullable=False, index=True)

    encrypted_embedding: Mapped[str | None] = mapped_column(Text, nullable=True)

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
    __tablename__ = "audit_logs"

    id: Mapped[str]         = mapped_column(String(36), primary_key=True)
    request_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    nin: Mapped[str]        = mapped_column(String(11), nullable=False, index=True)
    action: Mapped[str]     = mapped_column(String(16), nullable=False)   # enroll | verify

    decision: Mapped[str | None]   = mapped_column(String(16), nullable=True)  # MATCH | NO_MATCH
    distance: Mapped[float | None] = mapped_column(Float, nullable=True)

    ip_address: Mapped[str | None]   = mapped_column(String(45), nullable=True)
    success: Mapped[bool]            = mapped_column(Boolean, nullable=False, default=False)
    error_detail: Mapped[str | None] = mapped_column(String(256), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )

    def __repr__(self) -> str:
        return f"<AuditLog nin={self.nin} action={self.action} success={self.success}>"
