"""add recipient_sessions, saved_cards, view_events.device_token

Revision ID: 0006
Revises: 0005
Create Date: 2026-06-30

Module 10: Recipient Session Layer (recently-viewed + saved cards, no
login). Same false-positive index-drop pattern as every prior migration;
only real changes applied.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0006"
down_revision: Union[str, None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "recipient_sessions",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("device_token", sa.String(), nullable=False),
        sa.Column("last_active", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("device_token"),
    )
    op.create_table(
        "saved_cards",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("recipient_session_id", sa.String(), nullable=False),
        sa.Column("share_id", sa.String(), nullable=False),
        sa.Column("saved_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["recipient_session_id"], ["recipient_sessions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["share_id"], ["shares.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("recipient_session_id", "share_id", name="uq_saved_card"),
    )
    op.add_column("view_events", sa.Column("device_token", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("view_events", "device_token")
    op.drop_table("saved_cards")
    op.drop_table("recipient_sessions")
