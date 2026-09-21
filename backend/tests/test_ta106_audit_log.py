"""
Tests for TA-106: the officer "Audit Log" tab previously never called any
backend endpoint -- it rendered 10 hardcoded fake entries (fake officer
name, fake IP addresses, fake hash signatures) client-side, despite
framing itself as SEC/FINRA regulatory recordkeeping data.

GET /audit is the first officer-WIDE audit endpoint (the existing
/documents/{id}/audit is scoped to one document's thread) -- these tests
cover real data reaching it, the decided-event split into
approved/rejected/needs_revision (matching the frontend's distinct
badges), and that it's officer-only like the rest of the review surface.
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


def test_advisor_cannot_access_officer_audit_log(client, advisor_token):
    resp = client.get("/audit", headers={"Authorization": f"Bearer {advisor_token}"})
    assert resp.status_code == 403


def test_audit_log_reflects_real_submit_view_and_decision_events(client, advisor_token, officer_token):
    doc_id = _submit(client, advisor_token)

    # Officer viewing the document records a 'viewed' AuditEvent (TA-28).
    client.get(f"/review/documents/{doc_id}", headers={"Authorization": f"Bearer {officer_token}"})

    client.post(
        f"/review/documents/{doc_id}/decision",
        headers={"Authorization": f"Bearer {officer_token}"},
        json={"status": "needs_revision", "comment": "Missing risk disclosure."},
    )

    resp = client.get("/audit", headers={"Authorization": f"Bearer {officer_token}"})
    assert resp.status_code == 200
    entries = resp.json()

    doc_entries = {e["action_type"]: e for e in entries if e["document_id"] == doc_id}

    assert "DOCUMENT_SUBMITTED" in doc_entries
    assert doc_entries["DOCUMENT_SUBMITTED"]["document_title"] == "test.pdf"

    assert "DOCUMENT_VIEWED" in doc_entries

    # A 'decided' AuditEvent with status=needs_revision must be split into
    # the specific DECISION_REVISION action_type, not a generic "decided"
    # -- this is what lets the frontend render the correct colored badge.
    assert "DECISION_REVISION" in doc_entries
    decision_entry = doc_entries["DECISION_REVISION"]
    assert "Missing risk disclosure." in decision_entry["details"]
    assert decision_entry["actor_name"] != ""  # real actor, not a fabricated name


def test_audit_log_splits_approved_and_rejected_decisions_distinctly(client, advisor_token, officer_token):
    approved_doc = _submit(client, advisor_token)
    client.post(
        f"/review/documents/{approved_doc}/decision",
        headers={"Authorization": f"Bearer {officer_token}"},
        json={"status": "approved", "comment": "Looks compliant."},
    )

    rejected_doc = _submit(client, advisor_token)
    client.post(
        f"/review/documents/{rejected_doc}/decision",
        headers={"Authorization": f"Bearer {officer_token}"},
        json={"status": "rejected", "comment": "Unauthorized claims."},
    )

    resp = client.get("/audit", headers={"Authorization": f"Bearer {officer_token}"})
    entries = resp.json()

    approved_types = {e["action_type"] for e in entries if e["document_id"] == approved_doc}
    rejected_types = {e["action_type"] for e in entries if e["document_id"] == rejected_doc}

    assert "DECISION_APPROVED" in approved_types
    assert "DECISION_REJECTED" not in approved_types
    assert "DECISION_REJECTED" in rejected_types
    assert "DECISION_APPROVED" not in rejected_types
