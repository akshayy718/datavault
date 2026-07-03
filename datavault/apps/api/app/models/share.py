"""
Share models -- the core of the whole product.

`Share` records WHAT was selected, HOW it's presented, and the
access-control rules around it. It's now soft-deletable (improvement #1)
so a removed share can be recovered/audited rather than vanishing.

`ShareSnapshot` freezes the slice a Snapshot-mode share points at.

`ShareAccessLog` (improvement #4) records every individual open of a
share with richer forensic detail than the lightweight `view_events`
analytics table: device, hashed IP, country, and user agent. Two tables
on purpose -- view_events stays small and fast for counting; access logs
carry the heavier per-open detail used for security review and the
recipient/audit features later.
"""
from sqlalchemy import String, Integer, Boolean, ForeignKey, JSON, CheckConstraint, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import BaseEntity, SoftDeleteMixin, TimestampMixin, new_uuid, utcnow


class Share(Base, BaseEntity, SoftDeleteMixin):
    __tablename__ = "shares"
    __table_args__ = (
        CheckConstraint("mode IN ('snapshot','live')", name="ck_share_mode"),
        CheckConstraint(
            "selection_type IN ('cell','row','column','range','filter')",
            name="ck_share_selection_type",
        ),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    dataset_id: Mapped[str] = mapped_column(ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False)

    # Non-guessable, used in the public recipient URL. The ONLY identifier
    # ever exposed to a recipient -- never row/dataset UUIDs.
    token: Mapped[str] = mapped_column(String, unique=True, nullable=False)

    mode: Mapped[str] = mapped_column(String, default="snapshot", nullable=False)
    selection_type: Mapped[str] = mapped_column(String, nullable=False)
    selection_spec: Mapped[dict] = mapped_column(JSON, nullable=False)

    field_mapping_id: Mapped[str] = mapped_column(ForeignKey("field_mappings.id"), nullable=False)
    template_id: Mapped[str | None] = mapped_column(ForeignKey("templates.id"), nullable=True)
    format: Mapped[str] = mapped_column(String, default="cards", nullable=False)

    pin_hash: Mapped[str | None] = mapped_column(String, nullable=True)
    expires_at: Mapped["DateTime | None"] = mapped_column(DateTime(timezone=True), nullable=True)
    max_views: Mapped[int | None] = mapped_column(Integer, nullable=True)
    view_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    qr_image_url: Mapped[str | None] = mapped_column(String, nullable=True)
    batch_id: Mapped[str | None] = mapped_column(String, nullable=True)

    snapshot: Mapped["ShareSnapshot"] = relationship(back_populates="share", uselist=False, cascade="all, delete-orphan")
    access_logs: Mapped[list["ShareAccessLog"]] = relationship(back_populates="share", cascade="all, delete-orphan")


class ShareSnapshot(Base, TimestampMixin):
    __tablename__ = "share_snapshots"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    share_id: Mapped[str] = mapped_column(
        ForeignKey("shares.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    frozen_data: Mapped[dict] = mapped_column(JSON, nullable=False)
    captured_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    share: Mapped["Share"] = relationship(back_populates="snapshot")


class ShareAccessLog(Base):
    """
    Append-only forensic record of each share open (improvement #4).
    No mixins: it only needs its own created/opened timestamp, never
    updated_at or actor tracking (the "actor" is an anonymous recipient).

    Note ip_hash, not raw IP: we store a hash so we can tell "same visitor
    again" and do coarse abuse detection without retaining personally
    identifying raw IP addresses -- consistent with the PRD's privacy stance.
    """
    __tablename__ = "share_access_logs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    share_id: Mapped[str] = mapped_column(ForeignKey("shares.id", ondelete="CASCADE"), nullable=False)
    opened_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    device: Mapped[str | None] = mapped_column(String, nullable=True)
    ip_hash: Mapped[str | None] = mapped_column(String, nullable=True)
    country: Mapped[str | None] = mapped_column(String, nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String, nullable=True)

    share: Mapped["Share"] = relationship(back_populates="access_logs")
