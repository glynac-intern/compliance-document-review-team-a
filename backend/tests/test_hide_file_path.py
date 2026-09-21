"""
Tests for TA-25: file_reference (the server-side absolute path) must
never appear in any API response. original_filename is stored and
returned as its own display-only field, never used for any filesystem
path.
"""

import pytest

pytestmark = pytest.mark.integration

FAKE_PDF = ("Q1_Report.pdf", b"%PDF-1.4 minimal fake content", "application/pdf")


def test_file_reference_absent_from_submit_response(client, advisor_token):
    resp = client.post(
        "/documents",
        headers={"Authorization": f"Bearer {advisor_token}"},
        files={"file": FAKE_PDF},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert "file_reference" not in body
    assert "/app/uploads" not in resp.text


def test_original_filename_returned_correctly(client, advisor_token):
    resp = client.post(
        "/documents",
        headers={"Authorization": f"Bearer {advisor_token}"},
        files={"file": FAKE_PDF},
    )
    assert resp.json()["original_filename"] == "Q1_Report.pdf"


def test_file_reference_absent_from_get_document(client, advisor_token):
    submit = client.post(
        "/documents",
        headers={"Authorization": f"Bearer {advisor_token}"},
        files={"file": FAKE_PDF},
    )
    doc_id = submit.json()["id"]

    resp = client.get(
        f"/documents/{doc_id}",
        headers={"Authorization": f"Bearer {advisor_token}"},
    )
    assert "file_reference" not in resp.json()
    assert "/app/uploads" not in resp.text


def test_file_reference_absent_from_review_queue(client, advisor_token, officer_token):
    client.post(
        "/documents",
        headers={"Authorization": f"Bearer {advisor_token}"},
        files={"file": FAKE_PDF},
    )

    resp = client.get("/review/queue", headers={"Authorization": f"Bearer {officer_token}"})
    assert resp.status_code == 200
    assert "file_reference" not in resp.text
    assert "/app/uploads" not in resp.text


def test_download_endpoint_still_works_despite_hidden_path(client, advisor_token):
    """Clients must still reach file content -- just through the proper
    channel, not by reading file_reference out of a JSON response."""
    submit = client.post(
        "/documents",
        headers={"Authorization": f"Bearer {advisor_token}"},
        files={"file": FAKE_PDF},
    )
    doc_id = submit.json()["id"]

    resp = client.get(
        f"/documents/{doc_id}/file",
        headers={"Authorization": f"Bearer {advisor_token}"},
    )
    assert resp.status_code == 200
