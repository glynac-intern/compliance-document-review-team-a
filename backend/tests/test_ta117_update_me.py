"""
Tests for TA-117: Settings > Profile "Save" on Name/Email always failed
because no PATCH /auth/me endpoint existed -- the frontend
(settings-view.tsx -> api-client.ts's authApi.updateMe) called it, but
auth/router.py only had signup/login/logout/GET me.

These tests drive the new PATCH /auth/me endpoint: updating name,
updating email, rejecting a blank name, rejecting an email collision
with another existing user, and requiring authentication -- the same
boundary validation the rest of auth/schemas.py already applies.
"""


def test_patch_me_updates_name(client, advisor_token):
    resp = client.patch(
        "/auth/me",
        headers={"Authorization": f"Bearer {advisor_token}"},
        json={"name": "Renamed Advisor"},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["name"] == "Renamed Advisor"

    # Persisted, not just echoed back.
    me = client.get("/auth/me", headers={"Authorization": f"Bearer {advisor_token}"})
    assert me.json()["name"] == "Renamed Advisor"


def test_patch_me_updates_email(client, advisor_token):
    resp = client.patch(
        "/auth/me",
        headers={"Authorization": f"Bearer {advisor_token}"},
        json={"email": "advisor-new-address@rolefixture.io"},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["email"] == "advisor-new-address@rolefixture.io"

    me = client.get("/auth/me", headers={"Authorization": f"Bearer {advisor_token}"})
    assert me.json()["email"] == "advisor-new-address@rolefixture.io"


def test_patch_me_rejects_blank_name(client, advisor_token):
    resp = client.patch(
        "/auth/me",
        headers={"Authorization": f"Bearer {advisor_token}"},
        json={"name": "   "},
    )
    assert resp.status_code == 422, resp.text


def test_patch_me_rejects_malformed_email(client, advisor_token):
    resp = client.patch(
        "/auth/me",
        headers={"Authorization": f"Bearer {advisor_token}"},
        json={"email": "not-an-email"},
    )
    assert resp.status_code == 422, resp.text


def test_patch_me_rejects_email_already_used_by_another_user(client, advisor_token, second_advisor_token):
    resp = client.patch(
        "/auth/me",
        headers={"Authorization": f"Bearer {advisor_token}"},
        json={"email": "second-advisor@rolefixture.io"},
    )
    assert resp.status_code == 400, resp.text

    # And the advisor's own email must be unchanged after the rejection.
    me = client.get("/auth/me", headers={"Authorization": f"Bearer {advisor_token}"})
    assert me.json()["email"] == "advisor@rolefixture.io"


def test_patch_me_allows_re_saving_own_current_email(client, advisor_token):
    """Saving Settings without touching the Email field re-sends the
    user's own current email -- that must not be treated as a collision
    with themselves."""
    resp = client.patch(
        "/auth/me",
        headers={"Authorization": f"Bearer {advisor_token}"},
        json={"email": "advisor@rolefixture.io"},
    )
    assert resp.status_code == 200, resp.text


def test_patch_me_requires_authentication(client):
    resp = client.patch("/auth/me", json={"name": "Nobody"})
    assert resp.status_code in (401, 403), resp.text
