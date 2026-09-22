"""add seed_id and is_active to rules

Revision ID: 8782f6288c13
Revises: ta53_ann_index
Create Date: 2026-09-11 20:57:40.880524

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "8782f6288c13"
down_revision: Union[str, None] = "ta53_ann_index"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # NOTE: autogenerate incorrectly wanted to drop the HNSW indexes from
    # TA-53 -- they're created via raw op.execute() SQL, invisible to
    # SQLAlchemy's model-based comparison. Those lines removed by hand;
    # this migration touches ONLY the rules table's new columns.
    op.add_column("rules", sa.Column("seed_id", sa.String(), nullable=True))
    # server_default backfills existing rows as active -- same lesson as
    # TA-41's analysis status column: a NOT NULL column with no default
    # fails outright against rows that already exist.
    op.add_column("rules", sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.create_unique_constraint("uq_rule_seed_id", "rules", ["seed_id"])


def downgrade() -> None:
    op.drop_constraint("uq_rule_seed_id", "rules", type_="unique")
    op.drop_column("rules", "is_active")
    op.drop_column("rules", "seed_id")
