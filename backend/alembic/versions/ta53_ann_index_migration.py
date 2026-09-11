"""add HNSW ANN index to rules.embedding and precedent_index.embedding

Revision ID: ta53_ann_index
Revises: d74f6a286d02
Create Date: 2026-09-11 22:00:00.000000

Index type: HNSW, chosen over IVFFlat.

Justification (TA-53):
- IVFFlat requires a `lists` parameter tuned to row count, and its
  clustering quality depends on having a meaningful amount of data
  already present at build time -- awkward for a corpus this small
  (30 rules, ~100 precedents) that's still actively growing.
- HNSW needs no such tuning, builds incrementally as rows are added,
  and gives better recall/speed at small-to-moderate scale -- exactly
  where this project sits. It's pgvector's own recommended default
  unless specifically optimizing build time/memory for very large
  collections, which doesn't apply here.

Operator class: vector_cosine_ops, matching the ONLY distance operator
actually used at query time in this codebase -- both rule_retrieval.py
and precedent_retrieval.py exclusively call .cosine_distance(). A
mismatched opclass would mean the index silently never gets used by
the query planner, even though it exists.
"""
from typing import Sequence, Union

from alembic import op


revision: str = 'ta53_ann_index'
down_revision: Union[str, None] = 'd74f6a286d02'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "CREATE INDEX ix_rules_embedding_hnsw_cosine "
        "ON rules USING hnsw (embedding vector_cosine_ops)"
    )
    op.execute(
        "CREATE INDEX ix_precedent_index_embedding_hnsw_cosine "
        "ON precedent_index USING hnsw (embedding vector_cosine_ops)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_rules_embedding_hnsw_cosine")
    op.execute("DROP INDEX IF EXISTS ix_precedent_index_embedding_hnsw_cosine")
