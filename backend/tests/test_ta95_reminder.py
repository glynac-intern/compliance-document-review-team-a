"""
Tests for TA-95: an advisor can send a reminder about a document still
sitting in pending_review. The brief fixes "any officer can act on any
document; there is no per-officer routing" -- there's no single officer
to notify, so a reminder must reach every officer, not one.
"""

import pytest

pytestmark = pytest.mark.integration

FAKE_PDF = ("test.pdf", b"%PDF-1.4 minimal fake content", "application/pdf")


def _submit(client, advisor_token):
    resp = client.post(
        "/documents",
        headers={"Authorization": f"Bearer {advisor_token}"},
        files={"file": FAKE_PDF},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


def _signup(client, email, role):
    signup = client.post(
        "/auth/signup",
        json={
            "name": "Second Officer" if role == "officer" else "Second User",
            "email": email,
            "password": "testpass123",
            "role": role,
        },
    )
    assert signup.status_code == 201
    login = client.post("/auth/login", json={"email": email, "password": "testpass123"})
    return login.json()["access_token"]


def test_advisor_can_send_reminder_and_officer_gets_notified(client, advisor_token, officer_token):
    doc_id = _submit(client, advisor_token)

    resp = client.post(
        f"/documents/{doc_id}/reminder",
        headers={"Authorization": f"Bearer {advisor_token}"},
    )
    assert resp.status_code == 201, resp.text

    notifications = client.get(
        "/notifications",
        headers={"Authorization": f"Bearer {officer_token}"},
    ).json()
    assert any(n["document_id"] == doc_id for n in notifications)


def test_reminder_reaches_every_officer_not_just_one(client, advisor_token, officer_token):
    doc_id = _submit(client, advisor_token)
    second_officer_token = _signup(client, "ta95-second-officer@rolefixture.io", "officer")

    resp = client.post(
        f"/documents/{doc_id}/reminder",
        headers={"Authorization": f"Bearer {advisor_token}"},
    )
    assert resp.status_code == 201

    for token in (officer_token, second_officer_token):
        notifications = client.get(
            "/notifications",
            headers={"Authorization": f"Bearer {token}"},
        ).json()
        assert any(n["document_id"] == doc_id for n in notifications)


def test_reminder_records_a_reminder_sent_audit_event(client, advisor_token, officer_token):
    doc_id = _submit(client, advisor_token)
    assert (
        client.post(
            f"/documents/{doc_id}/reminder",
            headers={"Authorization": f"Bearer {advisor_token}"},
        ).status_code
        == 201
    )

    audit = client.get(
        f"/documents/{doc_id}/audit",
        headers={"Authorization": f"Bearer {advisor_token}"},
    ).json()
    reminder_events = [e for e in audit if e["action"] == "reminder_sent"]
    assert len(reminder_events) == 1


def test_reminder_rejected_on_a_document_not_pending_review(client, advisor_token, officer_token):
    doc_id = _submit(client, advisor_token)
    assert (
        client.post(
            f"/review/documents/{doc_id}/decision",
            headers={"Authorization": f"Bearer {officer_token}"},
            json={"status": "approved", "comment": "Fine."},
        ).status_code
        == 201
    )

    resp = client.post(
        f"/documents/{doc_id}/reminder",
        headers={"Authorization": f"Bearer {advisor_token}"},
    )
    assert resp.status_code == 400


def test_reminder_rate_limited_to_once_per_day(client, advisor_token, officer_token):
    doc_id = _submit(client, advisor_token)

    first = client.post(
        f"/documents/{doc_id}/reminder",
        headers={"Authorization": f"Bearer {advisor_token}"},
    )
    assert first.status_code == 201

    second = client.post(
        f"/documents/{doc_id}/reminder",
        headers={"Authorization": f"Bearer {advisor_token}"},
    )
    assert second.status_code == 429

    # only the first reminder's audit event and notification exist --
    # the rejected second attempt wrote nothing
    audit = client.get(
        f"/documents/{doc_id}/audit",
        headers={"Authorization": f"Bearer {advisor_token}"},
    ).json()
    assert len([e for e in audit if e["action"] == "reminder_sent"]) == 1
