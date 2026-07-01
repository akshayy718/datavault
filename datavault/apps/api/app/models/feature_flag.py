"""
Feature flag model.

workspace_id nullable: a row with workspace_id = NULL is the global default
for a feature; a workspace-specific row overrides it.
"""
from sqlalchemy import String, Integer, Boolean, ForeignKey, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import TimestampMixin, new_uuid


class FeatureFlag(Base, TimestampMixin):
    __tablename__ = "feature_flags"
    __table_args__ = (
        UniqueConstraint("workspace_id", "feature_name", name="uq_feature_flag_scope"),
        CheckConstraint("rollout_percentage BETWEEN 0 AND 100", name="ck_rollout_percentage"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    workspace_id: Mapped[str | None] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True)
    feature_name: Mapped[str] = mapped_column(String, nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    rollout_percentage: Mapped[int] = mapped_column(Integer, default=100, nullable=False)
