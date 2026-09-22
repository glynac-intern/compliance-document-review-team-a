"""
Tests for TA-119: Settings > Notifications' "In-app notifications"
toggle saved to localStorage and animated in the Settings page, but
nothing server-side ever read it -- notifications kept firing
regardless of the toggle.

Adds a real per-user in_app_notifications_enabled column (migration
c3d4e5f6a7b8), exposed/settable via GET/PATCH /auth/me (extending
TA-117's endpoint), and checked at both places a Notification row gets
created: the review-decision notification to the advisor
(reviews/router.py) and the reminder notification to each officer
(documents/router.py's /documents/{id}/reminder).

"Email notifications" is deliberately NOT covered here -- there is no
email-sending code anywhere in this backend (grepped for smtp/
sendgrid/send_email/mailer, no matches), so there is nothing to gate.
See the ticket for that toggle's disposition.
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
            "name": "Second Officer",
            "email": email,
            "password": "testpass123",
            "role": role,
        },
    )
    assert signup.status_code == 201
    login = client.post("/auth/login", json={"email": email, "password": "testpass123"})
    return login.json()["access_token"]


def _set_in_app_notifications(client, token, enabled):
    resp = client.patch(
        "/auth/me",
        headers={"Authorization": f"Bearer {token}"},
        json={"in_app_notifications_enabled": enabled},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


def test_new_user_defaults_to_notifications_enabled(client, advisor_token):
    me = client.get("/auth/me", headers={"Authorization": f"Bearer {advisor_token}"}).json()
    assert me["in_app_notifications_enabled"] is True


def test_patch_me_updates_notification_preference(client, advisor_token):
    updated = _set_in_app_notifications(client, advisor_token, False)
    assert updated["in_app_notifications_enabled"] is False

    me = client.get("/auth/me", headers={"Authorization": f"Bearer {advisor_token}"}).json()
    assert me["in_app_notifications_enabled"] is False


def test_advisor_who_opted_out_gets_no_decision_notification(client, advisor_token, officer_token):
    doc_id = _submit(client, advisor_token)
    _set_in_app_notifications(client, advisor_token, False)

    resp = client.post(
        f"/review/documents/{doc_id}/decision",
        headers={"Authorization": f"Bearer {officer_token}"},
        json={"status": "approved", "comment": "Fine."},
    )
    assert resp.status_code == 201, resp.text

    notifications = client.get(
        "/notifications",
        headers={"Authorization": f"Bearer {advisor_token}"},
    ).json()
    assert not any(n["document_id"] == doc_id for n in notifications)


def test_advisor_who_stays_opted_in_still_gets_decision_notification(client, advisor_token, officer_token):
    doc_id = _submit(client, advisor_token)

    resp = client.post(
        f"/review/documents/{doc_id}/decision",
        headers={"Authorization": f"Bearer {officer_token}"},
        json={"status": "approved", "comment": "Fine."},
    )
    assert resp.status_code == 201, resp.text

    notifications = client.get(
        "/notifications",
        headers={"Authorization": f"Bearer {advisor_token}"},
    ).json()
    assert any(n["document_id"] == doc_id for n in notifications)


def test_officer_who_opted_out_gets_no_reminder_notification_but_others_still_do(
    client, advisor_token, officer_token
):
    doc_id = _submit(client, advisor_token)
    second_officer_token = _signup(client, "ta119-second-officer@rolefixture.io", "officer")
    _set_in_app_notifications(client, officer_token, False)

    resp = client.post(
        f"/documents/{doc_id}/reminder",
        headers={"Authorization": f"Bearer {advisor_token}"},
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["detail"] == "Reminder sent to 1 officer(s)."

    opted_out_notifications = client.get(
        "/notifications",
        headers={"Authorization": f"Bearer {officer_token}"},
    ).json()
    assert not any(n["document_id"] == doc_id for n in opted_out_notifications)

    still_opted_in_notifications = client.get(
        "/notifications",
        headers={"Authorization": f"Bearer {second_officer_token}"},
    ).json()
    assert any(n["document_id"] == doc_id for n in still_opted_in_notifications)
