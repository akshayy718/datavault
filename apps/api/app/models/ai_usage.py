"""
AIUsageLog -- append-only record of every AI call, for cost visibility.

MVP simplification, stated plainly: the Database Design doc's original
schema ties this to organization_id (correct for the eventual multi-tenant
BYOK/quota system in PRD Phase 7). This MVP version tracks by user_id
instead, consistent with the "one user = one org = one workspace"
simplification used everywhere else in this codebase so far (see
auth_service.py's _create_default_workspace_for). Moving to org-level
tracking later is a column rename plus a join, not a redesign -- the same
"defer until it's real" discipline used throughout this project.

Why append-only, never updated: per the PRD's explicit risk entry,
under-reporting AI usage is a release-blocking bug, not a rounding error.
An append-only log that's summed on read can always be recomputed from
raw history; a single mutable "current usage" counter has no way to
self-correct if it ever drifts from reality.
"""
from sqlalchemy import ForeignKey, Integer, Numeric, String, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import new_uuid, utcnow


class AIUsageLog(Base):
    __tablename__ = "ai_usage_logs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    feature: Mapped[str] = mapped_column(String, nullable=False)  # 'nl_query' | 'anomaly_detection'
    key_mode: Mapped[str] = mapped_column(String, nullable=False, default="platform")  # 'platform' | 'byok'
    tokens_used: Mapped[int] = mapped_column(Integer, nullable=False)
    estimated_cost: Mapped[float] = mapped_column(Numeric(10, 6), nullable=False)
    succeeded: Mapped[bool] = mapped_column(nullable=False, default=True)
    created_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
