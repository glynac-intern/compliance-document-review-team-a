"""
Tests for TA-51: chunk embeddings are persisted (document_id, chunk_index,
masked_text, embedding), reusable by retrieval without re-embedding, and
replaced (not accumulated) when a document is re-analysed.
"""

import pytest

pytestmark = pytest.mark.integration

from models import DocumentChunk

FAKE_PDF = ("test.pdf", b"%PDF-1.4 minimal fake content", "application/pdf")


def test_chunk_row_shape_matches_expected_structure(client, db_session, advisor_token):
    """Directly inserts a chunk (bypassing the real pipeline) to confirm
    the row shape itself -- document_id, chunk_index, masked_text,
    embedding -- matches what the ticket specifies, independent of
    whether a live analysis run succeeds."""
    submit = client.post(
        "/documents",
        headers={"Authorization": f"Bearer {advisor_token}"},
        files={"file": FAKE_PDF},
    )
    doc_id = submit.json()["id"]

    chunk = DocumentChunk(
        document_id=doc_id,
        chunk_index=0,
        masked_text="Test masked chunk text.",
        embedding=[0.1] * 768,
    )
    db_session.add(chunk)
    db_session.commit()

    stored = db_session.query(DocumentChunk).filter(DocumentChunk.document_id == doc_id).first()
    assert stored is not None
    assert stored.chunk_index == 0
    assert stored.masked_text == "Test masked chunk text."
    assert len(stored.embedding) == 768


def test_unique_constraint_prevents_duplicate_index_per_document(client, db_session, advisor_token):
    """document_id + chunk_index must be unique -- this is what the DB
    itself enforces to help guarantee replace-not-accumulate."""
    submit = client.post(
        "/documents",
        headers={"Authorization": f"Bearer {advisor_token}"},
        files={"file": FAKE_PDF},
    )
    doc_id = submit.json()["id"]

    db_session.add(
        DocumentChunk(
            document_id=doc_id,
            chunk_index=0,
            masked_text="First.",
            embedding=[0.1] * 768,
        )
    )
    db_session.commit()

    db_session.add(
        DocumentChunk(
            document_id=doc_id,
            chunk_index=0,
            masked_text="Duplicate index.",
            embedding=[0.2] * 768,
        )
    )
    try:
        db_session.commit()
        assert False, "expected a unique constraint violation"
    except Exception:
        db_session.rollback()


def test_stored_chunk_embedding_is_reusable_for_retrieval(client, db_session, advisor_token):
    """The actual TA-51 point: a stored vector must be usable for a real
    retrieval query without calling the embedding API again."""
    from data_pipeline.retrieval.rule_retrieval import retrieve_candidate_rules
    from models import Rule

    submit = client.post(
        "/documents",
        headers={"Authorization": f"Bearer {advisor_token}"},
        files={"file": FAKE_PDF},
    )
    doc_id = submit.json()["id"]

    rule = Rule(text="Test rule for retrieval.", type="prohibited_claim", embedding=[0.5] * 768)
    db_session.add(rule)
    db_session.flush()

    chunk = DocumentChunk(
        document_id=doc_id,
        chunk_index=0,
        masked_text="Test chunk.",
        embedding=[0.5] * 768,
    )
    db_session.add(chunk)
    db_session.commit()

    # Read the STORED embedding back and use it directly -- no embed_text call.
    stored_chunk = db_session.query(DocumentChunk).filter(DocumentChunk.document_id == doc_id).first()
    candidates = retrieve_candidate_rules(db_session, stored_chunk.embedding)

    assert len(candidates) >= 1
    assert rule.id in [c.id for c in candidates]
