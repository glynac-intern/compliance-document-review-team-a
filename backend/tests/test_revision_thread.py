"""
Tests for TA-22: a revision thread must be returned as one ordered
history in a single request, with each entry carrying its status,
decision, and comment.
"""

import pytest

pytestmark = pytest.mark.integration

FAKE_PDF = ("test.pdf", b"%PDF-1.4 minimal fake content", "application/pdf")


def test_thread_returns_full_ordered_history(client, advisor_token, officer_token):
    submit = client.post(
        "/documents",
        headers={"Authorization": f"Bearer {advisor_token}"},
        files={"file": FAKE_PDF},
    )
    original_id = submit.json()["id"]

    client.post(
        f"/review/documents/{original_id}/decision",
        headers={"Authorization": f"Bearer {officer_token}"},
        json={"status": "needs_revision", "comment": "Fix this."},
    )

    revision = client.post(
        f"/documents/{original_id}/revisions",
        headers={"Authorization": f"Bearer {advisor_token}"},
        files={"file": FAKE_PDF},
    )
    revision_id = revision.json()["id"]

    client.post(
        f"/review/documents/{revision_id}/decision",
        headers={"Authorization": f"Bearer {officer_token}"},
        json={"status": "approved", "comment": "Good now."},
    )

    resp = client.get(
        f"/documents/{original_id}/thread",
        headers={"Authorization": f"Bearer {advisor_token}"},
    )
    assert resp.status_code == 200
    thread = resp.json()

    assert len(thread) == 2
    # submission order
    assert thread[0]["document_id"] == original_id
    assert thread[1]["document_id"] == revision_id
    # each entry carries its own status, decision, and comment
    assert thread[0]["status"] == "needs_revision"
    assert thread[0]["review"]["status"] == "needs_revision"
    assert thread[0]["review"]["comment"] == "Fix this."
    assert thread[1]["status"] == "approved"
    assert thread[1]["review"]["status"] == "approved"
    assert thread[1]["review"]["comment"] == "Good now."
    assert thread[1]["replaces_document_id"] == original_id


def test_requesting_any_document_in_thread_returns_same_thread(client, advisor_token, officer_token):
    submit = client.post(
        "/documents",
        headers={"Authorization": f"Bearer {advisor_token}"},
        files={"file": FAKE_PDF},
    )
    original_id = submit.json()["id"]

    client.post(
        f"/review/documents/{original_id}/decision",
        headers={"Authorization": f"Bearer {officer_token}"},
        json={"status": "needs_revision", "comment": "Fix this."},
    )
    revision = client.post(
        f"/documents/{original_id}/revisions",
        headers={"Authorization": f"Bearer {advisor_token}"},
        files={"file": FAKE_PDF},
    )
    revision_id = revision.json()["id"]

    from_original = client.get(
        f"/documents/{original_id}/thread",
        headers={"Authorization": f"Bearer {advisor_token}"},
    ).json()
    from_revision = client.get(
        f"/documents/{revision_id}/thread",
        headers={"Authorization": f"Bearer {advisor_token}"},
    ).json()

    assert from_original == from_revision


def test_undecided_document_has_null_review_in_thread(client, advisor_token):
    submit = client.post(
        "/documents",
        headers={"Authorization": f"Bearer {advisor_token}"},
        files={"file": FAKE_PDF},
    )
    doc_id = submit.json()["id"]

    resp = client.get(
        f"/documents/{doc_id}/thread",
        headers={"Authorization": f"Bearer {advisor_token}"},
    )
    thread = resp.json()
    assert len(thread) == 1
    assert thread[0]["status"] == "pending_review"
    assert thread[0]["review"] is None


def test_other_advisor_cannot_access_someone_elses_thread(client, advisor_token):
    submit = client.post(
        "/documents",
        headers={"Authorization": f"Bearer {advisor_token}"},
        files={"file": FAKE_PDF},
    )
    doc_id = submit.json()["id"]

    other_signup = client.post(
        "/auth/signup",
        json={
            "name": "Other Advisor",
            "email": "ta22-other@rolefixture.io",
            "password": "testpass123",
            "role": "advisor",
        },
    )
    assert other_signup.status_code == 201
    other_login = client.post(
        "/auth/login",
        json={
            "email": "ta22-other@rolefixture.io",
            "password": "testpass123",
        },
    )
    other_token = other_login.json()["access_token"]

    resp = client.get(
        f"/documents/{doc_id}/thread",
        headers={"Authorization": f"Bearer {other_token}"},
    )
    assert resp.status_code == 403
