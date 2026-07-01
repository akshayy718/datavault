"""
Shared model mixins and the single, standardized UUID strategy.

Why a single mixins file instead of repeating these columns on every model:
the four audit columns (created_at, updated_at, created_by, updated_by) and
the two soft-delete columns (deleted_at, deleted_by) appear on most tables.
Defining them once as mixins means a change to how, say, timestamps work is
a one-line edit here, not a 15-file find-and-replace.

UUID strategy decision (improvement #3):
We standardize on uuid4() globally, generated in Python application code and
stored as TEXT/String. Rationale for choosing uuid4 over uuid7 here:
  - uuid7 (time-ordered UUIDs) has real benefits for index locality on
    very high-insert-rate tables, but it only landed in Python's standard
    library very recently and isn't available on all the Python versions
    this project may run on (the deployment targets and the two local
    Python installs in the dev environment).
  - For a portfolio-scale product, uuid4's index-locality cost is
    negligible, and uuid4 is universally available with zero version
    caveats -- which matters more than a micro-optimization no one here
    will ever measure.
  - The important thing your review asked for is *one* strategy used
    everywhere. That's uuid4, defined once below, imported everywhere.
If this ever became a high-write production system, switching to uuid7 would
be a one-line change in new_uuid() -- another payoff of centralizing it here.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, declared_attr


def new_uuid() -> str:
    """The one and only UUID generator used across every model."""
    return str(uuid.uuid4())


def utcnow() -> datetime:
    """Timezone-aware UTC now, used for every timestamp column."""
    return datetime.now(timezone.utc)


class TimestampMixin:
    """created_at / updated_at on everything. updated_at auto-bumps on UPDATE."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )


class ActorMixin:
    """
    created_by / updated_by -- which user caused this row to exist / change.
    Nullable because some rows are created by the system itself (e.g. the
    seed command, or an automated job) rather than a specific logged-in user.

    Declared via @declared_attr because a ForeignKey defined directly on a
    mixin would be shared (and thus break) across multiple tables; declared_attr
    makes SQLAlchemy generate a fresh column per table that uses the mixin.
    """

    @declared_attr
    def created_by(cls) -> Mapped[str | None]:
        return mapped_column(String, ForeignKey("users.id"), nullable=True)

    @declared_attr
    def updated_by(cls) -> Mapped[str | None]:
        return mapped_column(String, ForeignKey("users.id"), nullable=True)


class SoftDeleteMixin:
    """
    deleted_at / deleted_by -- for recoverable deletes + audit (improvement #1).
    A row with deleted_at IS NULL is "live"; a non-null deleted_at means
    "soft-deleted". Application queries must filter out soft-deleted rows by
    default; this is enforced in the service layer (Auth module onward),
    not by the database.
    """

    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    @declared_attr
    def deleted_by(cls) -> Mapped[str | None]:
        return mapped_column(String, ForeignKey("users.id"), nullable=True)


class BaseEntity(TimestampMixin, ActorMixin):
    """
    Convenience base for "real" entities that should carry both timestamps
    and actor tracking. Tables that are append-only logs (view_events,
    audit_logs, error_logs) deliberately do NOT use this -- they only need
    created_at, never updated_at/updated_by, because they're never updated.
    """
    pass
