"""
Tests for TA-107: CSV formula injection in the audit trail export
(GET /documents/{id}/audit/export).

Two fields land in the CSV straight from user-controlled input with no
sanitization: the officer's decision `comment` (documents/router.py's
export_document_audit) and the actor's `name` (free text at signup,
auth/schemas.py's SignupRequest has no character restriction on it).
A value starting with =, +, -, or @ is a live formula-injection payload
in Excel/Sheets on open -- e.g. =HYPERLINK(...) or =cmd|'/c calc'!A0 --
which matters here specifically because this export frames itself as
SEC/FINRA regulatory recordkeeping data (see TA-106), exactly the kind
of file a regulator opens in a spreadsheet app.

Mitigation checked here: any CSV field beginning with one of those
trigger characters must be neutralized (a leading `'` is the standard
approach -- it forces Excel to treat the cell as text) before being
written, not passed through raw.
"""

import pytest

pytestmark = pytest.mark.integration

import csv
import io

FAKE_PDF = ("test.pdf", b"%PDF-1.4 minimal fake content", "application/pdf")

# The standard formula-trigger prefixes recognized by Excel/Sheets/LibreOffice.
FORMULA_TRIGGERS = ["=", "+", "-", "@"]


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


def _assert_neutralized(raw_value: str, trigger: str):
    """A neutralized cell must not still open with a live trigger char --
    e.g. prefixed with a leading `'`, or the trigger char stripped/escaped.
    Whatever the scheme, re-reading it must not hand Excel a formula."""
    assert not raw_value.startswith(
        trigger
    ), f"CSV cell still starts with formula-trigger {trigger!r} unsanitized: {raw_value!r}"


def test_decision_comment_with_formula_trigger_is_neutralized_in_export(client, advisor_token, officer_token):
    for trigger in FORMULA_TRIGGERS:
        # A fresh document per trigger -- a decision moves a document out
        # of pending_review, so it can only ever be decided once.
        doc_id = _submit(client, advisor_token)
        payload = f'{trigger}HYPERLINK("http://evil.example","click")'
        resp = client.post(
            f"/review/documents/{doc_id}/decision",
            headers={"Authorization": f"Bearer {officer_token}"},
            json={"status": "needs_revision", "comment": payload},
        )
        assert resp.status_code == 201, resp.text

        rows = _parse_csv(
            client.get(
                f"/documents/{doc_id}/audit/export",
                headers={"Authorization": f"Bearer {advisor_token}"},
            )
        )
        decided_row = next(r for r in rows if r["action"] == "decided")
        _assert_neutralized(decided_row["decision_comment"], trigger)
        # The payload's actual content must still be recoverable -- this is
        # neutralization, not silent data loss.
        assert "HYPERLINK" in decided_row["decision_comment"]


def test_actor_name_with_formula_trigger_is_neutralized_in_export(client, advisor_token):
    malicious_name = "=cmd|'/c calc'!A0"
    signup = client.post(
        "/auth/signup",
        json={
            "name": malicious_name,
            "email": "formula-officer@rolefixture.io",
            "password": "testpass123",
            "role": "officer",
        },
    )
    assert signup.status_code == 201, signup.text
    login = client.post(
        "/auth/login",
        json={
            "email": "formula-officer@rolefixture.io",
            "password": "testpass123",
        },
    )
    officer_token = login.json()["access_token"]

    doc_id = _submit(client, advisor_token)
    assert (
        client.post(
            f"/review/documents/{doc_id}/decision",
            headers={"Authorization": f"Bearer {officer_token}"},
            json={"status": "approved", "comment": "Looks fine."},
        ).status_code
        == 201
    )

    rows = _parse_csv(
        client.get(
            f"/documents/{doc_id}/audit/export",
            headers={"Authorization": f"Bearer {advisor_token}"},
        )
    )
    decided_row = next(r for r in rows if r["action"] == "decided")
    _assert_neutralized(decided_row["actor_name"], "=")
    assert "cmd" in decided_row["actor_name"]


def test_plain_comment_without_trigger_is_untouched(client, advisor_token, officer_token):
    """Neutralization must be narrowly scoped to the actual trigger
    characters -- an ordinary comment must round-trip byte-for-byte."""
    doc_id = _submit(client, advisor_token)
    assert (
        client.post(
            f"/review/documents/{doc_id}/decision",
            headers={"Authorization": f"Bearer {officer_token}"},
            json={"status": "approved", "comment": "Looks compliant, approved."},
        ).status_code
        == 201
    )

    rows = _parse_csv(
        client.get(
            f"/documents/{doc_id}/audit/export",
            headers={"Authorization": f"Bearer {advisor_token}"},
        )
    )
    decided_row = next(r for r in rows if r["action"] == "decided")
    assert decided_row["decision_comment"] == "Looks compliant, approved."
