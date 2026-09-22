"""
Tests for TA-93: exporting a document thread's full audit trail (every
actor, action, timestamp) plus each decision's status and comment, as a
CSV. The cross-advisor access-boundary test for this endpoint lives in
test_ta88_authorization_probe.py, alongside every other document-scoped
endpoint's role-boundary probe -- not duplicated here.
"""

import pytest

pytestmark = pytest.mark.integration

import csv
import io

FAKE_PDF = ("test.pdf", b"%PDF-1.4 minimal fake content", "application/pdf")


def _submit(client, advisor_token):
    resp = client.post(
        "/documents",
        headers={"Authorization": f"Bearer {advisor_token}"},
        files={"file": FAKE_PDF},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


def _parse_csv(response) -> list[dict]:
    reader = csv.DictReader(io.StringIO(response.text))
    return list(reader)


def test_advisor_can_export_own_audit_trail_as_csv(client, advisor_token, officer_token):
    doc_id = _submit(client, advisor_token)
    assert (
        client.post(
            f"/review/documents/{doc_id}/decision",
            headers={"Authorization": f"Bearer {officer_token}"},
            json={"status": "approved", "comment": "Looks good."},
        ).status_code
        == 201
    )

    resp = client.get(
        f"/documents/{doc_id}/audit/export",
        headers={"Authorization": f"Bearer {advisor_token}"},
    )
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/csv")
    assert "attachment" in resp.headers["content-disposition"]

    rows = _parse_csv(resp)
    actions = [r["action"] for r in rows]
    assert actions == ["submitted", "decided"]


def test_officer_can_export_any_documents_audit_trail(client, advisor_token, officer_token):
    doc_id = _submit(client, advisor_token)

    resp = client.get(
        f"/documents/{doc_id}/audit/export",
        headers={"Authorization": f"Bearer {officer_token}"},
    )
    assert resp.status_code == 200
    rows = _parse_csv(resp)
    assert rows[0]["action"] == "submitted"


def test_decided_row_carries_status_and_comment_others_do_not(client, advisor_token, officer_token):
    doc_id = _submit(client, advisor_token)
    assert (
        client.post(
            f"/review/documents/{doc_id}/decision",
            headers={"Authorization": f"Bearer {officer_token}"},
            json={"status": "needs_revision", "comment": "Fix the disclosure wording."},
        ).status_code
        == 201
    )

    rows = _parse_csv(
        client.get(
            f"/documents/{doc_id}/audit/export",
            headers={"Authorization": f"Bearer {advisor_token}"},
        )
    )

    submitted_row = next(r for r in rows if r["action"] == "submitted")
    decided_row = next(r for r in rows if r["action"] == "decided")

    assert submitted_row["decision_status"] == ""
    assert submitted_row["decision_comment"] == ""
    assert decided_row["decision_status"] == "needs_revision"
    assert decided_row["decision_comment"] == "Fix the disclosure wording."
    assert decided_row["actor_role"] == "officer"


def test_export_covers_the_whole_thread_across_revisions(client, advisor_token, officer_token):
    doc1 = _submit(client, advisor_token)
    assert (
        client.post(
            f"/review/documents/{doc1}/decision",
            headers={"Authorization": f"Bearer {officer_token}"},
            json={"status": "needs_revision", "comment": "Fix this."},
        ).status_code
        == 201
    )

    revision = client.post(
        f"/documents/{doc1}/revisions",
        headers={"Authorization": f"Bearer {advisor_token}"},
        files={"file": FAKE_PDF},
    )
    assert revision.status_code == 201
    doc2 = revision.json()["id"]

    assert (
        client.post(
            f"/review/documents/{doc2}/decision",
            headers={"Authorization": f"Bearer {officer_token}"},
            json={"status": "approved", "comment": "Good now."},
        ).status_code
        == 201
    )

    # requesting the export from EITHER document in the thread returns
    # the whole thread's events, same as the JSON /audit endpoint does
    for requesting_doc in (doc1, doc2):
        rows = _parse_csv(
            client.get(
                f"/documents/{requesting_doc}/audit/export",
                headers={"Authorization": f"Bearer {advisor_token}"},
            )
        )
        document_ids_seen = {r["document_id"] for r in rows}
        actions = [r["action"] for r in rows]

        assert document_ids_seen == {doc1, doc2}
        assert actions == ["submitted", "decided", "resubmitted", "decided"]
