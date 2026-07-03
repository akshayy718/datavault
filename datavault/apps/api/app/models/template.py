"""
Template model.

Created before shares (FK dependency). Soft-deletable (improvement #1):
a deleted template may still be referenced by historical shares, so we
keep it recoverable rather than hard-deleting and orphaning those shares.

Versioning rule (enforced in the service layer, not the database):
editing a template in use never UPDATEs layout_spec -- it INSERTs a new
row with version = parent.version + 1 and parent_template_id set.
"""
from sqlalchemy import String, Integer, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import BaseEntity, SoftDeleteMixin, new_uuid


class Template(Base, BaseEntity, SoftDeleteMixin):
    __tablename__ = "templates"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    workspace_id: Mapped[str] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    layout_spec: Mapped[dict] = mapped_column(JSON, nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    parent_template_id: Mapped[str | None] = mapped_column(ForeignKey("templates.id"), nullable=True)
