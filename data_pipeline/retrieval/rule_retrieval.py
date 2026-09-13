"""
Given an embedded chunk, retrieves the top-k candidate rules (by cosine
distance) for the LLM to check the chunk against. Retrieval finds
candidates; the LLM makes the final judgment on whether any are actually
violated -- so this deliberately doesn't apply a hard distance cutoff,
matching the brief's "retrieve first, then check" approach.
"""

from sqlalchemy.orm import Session

from models import Rule


def retrieve_candidate_rules(
    db: Session,
    chunk_embedding: list[float],
    rule_types: tuple[str, ...] = ("prohibited_claim", "performance_standard"),
    top_k: int = 3,
) -> list[Rule]:
    return (
        db.query(Rule)
        .filter(Rule.type.in_(rule_types))
        .filter(Rule.is_active == True)
        .order_by(Rule.embedding.cosine_distance(chunk_embedding))
        .limit(top_k)
        .all()
    )
