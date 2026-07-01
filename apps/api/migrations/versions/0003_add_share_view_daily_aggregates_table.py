"""add share_view_daily_aggregates table

Revision ID: 0003
Revises: 0002
Create Date: 2026-06-30

Adds the daily rollup table for analytics (Module 4). See
app/models/analytics.py for the full reasoning.

Note: same false-positive issue as migration 0002 -- autogenerate
proposed dropping every hand-added performance index from earlier
migrations, because those indexes were created via op.create_index()
directly rather than declared as Index() objects on the SQLAlchemy
models, so Alembic's model-vs-database diff doesn't recognize them as
intentional. They are left untouched here; only the real change (the
new table) is applied.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "share_view_daily_aggregates",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("share_id", sa.String(), nullable=False),
        sa.Column("day", sa.Date(), nullable=False),
        sa.Column("view_count", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["share_id"], ["shares.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("share_id", "day", name="uq_share_view_daily"),
    )
    op.create_index("idx_share_view_daily_share", "share_view_daily_aggregates", ["share_id"])


def downgrade() -> None:
    op.drop_index("idx_share_view_daily_share", table_name="share_view_daily_aggregates")
    op.drop_table("share_view_daily_aggregates")
