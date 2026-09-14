"""
Backfills precedent_index from the 100-document seed corpus (TA-49).

PrecedentIndex.document_id has a non-nullable FK to a real documents
row, so this creates real Document rows for each seed document (under a
dedicated internal "seed corpus" advisor account) before indexing them
-- not just standalone precedent entries with no backing document.

Decision/comment are derived from the seed corpus's own ground-truth
metadata (metadata.json's injected_issues/is_clean), not invented.

Idempotent: re-running clears previously-backfilled precedent entries
(and their backing Document rows) before recreating them, rather than
duplicating.

Run inside the backend container:
    docker compose run --rm backend python data_pipeline/embeddings/backfill_precedents.py
"""
import json
import os
import sys
import uuid
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, "/app")
sys.path.insert(0, "/app/ai/masking")

from masker import mask_pii
from embed_client import embed_texts_batch
from database import SessionLocal
from models import (
    Document, DocumentType, DocumentStatus, PrecedentIndex, User, UserRole,
    AuditEvent, Review, AIAnalysis, Flag, PIIMapping, DocumentChunk, Notification,
)
from auth.security import hash_password

DOCUMENTS_DIR = Path("/app/seed/documents")
SEED_ADVISOR_EMAIL = "seed-corpus@internal.system"


def _get_or_create_seed_advisor(db) -> User:
    advisor = db.query(User).filter(User.email == SEED_ADVISOR_EMAIL).first()
    if advisor is None:
        advisor = User(
            name="Seed Corpus (internal)",
            email=SEED_ADVISOR_EMAIL,
            hashed_password=hash_password(str(uuid.uuid4())),  # never logged into
            role=UserRole.advisor,
        )
        db.add(advisor)
        db.commit()
        db.refresh(advisor)
    return advisor


def _derive_decision_and_comment(doc_meta: dict) -> tuple[str, str]:
    """Reads the real, varied decision/comment authored into metadata.json
    (TA-59) -- not a single templated string derived on the fly."""
    return doc_meta["decision"], doc_meta["officer_comment"]


def main():
    metadata = json.loads((DOCUMENTS_DIR / "metadata.json").read_text(encoding="utf-8"))
    print(f"Loaded metadata for {len(metadata)} seed documents")

    db = SessionLocal()
    try:
        seed_advisor = _get_or_create_seed_advisor(db)

        # Idempotent: clear any previously-backfilled entries and their
        # backing Document rows before recreating.
        existing_doc_ids = [
            d.id for d in db.query(Document.id).filter(Document.advisor_id == seed_advisor.id).all()
        ]
        if existing_doc_ids:
            print(f"Clearing {len(existing_doc_ids)} previously-backfilled document(s)...")
            # TA-80: found via a real clean-checkout test -- these seed
            # documents can accumulate rows in EVERY table that
            # references documents (via real usage during other
            # testing: views, analyses, flags, etc.), not just
            # PrecedentIndex. All of them must be cleared, in
            # dependency order (Flag before AIAnalysis, since Flag
            # references AIAnalysis's id, not documents.id directly),
            # or the Document delete fails on a real foreign-key
            # violation -- exactly what a naive re-seed on a
            # previously-used checkout hits.
            existing_analysis_ids = [
                a.id for a in db.query(AIAnalysis.id).filter(AIAnalysis.document_id.in_(existing_doc_ids)).all()
            ]
            if existing_analysis_ids:
                db.query(Flag).filter(Flag.analysis_id.in_(existing_analysis_ids)).delete(synchronize_session=False)
            db.query(AIAnalysis).filter(AIAnalysis.document_id.in_(existing_doc_ids)).delete(synchronize_session=False)
            db.query(Review).filter(Review.document_id.in_(existing_doc_ids)).delete(synchronize_session=False)
            db.query(AuditEvent).filter(AuditEvent.document_id.in_(existing_doc_ids)).delete(synchronize_session=False)
            db.query(PIIMapping).filter(PIIMapping.document_id.in_(existing_doc_ids)).delete(synchronize_session=False)
            db.query(DocumentChunk).filter(DocumentChunk.document_id.in_(existing_doc_ids)).delete(synchronize_session=False)
            db.query(Notification).filter(Notification.document_id.in_(existing_doc_ids)).delete(synchronize_session=False)
            db.query(PrecedentIndex).filter(PrecedentIndex.document_id.in_(existing_doc_ids)).delete(synchronize_session=False)
            # A document can reference ANOTHER document in this same
            # set via replaces_document_id -- clear that self-reference
            # before deleting, or the delete can fail on itself too.
            db.query(Document).filter(Document.id.in_(existing_doc_ids)).update(
                {Document.replaces_document_id: None}, synchronize_session=False
            )
            db.query(Document).filter(Document.id.in_(existing_doc_ids)).delete(synchronize_session=False)
            db.commit()

        masked_texts = []
        prepared = []
        for doc_meta in metadata:
            raw_text = (DOCUMENTS_DIR / doc_meta["filename"]).read_text(encoding="utf-8")
            masked_text, _mapping = mask_pii(raw_text)  # only masked_text ever stored/embedded
            decision, comment = _derive_decision_and_comment(doc_meta)
            masked_texts.append(masked_text)
            prepared.append({
                "filename": doc_meta["filename"],
                "masked_text": masked_text,
                "decision": decision,
                "comment": comment,
            })

        print(f"Embedding all {len(masked_texts)} documents in one batch call...")
        embeddings = embed_texts_batch(masked_texts)

        for item, embedding in zip(prepared, embeddings):
            doc_id = uuid.uuid4()
            document = Document(
                id=doc_id,
                advisor_id=seed_advisor.id,
                status=DocumentStatus(item["decision"]),
                file_reference=str(DOCUMENTS_DIR / item["filename"]),
                original_filename=item["filename"],
                type=DocumentType.pdf,  # placeholder -- backfill reads seed .txt directly, not via extraction
                thread_id=doc_id,
                replaces_document_id=None,
            )
            db.add(document)
            db.flush()

            db.add(PrecedentIndex(
                document_id=doc_id,
                masked_text=item["masked_text"],
                decision=item["decision"],
                comment=item["comment"],
                embedding=embedding,
            ))

        db.commit()
        final_count = db.query(PrecedentIndex).filter(
            PrecedentIndex.document_id.in_(
                db.query(Document.id).filter(Document.advisor_id == seed_advisor.id)
            )
        ).count()
        print(f"\nDone. {final_count} precedent entries backfilled from the seed corpus.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
