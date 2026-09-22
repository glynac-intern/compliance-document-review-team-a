"""
Tests for TA-108: the masking pipeline's guarantee -- "only masked text
is ever embedded or stored" (ai/compliance/precedent_indexer.py's own
docstring) -- covers the extracted DOCUMENT text, but not the officer's
free-typed decision `comment`. That comment is stored RAW in
PrecedentIndex.comment and then served to a DIFFERENT advisor's
AI-assist panel as part of a "similar precedent" (backend/documents/
router.py's _compute_precedents_for_document excludes only the current
submission's own thread, not other documents belonging to the same
advisor). If an officer's comment happens to name a client, a
completely different advisor sees that name attached to their own,
unrelated submission.

Reuses the same mocking pattern as test_precedent_indexing.py (TA-49):
a real DOCX so extract_text has something genuine to parse, embed_text
mocked so no live API call is needed.

Test comments below use "contact <Name>" phrasing deliberately, not an
arbitrary "client <Name>" -- masker.py's own KNOWN_LIMITATIONS section
documents that a bare name with no title (Mr./Ms./Dr.) or contact verb
(reach/contact/call) nearby is NOT masked. That's a separate, already
-tracked masker-coverage gap, not something this ticket's fix (running
the comment through the masker at all) is meant to close. Keeping the
test aligned with what mask_pii is documented to catch is what proves
THIS fix specifically, without conflating it with that other gap.
"""

import pytest

pytestmark = pytest.mark.integration

import io
from unittest.mock import patch

from docx import Document as DocxDocument

from ai.compliance.precedent_indexer import index_document_as_precedent
from models import AIAnalysis, AnalysisStatus, Document, DocumentChunk, PrecedentIndex, Review

FAKE_EMBEDDING = [0.3] * 768


def _real_docx_bytes(text: str) -> bytes:
    doc = DocxDocument()
    doc.add_paragraph(text)
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


def _submit_docx(client, advisor_token, text="This is a real test document with no PII."):
    resp = client.post(
        "/documents",
        headers={"Authorization": f"Bearer {advisor_token}"},
        files={
            "file": (
                "test.docx",
                _real_docx_bytes(text),
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


def test_precedent_comment_containing_pii_is_masked_before_storage(client, db_session, advisor_token):
    doc_id = _submit_docx(client, advisor_token)
    document = db_session.query(Document).filter(Document.id == doc_id).first()

    review = Review(
        document_id=doc_id,
        officer_id=document.advisor_id,
        status="needs_revision",
        comment="Please contact Maria Gonzalez at maria.gonzalez@example.com before revising the risk disclosure.",
    )
    db_session.add(review)
    db_session.commit()

    with patch("ai.compliance.precedent_indexer.embed_text", return_value=FAKE_EMBEDDING):
        index_document_as_precedent(db_session, document)

    entry = db_session.query(PrecedentIndex).filter(PrecedentIndex.document_id == doc_id).first()
    assert entry is not None
    assert "Maria Gonzalez" not in entry.comment
    assert "maria.gonzalez@example.com" not in entry.comment
    # Masking must neutralize the PII, not just discard the comment.
    assert "[EMAIL_1]" in entry.comment or "[NAME_1]" in entry.comment


def test_advisor_never_sees_another_advisors_client_pii_via_precedent_comment(
    client,
    db_session,
    advisor_token,
    second_advisor_token,
):
    # Advisor A's document gets decided with a comment naming their client.
    doc_a = _submit_docx(client, advisor_token, "Advisor A's document.")
    document_a = db_session.query(Document).filter(Document.id == doc_a).first()
    review = Review(
        document_id=doc_a,
        officer_id=document_a.advisor_id,
        status="approved",
        comment="Please contact Maria Gonzalez at 555-123-4567 to confirm.",
    )
    db_session.add(review)
    db_session.commit()
    with patch("ai.compliance.precedent_indexer.embed_text", return_value=FAKE_EMBEDDING):
        index_document_as_precedent(db_session, document_a)

    # Advisor B (a different advisor entirely) submits an unrelated
    # document that will retrieve A's decision as its top precedent --
    # give it a matching chunk embedding, same trick as
    # test_similar_precedents.py.
    doc_b = _submit_docx(client, second_advisor_token, "Advisor B's unrelated document.")
    db_session.add(
        DocumentChunk(
            document_id=doc_b,
            chunk_index=0,
            masked_text="Test chunk.",
            embedding=FAKE_EMBEDDING,
        )
    )
    analysis_b = db_session.query(AIAnalysis).filter(AIAnalysis.document_id == doc_b).first()
    analysis_b.status = AnalysisStatus.succeeded
    analysis_b.summary = "Test summary."
    db_session.commit()

    resp = client.get(
        f"/documents/{doc_b}/analysis",
        headers={"Authorization": f"Bearer {second_advisor_token}"},
    )
    assert resp.status_code == 200
    precedents = resp.json()["precedents"]
    assert len(precedents) == 1
    leaked_comment = precedents[0]["comment"]
    assert "Maria Gonzalez" not in leaked_comment
    assert "555-123-4567" not in leaked_comment


def test_precedent_comment_without_pii_is_unaffected(client, db_session, advisor_token):
    doc_id = _submit_docx(client, advisor_token)
    document = db_session.query(Document).filter(Document.id == doc_id).first()

    review = Review(
        document_id=doc_id, officer_id=document.advisor_id, status="approved", comment="Looks compliant."
    )
    db_session.add(review)
    db_session.commit()

    with patch("ai.compliance.precedent_indexer.embed_text", return_value=FAKE_EMBEDDING):
        index_document_as_precedent(db_session, document)

    entry = db_session.query(PrecedentIndex).filter(PrecedentIndex.document_id == doc_id).first()
    assert entry.comment == "Looks compliant."
