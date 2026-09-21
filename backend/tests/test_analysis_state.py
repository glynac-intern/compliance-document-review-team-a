"""
Tests for TA-41: analysis carries an explicit state (not_started,
in_progress, succeeded, failed) instead of a client having to infer it
from a bare 503.
"""
import pytest

pytestmark = pytest.mark.integration

from models import AIAnalysis, AnalysisStatus

FAKE_PDF = ("test.pdf", b"%PDF-1.4 minimal fake content", "application/pdf")


def test_analysis_row_created_as_not_started_on_submission(client, db_session, advisor_token):
    submit = client.post(
        "/documents",
        headers={"Authorization": f"Bearer {advisor_token}"},
        files={"file": FAKE_PDF},
    )
    doc_id = submit.json()["id"]

    analysis = db_session.query(AIAnalysis).filter(AIAnalysis.document_id == doc_id).first()
    assert analysis is not None
    assert analysis.status == AnalysisStatus.not_started
    assert analysis.error_message is None
    assert analysis.summary is None


def test_get_analysis_response_shape_for_not_yet_run_state(client, db_session, advisor_token):
    """
    Directly checks the response schema exposes status/error_message
    correctly, without depending on a real LLM call succeeding or
    failing -- inserts a not_started row and confirms the shape.
    """
    submit = client.post(
        "/documents",
        headers={"Authorization": f"Bearer {advisor_token}"},
        files={"file": FAKE_PDF},
    )
    doc_id = submit.json()["id"]

    # Force the row to in_progress directly, to test that GET reports it
    # as-is without needing a real pipeline run to reach that state.
    analysis = db_session.query(AIAnalysis).filter(AIAnalysis.document_id == doc_id).first()
    analysis.status = AnalysisStatus.in_progress
    db_session.commit()

    resp = client.get(
        f"/documents/{doc_id}/analysis",
        headers={"Authorization": f"Bearer {advisor_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "in_progress"
    assert data["summary"] is None
    assert data["flags"] == []


def test_failed_state_is_persisted_and_readable_without_retriggering(client, db_session, advisor_token):
    """
    Simulates a failed analysis directly (bypassing the real pipeline),
    then confirms GET reports the failure cleanly -- 200, not 503 -- and
    doesn't silently attempt to re-run.
    """
    submit = client.post(
        "/documents",
        headers={"Authorization": f"Bearer {advisor_token}"},
        files={"file": FAKE_PDF},
    )
    doc_id = submit.json()["id"]

    analysis = db_session.query(AIAnalysis).filter(AIAnalysis.document_id == doc_id).first()
    analysis.status = AnalysisStatus.failed
    analysis.error_message = "ValueError: simulated extraction failure"
    db_session.commit()

    resp = client.get(
        f"/documents/{doc_id}/analysis",
        headers={"Authorization": f"Bearer {advisor_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "failed"
    assert "simulated extraction failure" in data["error_message"]
