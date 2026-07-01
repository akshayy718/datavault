"""
Identity & organization models.

Now built on the shared mixins (app/models/mixins.py): BaseEntity gives
created_at/updated_at/created_by/updated_by; SoftDeleteMixin gives
deleted_at/deleted_by where recoverability matters.
"""
from sqlalchemy import String, Integer, ForeignKey, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import BaseEntity, SoftDeleteMixin, TimestampMixin, new_uuid


class User(Base, TimestampMixin):
    # User uses TimestampMixin but NOT ActorMixin/BaseEntity: a user isn't
    # "created by" another user in this model (signup is self-service), so
    # created_by/updated_by would always be null and add no value here.
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    # Nullable: email/password users have no Google identity; Google users
    # may have no password. Populated in the Auth module.
    google_id: Mapped[str | None] = mapped_column(String, unique=True, nullable=True)

    memberships: Mapped[list["OrganizationMember"]] = relationship(back_populates="user")


class Organization(Base, BaseEntity):
    __tablename__ = "organizations"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    name: Mapped[str] = mapped_column(String, nullable=False)
    logo_url: Mapped[str | None] = mapped_column(String, nullable=True)
    brand_color: Mapped[str | None] = mapped_column(String, nullable=True)

    members: Mapped[list["OrganizationMember"]] = relationship(back_populates="organization")
    workspaces: Mapped[list["Workspace"]] = relationship(back_populates="organization")


class OrganizationMember(Base, TimestampMixin):
    __tablename__ = "organization_members"
    __table_args__ = (
        UniqueConstraint("organization_id", "user_id", name="uq_org_member"),
        CheckConstraint("role IN ('admin','owner','approver','viewer')", name="ck_org_member_role"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role: Mapped[str] = mapped_column(String, nullable=False)

    organization: Mapped["Organization"] = relationship(back_populates="members")
    user: Mapped["User"] = relationship(back_populates="memberships")


class Workspace(Base, BaseEntity, SoftDeleteMixin):
    # Soft-deletable (improvement #1): deleting a workspace shouldn't
    # irreversibly destroy every dataset/share under it without recovery.
    __tablename__ = "workspaces"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)

    organization: Mapped["Organization"] = relationship(back_populates="workspaces")
    settings: Mapped["WorkspaceSettings"] = relationship(back_populates="workspace", uselist=False)


class WorkspaceSettings(Base, TimestampMixin):
    __tablename__ = "workspace_settings"
    __table_args__ = (
        CheckConstraint("default_share_mode IN ('snapshot','live')", name="ck_default_share_mode"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    workspace_id: Mapped[str] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    default_share_mode: Mapped[str] = mapped_column(String, default="snapshot", nullable=False)
    ai_provider: Mapped[str | None] = mapped_column(String, nullable=True)
    theme: Mapped[str] = mapped_column(String, default="light", nullable=False)
    retention_days: Mapped[int | None] = mapped_column(Integer, nullable=True)

    workspace: Mapped["Workspace"] = relationship(back_populates="settings")
