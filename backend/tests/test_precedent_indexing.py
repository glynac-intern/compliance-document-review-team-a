"""
Tests for TA-49: recording a decision indexes the document's MASKED
text with its decision and comment. Re-deciding or revising replaces
the thread's existing precedent entry rather than duplicating it.

Mocks the embedding call (ai.compliance.precedent_indexer.embed_text) rather than
making a real API call -- keeps these tests fast and runnable in CI
with only a dummy LLM_API_KEY, consistent with how the rest of this
suite avoids live API dependencies wherever the logic itself (not the
AI output) is what's under test.
"""

import pytest

pytestmark = pytest.mark.integration

from unittest.mock import patch


from models import Document, Review, PrecedentIndex

FAKE_EMBEDDING = [0.1] * 768


def _real_docx_bytes() -> bytes:
    """A genuinely valid, parseable DOCX -- unlike a bare '%PDF-...'
    byte string, this actually works with real extraction, which
    index_document_as_precedent calls for real (only the embedding
    call is mocked in these tests)."""
    import io
    from docx import Document as DocxDocument

    doc = DocxDocument()
    doc.add_paragraph("This is a real test document with no PII.")
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


def _submit(client, advisor_token):
    resp = client.post(
        "/documents",
        headers={"Authorization": f"Bearer {advisor_token}"},
        files={
            "file": (
                "test.docx",
                _real_docx_bytes(),
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
    )
    return resp.json()["id"]


def test_indexing_stores_masked_text_with_decision_and_comment(client, db_session, advisor_token):
    doc_id = _submit(client, advisor_token)
    document = db_session.query(Document).filter(Document.id == doc_id).first()

    review = Review(document_id=doc_id, officer_id=document.advisor_id, status="approved", comment="Fine.")
    db_session.add(review)
    db_session.commit()

    with patch("ai.compliance.precedent_indexer.embed_text", return_value=FAKE_EMBEDDING):
        from ai.compliance.precedent_indexer import index_document_as_precedent

        index_document_as_precedent(db_session, document)

    entry = db_session.query(PrecedentIndex).filter(PrecedentIndex.document_id == doc_id).first()
    assert entry is not None
    assert entry.decision == "approved"
    assert entry.comment == "Fine."
    assert entry.masked_text is not None
    assert entry.embedding is not None


def test_redeciding_replaces_not_duplicates(client, db_session, advisor_token):
    doc_id = _submit(client, advisor_token)
    document = db_session.query(Document).filter(Document.id == doc_id).first()

    with patch("ai.compliance.precedent_indexer.embed_text", return_value=FAKE_EMBEDDING):
        from ai.compliance.precedent_indexer import index_document_as_precedent

        review1 = Review(
            document_id=doc_id, officer_id=document.advisor_id, status="needs_revision", comment="Fix this."
        )
        db_session.add(review1)
        db_session.commit()
        index_document_as_precedent(db_session, document)

        review2 = Review(
            document_id=doc_id, officer_id=document.advisor_id, status="approved", comment="Now fine."
        )
        db_session.add(review2)
        db_session.commit()
        index_document_as_precedent(db_session, document)

    entries = db_session.query(PrecedentIndex).filter(PrecedentIndex.document_id == doc_id).all()
    assert len(entries) == 1
    assert entries[0].comment == "Now fine."


def test_no_precedent_entry_without_a_decision(client, db_session, advisor_token):
    doc_id = _submit(client, advisor_token)
    document = db_session.query(Document).filter(Document.id == doc_id).first()

    with patch("ai.compliance.precedent_indexer.embed_text", return_value=FAKE_EMBEDDING):
        from ai.compliance.precedent_indexer import index_document_as_precedent

        index_document_as_precedent(db_session, document)

    entry = db_session.query(PrecedentIndex).filter(PrecedentIndex.document_id == doc_id).first()
    assert entry is None
