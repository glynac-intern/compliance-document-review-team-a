"""add in_app_notifications_enabled to users

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-09-21 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # TA-119: Settings > Notifications' "In-app notifications" toggle
    # persisted to localStorage only and gated nothing server-side --
    # this makes it a real, per-user preference the backend can check
    # before creating a Notification row. server_default backfills
    # existing users as opted-in (matches today's actual behavior).
    op.add_column(
        "users",
        sa.Column("in_app_notifications_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
    )


def downgrade() -> None:
    op.drop_column("users", "in_app_notifications_enabled")
