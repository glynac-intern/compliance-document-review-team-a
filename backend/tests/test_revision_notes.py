"""
Tests for the advisor's revision note: the frontend (revision-upload-
modal.tsx, document-adapter.ts, and the officer document detail page)
already fully expected a `revision_notes` field on both DocumentResponse
and each thread entry, and the API client already sent it as a `comment`
form field on submit_revision -- but the backend endpoint never declared
that parameter, so it was silently dropped on arrival and never stored
anywhere. Found during manual testing: an advisor's revision note never
showed up on the officer side because it was never actually persisted.
"""

import pytest

pytestmark = pytest.mark.integration

FAKE_PDF = ("test.pdf", b"%PDF-1.4 minimal fake content", "application/pdf")


def _submit_and_send_back_for_revision(client, advisor_token, officer_token):
    submit = client.post(
        "/documents",
        headers={"Authorization": f"Bearer {advisor_token}"},
        files={"file": FAKE_PDF},
    )
    assert submit.status_code == 201, submit.text
    doc_id = submit.json()["id"]

    decision = client.post(
        f"/review/documents/{doc_id}/decision",
        headers={"Authorization": f"Bearer {officer_token}"},
        json={"status": "needs_revision", "comment": "Fix the disclosure wording."},
    )
    assert decision.status_code == 201
    return doc_id


def test_revision_note_is_stored_and_returned(client, advisor_token, officer_token):
    doc_id = _submit_and_send_back_for_revision(client, advisor_token, officer_token)

    revision = client.post(
        f"/documents/{doc_id}/revisions",
        headers={"Authorization": f"Bearer {advisor_token}"},
        files={"file": FAKE_PDF},
        data={"comment": "Updated the disclosure wording as requested."},
    )
    assert revision.status_code == 201, revision.text
    assert revision.json()["revision_notes"] == "Updated the disclosure wording as requested."

    revision_id = revision.json()["id"]
    fetched = client.get(
        f"/documents/{revision_id}",
        headers={"Authorization": f"Bearer {advisor_token}"},
    )
    assert fetched.status_code == 200
    assert fetched.json()["revision_notes"] == "Updated the disclosure wording as requested."


def test_revision_without_a_comment_has_null_revision_notes(client, advisor_token, officer_token):
    doc_id = _submit_and_send_back_for_revision(client, advisor_token, officer_token)

    revision = client.post(
        f"/documents/{doc_id}/revisions",
        headers={"Authorization": f"Bearer {advisor_token}"},
        files={"file": FAKE_PDF},
    )
    assert revision.status_code == 201, revision.text
    assert revision.json()["revision_notes"] is None


def test_whitespace_only_comment_is_stored_as_null(client, advisor_token, officer_token):
    doc_id = _submit_and_send_back_for_revision(client, advisor_token, officer_token)

    revision = client.post(
        f"/documents/{doc_id}/revisions",
        headers={"Authorization": f"Bearer {advisor_token}"},
        files={"file": FAKE_PDF},
        data={"comment": "   "},
    )
    assert revision.status_code == 201, revision.text
    assert revision.json()["revision_notes"] is None


def test_revision_note_appears_in_the_thread(client, advisor_token, officer_token):
    doc_id = _submit_and_send_back_for_revision(client, advisor_token, officer_token)

    revision = client.post(
        f"/documents/{doc_id}/revisions",
        headers={"Authorization": f"Bearer {advisor_token}"},
        files={"file": FAKE_PDF},
        data={"comment": "Removed the non-standard terminology."},
    )
    assert revision.status_code == 201
    revision_id = revision.json()["id"]

    thread = client.get(
        f"/documents/{doc_id}/thread",
        headers={"Authorization": f"Bearer {advisor_token}"},
    ).json()

    original_entry = next(e for e in thread if e["document_id"] == doc_id)
    revision_entry = next(e for e in thread if e["document_id"] == revision_id)

    assert original_entry["revision_notes"] is None
    assert revision_entry["revision_notes"] == "Removed the non-standard terminology."
