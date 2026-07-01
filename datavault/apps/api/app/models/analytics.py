"""
ShareViewDailyAggregate -- the daily rollup table from the Database
Design doc, Section 7 (Analytics Schema).

Why this exists alongside ViewEvent rather than just querying ViewEvent
directly for the dashboard: once a popular share has thousands of view
events, COUNT(*) ... GROUP BY day on the raw table on every dashboard
load gets slow and repeats the same work. This table is a small,
pre-computed summary the dashboard reads instead. ViewEvent stays the
permanent source of truth/audit trail; this table can always be rebuilt
from it if it's ever wrong.
"""
from sqlalchemy import Date, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import new_uuid


class ShareViewDailyAggregate(Base):
    __tablename__ = "share_view_daily_aggregates"
    __table_args__ = (
        UniqueConstraint("share_id", "day", name="uq_share_view_daily"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    share_id: Mapped[str] = mapped_column(ForeignKey("shares.id", ondelete="CASCADE"), nullable=False)
    day: Mapped["Date"] = mapped_column(Date, nullable=False)
    view_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
