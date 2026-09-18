"""
TA-88: attacks the role boundary rather than only checking where it was
built. test_role_boundary.py proves a handful of endpoints reject the
wrong role; this probes EVERY endpoint with no session and with the wrong
role, and probes cross-advisor access on every document-scoped endpoint
(including analysis and audit, explicitly called out in the ticket as
untested) -- something no existing fixture even supported, since only one
advisor_token fixture ever existed.

Whatever fails here is a real hole: fixed in the same commit, not
silently patched without a record of what broke.
"""
import pytest

FAKE_PDF = ("test.pdf", b"%PDF-1.4 minimal fake content", "application/pdf")
NIL_UUID = "00000000-0000-0000-0000-000000000000"


def _submit_document(client, token):
    return client.post(
        "/documents",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": FAKE_PDF},
    )


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


# --- No session at all: every GET endpoint that takes no body ---

NO_SESSION_GET_ENDPOINTS = [
    "/documents",
    f"/documents/{NIL_UUID}",
    f"/documents/{NIL_UUID}/file",
    f"/documents/{NIL_UUID}/analysis",
    f"/documents/{NIL_UUID}/audit",
    f"/documents/{NIL_UUID}/audit/export",
    f"/documents/{NIL_UUID}/reviews",
    f"/documents/{NIL_UUID}/thread",
    "/review/queue",
    f"/review/documents/{NIL_UUID}",
    "/audit",
    "/notifications",
    "/notifications/unread-count",
    "/auth/me",
]


@pytest.mark.parametrize("path", NO_SESSION_GET_ENDPOINTS)
def test_no_session_rejected_on_every_get_endpoint(client, path):
    resp = client.get(path)
    assert resp.status_code in (401, 403), (
        f"GET {path} with no Authorization header returned {resp.status_code} "
        f"instead of 401/403 -- endpoint is not actually protected"
    )


def test_no_session_rejected_on_submit_document(client):
    resp = client.post("/documents", files={"file": FAKE_PDF})
    assert resp.status_code in (401, 403)


def test_no_session_rejected_on_submit_revision(client):
    resp = client.post(f"/documents/{NIL_UUID}/revisions", files={"file": FAKE_PDF})
    assert resp.status_code in (401, 403)


def test_no_session_rejected_on_retry_analysis(client):
    resp = client.post(f"/documents/{NIL_UUID}/analysis/retry")
    assert resp.status_code in (401, 403)


def test_no_session_rejected_on_send_reminder(client):
    resp = client.post(f"/documents/{NIL_UUID}/reminder")
    assert resp.status_code in (401, 403)


def test_no_session_rejected_on_submit_decision(client):
    resp = client.post(f"/review/documents/{NIL_UUID}/decision", json={"status": "approved"})
    assert resp.status_code in (401, 403)


def test_no_session_rejected_on_mark_notification_read(client):
    resp = client.post(f"/notifications/{NIL_UUID}/read")
    assert resp.status_code in (401, 403)


# --- Wrong role: officer-only endpoints hit by an advisor, and vice versa ---

def test_advisor_cannot_hit_officer_only_get_review_document(client, advisor_token, officer_token):
    doc_id = _submit_document(client, advisor_token).json()["id"]
    resp = client.get(f"/review/documents/{doc_id}", headers=_auth(advisor_token))
    assert resp.status_code == 403


def test_advisor_cannot_list_documents_with_officer_token_style_probe(client, officer_token):
    # list_documents is advisor-only (require_role("advisor")); confirm an
    # officer can't just read the whole advisor document list either.
    resp = client.get("/documents", headers=_auth(officer_token))
    assert resp.status_code == 403


def test_officer_cannot_submit_revision(client, advisor_token, officer_token):
    doc_id = _submit_document(client, advisor_token).json()["id"]
    resp = client.post(
        f"/documents/{doc_id}/revisions",
        headers=_auth(officer_token),
        files={"file": FAKE_PDF},
    )
    assert resp.status_code == 403


# --- Cross-advisor access: TA-88's actual named target. Every
# document-scoped endpoint, probed with a SECOND advisor's token against
# the FIRST advisor's document. ---

@pytest.fixture()
def other_advisors_document(client, advisor_token):
    return _submit_document(client, advisor_token).json()["id"]


def test_cross_advisor_cannot_get_document(client, other_advisors_document, second_advisor_token):
    resp = client.get(f"/documents/{other_advisors_document}", headers=_auth(second_advisor_token))
    assert resp.status_code == 403


def test_cross_advisor_cannot_download_file(client, other_advisors_document, second_advisor_token):
    resp = client.get(f"/documents/{other_advisors_document}/file", headers=_auth(second_advisor_token))
    assert resp.status_code == 403


def test_cross_advisor_cannot_get_analysis(client, other_advisors_document, second_advisor_token):
    resp = client.get(f"/documents/{other_advisors_document}/analysis", headers=_auth(second_advisor_token))
    assert resp.status_code == 403


def test_cross_advisor_cannot_retry_analysis(client, other_advisors_document, second_advisor_token):
    resp = client.post(f"/documents/{other_advisors_document}/analysis/retry", headers=_auth(second_advisor_token))
    assert resp.status_code == 403


def test_cross_advisor_cannot_get_audit(client, other_advisors_document, second_advisor_token):
    resp = client.get(f"/documents/{other_advisors_document}/audit", headers=_auth(second_advisor_token))
    assert resp.status_code == 403


def test_cross_advisor_cannot_export_audit(client, other_advisors_document, second_advisor_token):
    resp = client.get(f"/documents/{other_advisors_document}/audit/export", headers=_auth(second_advisor_token))
    assert resp.status_code == 403


def test_cross_advisor_cannot_get_reviews(client, other_advisors_document, second_advisor_token):
    resp = client.get(f"/documents/{other_advisors_document}/reviews", headers=_auth(second_advisor_token))
    assert resp.status_code == 403


def test_cross_advisor_cannot_get_thread(client, other_advisors_document, second_advisor_token):
    resp = client.get(f"/documents/{other_advisors_document}/thread", headers=_auth(second_advisor_token))
    assert resp.status_code == 403


def test_cross_advisor_cannot_submit_revision(client, other_advisors_document, second_advisor_token):
    resp = client.post(
        f"/documents/{other_advisors_document}/revisions",
        headers=_auth(second_advisor_token),
        files={"file": FAKE_PDF},
    )
    assert resp.status_code == 403


def test_cross_advisor_cannot_send_reminder(client, other_advisors_document, second_advisor_token):
    resp = client.post(f"/documents/{other_advisors_document}/reminder", headers=_auth(second_advisor_token))
    assert resp.status_code == 403


def test_cross_advisor_document_not_in_second_advisors_list(client, other_advisors_document, second_advisor_token):
    resp = client.get("/documents", headers=_auth(second_advisor_token))
    assert resp.status_code == 200
    ids = [d["id"] for d in resp.json()]
    assert other_advisors_document not in ids


# --- Notifications: cross-user probe (not advisor-vs-advisor specifically,
# but the same "does the ownership check actually hold" question) ---

def test_cross_advisor_cannot_mark_someone_elses_notification_read(client, advisor_token, second_advisor_token, officer_token):
    doc_id = _submit_document(client, advisor_token).json()["id"]
    client.post(
        f"/review/documents/{doc_id}/decision",
        headers=_auth(officer_token),
        json={"status": "approved", "comment": "fine"},
    )
    notifs = client.get("/notifications", headers=_auth(advisor_token)).json()
    assert len(notifs) >= 1, "expected a notification from the decision just made"
    notif_id = notifs[0]["id"]

    resp = client.post(f"/notifications/{notif_id}/read", headers=_auth(second_advisor_token))
    assert resp.status_code == 403
