"""add ai_usage_logs table

Revision ID: 0004
Revises: 0003
Create Date: 2026-06-30

Adds cost-tracking storage for Module 5 (AI Copilot). See
app/models/ai_usage.py for the full reasoning, including the documented
MVP simplification (user_id-based tracking rather than organization_id,
consistent with the one-user-one-org pattern used throughout this build).

Note: same false-positive issue as migrations 0002 and 0003 -- autogenerate
proposed dropping every hand-added performance index again, for the same
reason (those indexes aren't declared as Index() objects on the models).
Left untouched here; only the real change (the new table) is applied.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ai_usage_logs",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("feature", sa.String(), nullable=False),
        sa.Column("tokens_used", sa.Integer(), nullable=False),
        sa.Column("estimated_cost", sa.Numeric(10, 6), nullable=False),
        sa.Column("succeeded", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_ai_usage_user", "ai_usage_logs", ["user_id"])


def downgrade() -> None:
    op.drop_index("idx_ai_usage_user", table_name="ai_usage_logs")
    op.drop_table("ai_usage_logs")
