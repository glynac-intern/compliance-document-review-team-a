"""
Tests for TA-21: an advisor can read the decision, comment, and timestamp
on their own document's reviews, but not another advisor's.
"""

import pytest

pytestmark = pytest.mark.integration

FAKE_PDF = ("test.pdf", b"%PDF-1.4 minimal fake content", "application/pdf")


def test_advisor_can_read_decision_and_comment_on_own_document(client, advisor_token, officer_token):
    doc_id = _submit(client, advisor_token)

    decision_resp = client.post(
        f"/review/documents/{doc_id}/decision",
        headers={"Authorization": f"Bearer {officer_token}"},
        json={"status": "needs_revision", "comment": "Missing required disclosure."},
    )
    assert decision_resp.status_code == 201

    reviews_resp = client.get(
        f"/documents/{doc_id}/reviews",
        headers={"Authorization": f"Bearer {advisor_token}"},
    )
    assert reviews_resp.status_code == 200
    reviews = reviews_resp.json()
    assert len(reviews) == 1
    assert reviews[0]["status"] == "needs_revision"
    assert reviews[0]["comment"] == "Missing required disclosure."
    assert "decided_at" in reviews[0]


def test_other_advisor_cannot_read_someone_elses_decision(client, advisor_token, officer_token):
    doc_id = _submit(client, advisor_token)
    client.post(
        f"/review/documents/{doc_id}/decision",
        headers={"Authorization": f"Bearer {officer_token}"},
        json={"status": "approved", "comment": "Looks good."},
    )

    other_signup = client.post(
        "/auth/signup",
        json={
            "name": "Other Advisor",
            "email": "other-advisor@rolefixture.io",
            "password": "testpass123",
            "role": "advisor",
        },
    )
    assert other_signup.status_code == 201
    other_login = client.post(
        "/auth/login",
        json={
            "email": "other-advisor@rolefixture.io",
            "password": "testpass123",
        },
    )
    other_token = other_login.json()["access_token"]

    resp = client.get(
        f"/documents/{doc_id}/reviews",
        headers={"Authorization": f"Bearer {other_token}"},
    )
    assert resp.status_code == 403


def _submit(client, advisor_token):
    resp = client.post(
        "/documents",
        headers={"Authorization": f"Bearer {advisor_token}"},
        files={"file": FAKE_PDF},
    )
    return resp.json()["id"]
