"""add revision_notes to documents

Revision ID: a1b2c3d4e5f6
Revises: 8782f6288c13
Create Date: 2026-09-16 07:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '8782f6288c13'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('documents', sa.Column('revision_notes', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('documents', 'revision_notes')
