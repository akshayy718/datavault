"""
Append-only tables: ViewEvent, AuditLog, ErrorLog.

All three are write-once, read-many -- the audit trail, the analytics
source-of-truth, and the debugging trail. Application code never UPDATEs
or DELETEs rows here in normal operation. They intentionally do NOT use
BaseEntity/SoftDeleteMixin: an append-only log has no updated_at and is
never soft-deleted.
"""
from sqlalchemy import String, ForeignKey, JSON, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import new_uuid, utcnow


class ViewEvent(Base):
    __tablename__ = "view_events"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    share_id: Mapped[str] = mapped_column(ForeignKey("shares.id", ondelete="CASCADE"), nullable=False)
    viewed_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    device_type: Mapped[str | None] = mapped_column(String, nullable=True)
    country: Mapped[str | None] = mapped_column(String, nullable=True)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    actor_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    actor_api_key_id: Mapped[str | None] = mapped_column(String, nullable=True)
    action: Mapped[str] = mapped_column(String, nullable=False)
    entity_type: Mapped[str] = mapped_column(String, nullable=False)
    entity_id: Mapped[str] = mapped_column(String, nullable=False)
    metadata_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)


class ErrorLog(Base):
    __tablename__ = "error_logs"
    __table_args__ = ()

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    source: Mapped[str] = mapped_column(String, nullable=False)
    message: Mapped[str] = mapped_column(String, nullable=False)
    stack_trace: Mapped[str | None] = mapped_column(String, nullable=True)
    context: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    request_id: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
