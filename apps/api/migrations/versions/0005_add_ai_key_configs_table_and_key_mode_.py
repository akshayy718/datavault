"""add ai_key_configs table and key_mode column

Revision ID: 0005
Revises: 0004
Create Date: 2026-06-30

Adds Module 14 (AI Key Strategy / BYOK+Hybrid): the ai_key_configs table
and a key_mode column on ai_usage_logs, so usage can be attributed to
'platform' or 'byok' for cost-visibility purposes. See
app/models/ai_key_config.py and app/services/ai_key_config_service.py
for the full design reasoning.

Note: same false-positive issue as every prior migration in this project
-- autogenerate proposed dropping every hand-added performance index
again. Left untouched here; only the real changes (the new table and the
new column) are applied.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ai_key_configs",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("mode", sa.String(), nullable=False, server_default="platform"),
        sa.Column("encrypted_key", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
        sa.CheckConstraint("mode IN ('platform','byok')", name="ck_ai_key_config_mode"),
    )

    op.add_column(
        "ai_usage_logs",
        sa.Column("key_mode", sa.String(), nullable=False, server_default="platform"),
    )


def downgrade() -> None:
    op.drop_column("ai_usage_logs", "key_mode")
    op.drop_table("ai_key_configs")
