"""
Tests for TA-32: the PII placeholder-to-original mapping must be
persisted server-side per document, never appear in any API response,
and be replaced (not duplicated) when analysis is re-run.

Inserts a cached analysis + mapping directly into the test DB, matching
the pattern used for TA-40's flag test -- this checks the persistence
and response-shape guarantees without needing a real LLM call.
"""
import pytest

pytestmark = pytest.mark.integration

from models import AIAnalysis, PIIMapping, AnalysisStatus

FAKE_PDF = ("test.pdf", b"%PDF-1.4 minimal fake content", "application/pdf")


def test_mapping_persisted_and_never_in_response(client, db_session, advisor_token):
    submit = client.post(
        "/documents",
        headers={"Authorization": f"Bearer {advisor_token}"},
        files={"file": FAKE_PDF},
    )
    doc_id = submit.json()["id"]

    # submit_document already created a not_started AIAnalysis row --
    # reuse it rather than inserting a second one (uq_ai_analysis_document
    # would reject a duplicate).
    analysis = db_session.query(AIAnalysis).filter(AIAnalysis.document_id == doc_id).first()
    analysis.status = AnalysisStatus.succeeded
    analysis.summary = "Test summary."
    db_session.flush()

    db_session.add(PIIMapping(
        document_id=doc_id,
        placeholder="[CLIENT_1]",
        original_value="Jane Smith",
    ))
    db_session.commit()

    # Row genuinely exists in the DB
    rows = db_session.query(PIIMapping).filter(PIIMapping.document_id == doc_id).all()
    assert len(rows) == 1
    assert rows[0].original_value == "Jane Smith"

    # But never appears in the API response, in any form
    resp = client.get(
        f"/documents/{doc_id}/analysis",
        headers={"Authorization": f"Bearer {advisor_token}"},
    )
    assert resp.status_code == 200
    body_text = resp.text
    assert "Jane Smith" not in body_text
    assert "mapping" not in body_text.lower()
    assert "pii_mapping" not in body_text.lower()
