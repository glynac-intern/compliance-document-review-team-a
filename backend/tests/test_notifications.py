"""
Tests for TA-29: a decision creates a notification for the submitting
advisor, listable newest-first with unread state, markable as read,
and never visible to anyone but the recipient.
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
    return resp.json()["id"]


def test_decision_creates_notification_for_advisor(client, advisor_token, officer_token):
    doc_id = _submit(client, advisor_token)

    resp = client.get("/notifications", headers={"Authorization": f"Bearer {advisor_token}"})
    assert resp.json() == []

    client.post(
        f"/review/documents/{doc_id}/decision",
        headers={"Authorization": f"Bearer {officer_token}"},
        json={"status": "needs_revision", "comment": "Missing disclosure."},
    )

    resp = client.get("/notifications", headers={"Authorization": f"Bearer {advisor_token}"})
    assert resp.status_code == 200
    notifications = resp.json()
    assert len(notifications) == 1
    assert notifications[0]["document_id"] == doc_id
    assert notifications[0]["is_read"] is False
    assert "needs revision" in notifications[0]["message"].lower()


def test_notifications_listed_newest_first(client, advisor_token, officer_token):
    doc_1 = _submit(client, advisor_token)
    doc_2 = _submit(client, advisor_token)

    client.post(
        f"/review/documents/{doc_1}/decision",
        headers={"Authorization": f"Bearer {officer_token}"},
        json={"status": "approved", "comment": "First."},
    )
    client.post(
        f"/review/documents/{doc_2}/decision",
        headers={"Authorization": f"Bearer {officer_token}"},
        json={"status": "approved", "comment": "Second."},
    )

    resp = client.get("/notifications", headers={"Authorization": f"Bearer {advisor_token}"})
    notifications = resp.json()
    assert len(notifications) == 2
    # newest first -- the second decision's notification should come first
    assert notifications[0]["document_id"] == doc_2
    assert notifications[1]["document_id"] == doc_1


def test_can_mark_notification_read(client, advisor_token, officer_token):
    doc_id = _submit(client, advisor_token)
    client.post(
        f"/review/documents/{doc_id}/decision",
        headers={"Authorization": f"Bearer {officer_token}"},
        json={"status": "approved", "comment": "Looks good."},
    )
    notif_id = client.get("/notifications", headers={"Authorization": f"Bearer {advisor_token}"}).json()[0][
        "id"
    ]

    resp = client.post(
        f"/notifications/{notif_id}/read",
        headers={"Authorization": f"Bearer {advisor_token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["is_read"] is True

    count_resp = client.get(
        "/notifications/unread-count", headers={"Authorization": f"Bearer {advisor_token}"}
    )
    assert count_resp.json()["unread_count"] == 0


def test_other_user_cannot_mark_someone_elses_notification_read(client, advisor_token, officer_token):
    doc_id = _submit(client, advisor_token)
    client.post(
        f"/review/documents/{doc_id}/decision",
        headers={"Authorization": f"Bearer {officer_token}"},
        json={"status": "approved", "comment": "Looks good."},
    )
    notif_id = client.get("/notifications", headers={"Authorization": f"Bearer {advisor_token}"}).json()[0][
        "id"
    ]

    resp = client.post(
        f"/notifications/{notif_id}/read",
        headers={"Authorization": f"Bearer {officer_token}"},
    )
    assert resp.status_code == 403


def test_advisor_never_sees_another_advisors_notifications(client, advisor_token, officer_token):
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
            "email": "ta29-other@rolefixture.io",
            "password": "testpass123",
            "role": "advisor",
        },
    )
    assert other_signup.status_code == 201
    other_login = client.post(
        "/auth/login",
        json={
            "email": "ta29-other@rolefixture.io",
            "password": "testpass123",
        },
    )
    other_token = other_login.json()["access_token"]

    resp = client.get("/notifications", headers={"Authorization": f"Bearer {other_token}"})
    assert resp.status_code == 200
    assert resp.json() == []
