"""add reminder_sent audit action

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-09-16 10:00:00.000000

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Postgres has no ALTER TYPE ... ADD VALUE IF NOT EXISTS on every
    # version, but Postgres 12+ (this project runs pg16) allows adding
    # an enum value inside a transaction -- the new value just can't be
    # used in inserts/comparisons within that same transaction, which
    # this migration doesn't do.
    op.execute("ALTER TYPE auditaction ADD VALUE IF NOT EXISTS 'reminder_sent'")


def downgrade() -> None:
    # Postgres has no native DROP VALUE for an enum -- removing one
    # requires recreating the whole type and repointing every column
    # that uses it. Left as a no-op; nothing about this migration is
    # unsafe to leave in place on a downgrade.
    pass
