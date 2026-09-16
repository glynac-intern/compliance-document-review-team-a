"""
Indexes a decided document's MASKED text as a precedent (TA-49), along
with its decision and comment. Only masked text is ever embedded or
stored -- raw text never reaches this far.

Keyed to the document's THREAD, not just the one document row: if a
document is re-decided, or a revision in the same thread gets decided
later, the thread's existing precedent entry is REPLACED, not
duplicated -- matching the same replace-not-accumulate pattern already
used for Flag/PIIMapping/DocumentChunk elsewhere in this codebase.
"""
from ai.masking.masker import mask_pii
from data_pipeline.extraction.extract import extract_text
from data_pipeline.embeddings.embed_client import embed_text

from models import Document, Review, PrecedentIndex


def index_document_as_precedent(db, document: Document) -> None:
    raw_text = extract_text(document.file_reference, document.type.value)
    # Mapping is discarded immediately -- ONLY masked_text is ever
    # embedded or stored below.
    masked_text, _mapping = mask_pii(raw_text)

    latest_review = (
        db.query(Review)
        .filter(Review.document_id == document.id)
        .order_by(Review.decided_at.desc())
        .first()
    )
    if latest_review is None:
        return  # nothing to index without an actual decision

    thread_document_ids = [
        d.id for d in db.query(Document.id).filter(Document.thread_id == document.thread_id).all()
    ]
    db.query(PrecedentIndex).filter(
        PrecedentIndex.document_id.in_(thread_document_ids)
    ).delete(synchronize_session=False)

    embedding = embed_text(masked_text)

    db.add(PrecedentIndex(
        document_id=document.id,
        masked_text=masked_text,
        decision=latest_review.status,
        comment=latest_review.comment,
        embedding=embedding,
    ))
    db.commit()
