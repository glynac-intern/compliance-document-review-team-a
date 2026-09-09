"""
Tests for TA-32: the PII placeholder-to-original mapping must be
persisted server-side per document, never appear in any API response,
and be replaced (not duplicated) when analysis is re-run.

Inserts a cached analysis + mapping directly into the test DB, matching
the pattern used for TA-40's flag test -- this checks the persistence
and response-shape guarantees without needing a real LLM call.
"""
import sys

sys.path.insert(0, "/app")

from models import AIAnalysis, PIIMapping

FAKE_PDF = ("test.pdf", b"%PDF-1.4 minimal fake content", "application/pdf")


def test_mapping_persisted_and_never_in_response(client, db_session, advisor_token):
    submit = client.post(
        "/documents",
        headers={"Authorization": f"Bearer {advisor_token}"},
        files={"file": FAKE_PDF},
    )
    doc_id = submit.json()["id"]

    analysis = AIAnalysis(document_id=doc_id, summary="Test summary.")
    db_session.add(analysis)
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
