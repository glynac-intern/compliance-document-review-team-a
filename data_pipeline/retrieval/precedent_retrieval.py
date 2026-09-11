"""
Retrieves the most similar past decided documents (precedents) for a
given document embedding -- matching the same pgvector-based approach
already used for rule retrieval (TA-52), not a manual Python loop.
"""
import uuid

from sqlalchemy.orm import Session

from models import PrecedentIndex


def retrieve_similar_precedents(
    db: Session,
    document_embedding: list[float],
    exclude_document_ids: list[uuid.UUID],
    top_k: int = 3,
) -> list[PrecedentIndex]:
    """
    exclude_document_ids should include every document in the CURRENT
    submission's own thread -- not just its own exact id -- so a
    document is never shown an earlier revision of itself as if it
    were independent precedent.
    """
    query = db.query(PrecedentIndex)
    if exclude_document_ids:
        query = query.filter(PrecedentIndex.document_id.notin_(exclude_document_ids))

    return (
        query
        .order_by(PrecedentIndex.embedding.cosine_distance(document_embedding))
        .limit(top_k)
        .all()
    )
