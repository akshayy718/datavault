"""
AIKeyConfig -- one row per user, recording whether their AI calls use the
platform's key or their own (Module 14: BYOK/Hybrid).

MVP simplification, consistent with ai_usage_logs and every other module
in this codebase: tracked per-user, not per-organization (the original
Database Design doc's schema is organization-scoped, correct for the
eventual multi-tenant system -- this is the same documented, deliberate
deviation used throughout).

"Hybrid" is represented here not as a third mode value, but as the
natural consequence of mode being freely switchable at any time: a user
can flip between 'platform' and 'byok' per their own judgment call about
which calls matter enough to use their own key for. A separate literal
'hybrid' enum value would add a state without adding real behavior.

encrypted_key is genuinely encrypted (see app/core/crypto.py), never
hashed -- it must be recoverable to actually call the AI provider.
"""
from sqlalchemy import CheckConstraint, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import TimestampMixin, new_uuid


class AIKeyConfig(Base, TimestampMixin):
    __tablename__ = "ai_key_configs"
    __table_args__ = (
        CheckConstraint("mode IN ('platform','byok')", name="ck_ai_key_config_mode"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    mode: Mapped[str] = mapped_column(String, default="platform", nullable=False)
    encrypted_key: Mapped[str | None] = mapped_column(String, nullable=True)
