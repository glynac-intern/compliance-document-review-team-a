"""
Test for TA-66: the review queue includes the submitting advisor's
name, not just their raw id -- an officer needs to know who submitted
each document.
"""
import pytest

pytestmark = pytest.mark.integration

def test_queue_includes_advisor_name(client, db_session, advisor_token, officer_token):
    resp = client.post(
        "/documents",
        headers={"Authorization": f"Bearer {advisor_token}"},
        files={"file": ("test.pdf", b"%PDF-1.4 minimal fake content", "application/pdf")},
    )
    assert resp.status_code == 201

    queue_resp = client.get("/review/queue", headers={"Authorization": f"Bearer {officer_token}"})
    assert queue_resp.status_code == 200
    docs = queue_resp.json()
    assert len(docs) >= 1
    assert all("advisor_name" in d and d["advisor_name"] for d in docs)
