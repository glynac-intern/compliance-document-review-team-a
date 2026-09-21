"""
Tests for TA-50: a submission returns its three most similar decided
documents as precedents, each with decision and comment. The document
being reviewed is never its own precedent. An empty index degrades to
an empty list, not an error.
"""
import pytest

pytestmark = pytest.mark.integration

import uuid


from models import Document, DocumentChunk, PrecedentIndex, User, AIAnalysis, AnalysisStatus

FAKE_PDF = ("test.pdf", b"%PDF-1.4 minimal fake content", "application/pdf")


def _submit_with_chunks(client, db_session, advisor_token, embedding):
    """Submits a document, directly inserts a DocumentChunk for it, and
    marks its analysis as already succeeded -- bypasses the real
    pipeline entirely (no live API call needed), while still giving the
    document an embedding for precedent matching to work against."""
    resp = client.post(
        "/documents",
        headers={"Authorization": f"Bearer {advisor_token}"},
        files={"file": FAKE_PDF},
    )
    doc_id = resp.json()["id"]

    db_session.add(DocumentChunk(
        document_id=doc_id, chunk_index=0, masked_text="Test chunk.", embedding=embedding,
    ))

    analysis = db_session.query(AIAnalysis).filter(AIAnalysis.document_id == doc_id).first()
    analysis.status = AnalysisStatus.succeeded
    analysis.summary = "Test summary."

    db_session.commit()
    return doc_id


def test_empty_index_returns_empty_list_not_error(client, db_session, advisor_token):
    """No PrecedentIndex rows exist at all in a fresh test DB -- must
    degrade gracefully, not error."""
    doc_id = _submit_with_chunks(client, db_session, advisor_token, [0.5] * 768)

    resp = client.get(
        f"/documents/{doc_id}/analysis",
        headers={"Authorization": f"Bearer {advisor_token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["precedents"] == []


def test_returns_up_to_three_most_similar_precedents(client, db_session, advisor_token):
    # Need a real User row to satisfy Document.advisor_id's FK.
    seed_advisor = db_session.query(User).filter(User.email == "advisor@rolefixture.io").first()

    for i in range(5):
        other_doc = Document(
            advisor_id=seed_advisor.id,
            status="approved",
            file_reference="/tmp/fake",
            type="pdf",
            thread_id=uuid.uuid4(),
        )
        db_session.add(other_doc)
        db_session.flush()
        db_session.add(PrecedentIndex(
            document_id=other_doc.id,
            masked_text=f"Precedent text {i}",
            decision="approved" if i % 2 == 0 else "needs_revision",
            comment=f"Comment {i}",
            embedding=[0.5] * 768,  # identical vector -- all equally "similar"
        ))
    db_session.commit()

    doc_id = _submit_with_chunks(client, db_session, advisor_token, [0.5] * 768)

    resp = client.get(
        f"/documents/{doc_id}/analysis",
        headers={"Authorization": f"Bearer {advisor_token}"},
    )
    precedents = resp.json()["precedents"]
    assert len(precedents) == 3  # capped at 3, even though 5 candidates exist
    for p in precedents:
        assert p["decision"] in ("approved", "needs_revision")
        assert p["comment"] is not None
        assert p["masked_text"] is not None


def test_document_is_never_its_own_precedent(client, db_session, advisor_token):
    doc_id = _submit_with_chunks(client, db_session, advisor_token, [0.5] * 768)

    # Manually give THIS document a precedent entry too, simulating it
    # having already been decided once before.
    db_session.add(PrecedentIndex(
        document_id=doc_id,
        masked_text="Self text.",
        decision="approved",
        comment="Self comment.",
        embedding=[0.5] * 768,
    ))
    db_session.commit()

    resp = client.get(
        f"/documents/{doc_id}/analysis",
        headers={"Authorization": f"Bearer {advisor_token}"},
    )
    precedents = resp.json()["precedents"]
    assert all(p["document_id"] != doc_id for p in precedents)
