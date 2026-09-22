"""
Tests for TA-111: prove a deleted user's still-unexpired token is
rejected, not accepted or a 500.

Tokens live for 8 hours (auth/security.py:14-17, a deliberate choice
per TA-14). get_current_user (auth/dependencies.py:31-36) DOES
re-query the DB for the user on every request and 401s if the user
comes back None -- this should already cover a deleted user, but
nothing pinned it with a regression test before this.

The User model (models.py:61-71) has no disabled/inactive/is_active
column at all -- only id, role, name, email, hashed_password,
created_at. So the ticket's second acceptance criterion ("if the User
model supports a disabled state, cover that too") doesn't apply here;
documented rather than invented. Deletion is the only account-removal
path that exists.
"""

import pytest

pytestmark = pytest.mark.integration

from models import User

FAKE_PDF = ("test.pdf", b"%PDF-1.4 minimal fake content", "application/pdf")


def _signup_and_login(client, email, role="advisor"):
    signup = client.post(
        "/auth/signup",
        json={
            "name": "Soon Deleted",
            "email": email,
            "password": "testpass123",
            "role": role,
        },
    )
    assert signup.status_code == 201, signup.text
    login = client.post("/auth/login", json={"email": email, "password": "testpass123"})
    assert login.status_code == 200, login.text
    return login.json()["access_token"]


def test_deleted_users_token_is_rejected_not_500(client, db_session):
    token = _signup_and_login(client, "deleted-advisor@rolefixture.io")

    # Confirm the token works before deletion -- otherwise a 401 after
    # deletion proves nothing.
    assert client.get("/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 200

    user = db_session.query(User).filter(User.email == "deleted-advisor@rolefixture.io").first()
    db_session.delete(user)
    db_session.commit()

    resp = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 401


def test_deleted_users_token_is_rejected_on_a_role_gated_endpoint(client, db_session):
    """get_current_user is itself a dependency of require_role -- confirm
    the same rejection holds on the path that also does a role check,
    not just the role-agnostic /auth/me."""
    token = _signup_and_login(client, "deleted-officer@rolefixture.io", role="officer")
    assert client.get("/review/queue", headers={"Authorization": f"Bearer {token}"}).status_code == 200

    user = db_session.query(User).filter(User.email == "deleted-officer@rolefixture.io").first()
    db_session.delete(user)
    db_session.commit()

    resp = client.get("/review/queue", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 401
