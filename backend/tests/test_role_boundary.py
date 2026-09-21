"""
Integration tests for the role boundary requirement: role enforcement must
hold at the API level (not just hidden in the UI), in BOTH directions --
advisors blocked from officer actions, and officers blocked from advisor
actions.
"""

import pytest

pytestmark = pytest.mark.integration

FAKE_PDF = ("test.pdf", b"%PDF-1.4 minimal fake content", "application/pdf")


def _submit_document(client, token):
    return client.post(
        "/documents",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": FAKE_PDF},
    )


def test_advisor_can_submit_document(client, advisor_token):
    resp = _submit_document(client, advisor_token)
    assert resp.status_code == 201
    assert resp.json()["status"] == "pending_review"


def test_officer_cannot_submit_document(client, officer_token):
    resp = _submit_document(client, officer_token)
    assert resp.status_code == 403


def test_officer_can_access_review_queue(client, officer_token):
    resp = client.get("/review/queue", headers={"Authorization": f"Bearer {officer_token}"})
    assert resp.status_code == 200


def test_advisor_cannot_access_review_queue(client, advisor_token):
    resp = client.get("/review/queue", headers={"Authorization": f"Bearer {advisor_token}"})
    assert resp.status_code == 403


def test_officer_can_decide_advisor_cannot(client, advisor_token, officer_token):
    doc_id = _submit_document(client, advisor_token).json()["id"]

    resp = client.post(
        f"/review/documents/{doc_id}/decision",
        headers={"Authorization": f"Bearer {advisor_token}"},
        json={"status": "approved", "comment": "test"},
    )
    assert resp.status_code == 403

    resp = client.post(
        f"/review/documents/{doc_id}/decision",
        headers={"Authorization": f"Bearer {officer_token}"},
        json={"status": "approved", "comment": "looks good"},
    )
    assert resp.status_code == 201


def test_advisor_and_officer_can_both_view_a_document(client, advisor_token, officer_token):
    """Per the brief: any officer can act on any document, no per-officer routing."""
    doc_id = _submit_document(client, advisor_token).json()["id"]

    resp = client.get(f"/documents/{doc_id}", headers={"Authorization": f"Bearer {advisor_token}"})
    assert resp.status_code == 200

    resp = client.get(f"/documents/{doc_id}", headers={"Authorization": f"Bearer {officer_token}"})
    assert resp.status_code == 200


def test_no_token_is_rejected(client):
    resp = client.get("/documents")
    assert resp.status_code == 403


def test_invalid_token_is_rejected(client):
    resp = client.get("/documents", headers={"Authorization": "Bearer not-a-real-token"})
    assert resp.status_code == 401
