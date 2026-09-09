"""add analysis status and error message

Revision ID: efb7cc15507d
Revises: 1cdbe98ea76f
Create Date: 2026-09-09 15:08:56.201029

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'efb7cc15507d'
down_revision: Union[str, None] = '1cdbe98ea76f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

analysis_status_enum = postgresql.ENUM(
    'not_started', 'in_progress', 'succeeded', 'failed',
    name='analysisstatus',
)


def upgrade() -> None:
    # Explicitly create the enum type first -- an inline sa.Enum() inside
    # add_column() does NOT auto-issue CREATE TYPE the way a full
    # metadata.create_all() would.
    analysis_status_enum.create(op.get_bind(), checkfirst=True)

    op.add_column('ai_analysis', sa.Column('status', analysis_status_enum, nullable=False, server_default='succeeded'))
    op.add_column('ai_analysis', sa.Column('error_message', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('ai_analysis', 'error_message')
    op.drop_column('ai_analysis', 'status')
    analysis_status_enum.drop(op.get_bind(), checkfirst=True)
