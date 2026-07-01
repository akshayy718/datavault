"""
RecipientSession / SavedCard -- Module 10, login-free recipient
convenience features. device_token is a random value the client
generates/stores itself (e.g. localStorage), never tied to a user
account -- matching the PRD's "optional login" requirement: this works
fully anonymously, login is explicitly skipped per scope.
"""
from sqlalchemy import ForeignKey, String, UniqueConstraint, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import new_uuid, utcnow


class RecipientSession(Base):
    __tablename__ = "recipient_sessions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    device_token: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    last_active: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    created_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)


class SavedCard(Base):
    __tablename__ = "saved_cards"
    __table_args__ = (UniqueConstraint("recipient_session_id", "share_id", name="uq_saved_card"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    recipient_session_id: Mapped[str] = mapped_column(
        ForeignKey("recipient_sessions.id", ondelete="CASCADE"), nullable=False
    )
    share_id: Mapped[str] = mapped_column(ForeignKey("shares.id", ondelete="CASCADE"), nullable=False)
    saved_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
