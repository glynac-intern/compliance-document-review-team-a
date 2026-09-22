"""
Tests for TA-20: an authorised viewer can fetch the original uploaded
file, with correct access control, content type, and filename -- and
an unauthenticated request is rejected.
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


def test_advisor_can_download_own_file(client, advisor_token):
    doc_id = _submit(client, advisor_token)

    resp = client.get(
        f"/documents/{doc_id}/file",
        headers={"Authorization": f"Bearer {advisor_token}"},
    )
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    assert "content-disposition" in resp.headers
    assert resp.content.startswith(b"%PDF-1.4")


def test_officer_can_download_any_document(client, advisor_token, officer_token):
    doc_id = _submit(client, advisor_token)

    resp = client.get(
        f"/documents/{doc_id}/file",
        headers={"Authorization": f"Bearer {officer_token}"},
    )
    assert resp.status_code == 200


def test_other_advisor_cannot_download_someone_elses_file(client, advisor_token):
    doc_id = _submit(client, advisor_token)

    other_signup = client.post(
        "/auth/signup",
        json={
            "name": "Other Advisor",
            "email": "ta20-other@rolefixture.io",
            "password": "testpass123",
            "role": "advisor",
        },
    )
    assert other_signup.status_code == 201
    other_login = client.post(
        "/auth/login",
        json={
            "email": "ta20-other@rolefixture.io",
            "password": "testpass123",
        },
    )
    other_token = other_login.json()["access_token"]

    resp = client.get(
        f"/documents/{doc_id}/file",
        headers={"Authorization": f"Bearer {other_token}"},
    )
    assert resp.status_code == 403


def test_unauthenticated_download_is_rejected(client, advisor_token):
    doc_id = _submit(client, advisor_token)

    resp = client.get(f"/documents/{doc_id}/file")
    assert resp.status_code == 403
