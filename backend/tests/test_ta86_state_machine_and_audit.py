"""
Tests for TA-86: the document state machine, revision threads, and the
audit trail. The transition guards (submit_decision's pending_review
check), the duplicate-revision guard (submit_revision's existing_revision
check), and the thread-wide audit reconstruction (get_document_audit) are
all implemented in documents/router.py and reviews/router.py, and were
fixed by hand during development -- but none of it had a regression test
before this file.

test_revision_thread.py already covers ordered-thread reads and
"any document in the thread returns the same thread" -- not duplicated
here. This file covers what TA-86's acceptance criteria call out as
missing: transition guards (valid + invalid), the duplicate-revision
guard, a full multi-hop cycle, and audit trail content/ordering.
"""
import pytest

pytestmark = pytest.mark.integration

import pytest

FAKE_PDF = ("test.pdf", b"%PDF-1.4 minimal fake content", "application/pdf")


def _submit(client, advisor_token):
    resp = client.post(
        "/documents",
        headers={"Authorization": f"Bearer {advisor_token}"},
        files={"file": FAKE_PDF},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


def _decide(client, token, doc_id, decision_status, comment="A comment."):
    return client.post(
        f"/review/documents/{doc_id}/decision",
        headers={"Authorization": f"Bearer {token}"},
        json={"status": decision_status, "comment": comment},
    )


def _revise(client, advisor_token, doc_id):
    return client.post(
        f"/documents/{doc_id}/revisions",
        headers={"Authorization": f"Bearer {advisor_token}"},
        files={"file": FAKE_PDF},
    )


@pytest.mark.parametrize("decision_status", ["approved", "rejected", "needs_revision"])
def test_valid_transition_from_pending_review(client, advisor_token, officer_token, decision_status):
    doc_id = _submit(client, advisor_token)

    resp = _decide(client, officer_token, doc_id, decision_status)
    assert resp.status_code == 201

    doc = client.get(
        f"/documents/{doc_id}",
        headers={"Authorization": f"Bearer {advisor_token}"},
    ).json()
    assert doc["status"] == decision_status


@pytest.mark.parametrize("first_decision", ["approved", "rejected", "needs_revision"])
def test_deciding_a_second_time_on_the_same_document_is_rejected(
    client, advisor_token, officer_token, first_decision
):
    """Once a document has left pending_review, it can never be decided
    on again directly -- the only valid forward path from needs_revision
    is a fresh revision document, not a second decision on the same row."""
    doc_id = _submit(client, advisor_token)

    first = _decide(client, officer_token, doc_id, first_decision)
    assert first.status_code == 201

    second = _decide(client, officer_token, doc_id, "approved")
    assert second.status_code == 400

    reviews = client.get(
        f"/documents/{doc_id}/reviews",
        headers={"Authorization": f"Bearer {advisor_token}"},
    ).json()
    assert len(reviews) == 1, "a rejected second decision must not be recorded"
    assert reviews[0]["status"] == first_decision


@pytest.mark.parametrize("prior_decision", [None, "approved", "rejected"])
def test_revision_rejected_unless_document_needs_revision(
    client, advisor_token, officer_token, prior_decision
):
    """A revision can only ever be submitted against a document marked
    needs_revision -- not a fresh pending_review document, and not one
    already approved or rejected."""
    doc_id = _submit(client, advisor_token)
    if prior_decision is not None:
        decide_resp = _decide(client, officer_token, doc_id, prior_decision)
        assert decide_resp.status_code == 201

    resp = _revise(client, advisor_token, doc_id)
    assert resp.status_code == 400
    assert "needs_revision" in resp.json()["detail"]


def test_revising_the_same_document_twice_is_rejected(client, advisor_token, officer_token):
    """The duplicate-revision guard: once a needs_revision document has
    been revised, a second revision against the SAME original document
    must be rejected, even though its status is still needs_revision."""
    doc_id = _submit(client, advisor_token)
    assert _decide(client, officer_token, doc_id, "needs_revision").status_code == 201

    first_revision = _revise(client, advisor_token, doc_id)
    assert first_revision.status_code == 201

    second_revision = _revise(client, advisor_token, doc_id)
    assert second_revision.status_code == 400
    assert "already been revised" in second_revision.json()["detail"]


def test_full_multi_hop_submit_revise_approve_cycle(client, advisor_token, officer_token):
    """submit -> needs_revision -> resubmit -> needs_revision AGAIN ->
    resubmit -> approve: a three-document thread, each hop a real
    transition, read back as one ordered history from any document
    in it (extends test_revision_thread.py's two-hop coverage)."""
    doc1 = _submit(client, advisor_token)
    assert _decide(client, officer_token, doc1, "needs_revision", "Fix the first issue.").status_code == 201

    rev1 = _revise(client, advisor_token, doc1)
    assert rev1.status_code == 201
    doc2 = rev1.json()["id"]
    assert rev1.json()["replaces_document_id"] == doc1

    assert _decide(client, officer_token, doc2, "needs_revision", "Fix the second issue.").status_code == 201

    rev2 = _revise(client, advisor_token, doc2)
    assert rev2.status_code == 201
    doc3 = rev2.json()["id"]
    assert rev2.json()["replaces_document_id"] == doc2

    assert _decide(client, officer_token, doc3, "approved", "All good now.").status_code == 201

    for requesting_doc in (doc1, doc2, doc3):
        thread = client.get(
            f"/documents/{requesting_doc}/thread",
            headers={"Authorization": f"Bearer {advisor_token}"},
        ).json()
        assert [e["document_id"] for e in thread] == [doc1, doc2, doc3]
        assert [e["status"] for e in thread] == ["needs_revision", "needs_revision", "approved"]
        assert thread[0]["replaces_document_id"] is None
        assert thread[1]["replaces_document_id"] == doc1
        assert thread[2]["replaces_document_id"] == doc2


def test_audit_trail_contains_each_actor_action_and_ordering(client, advisor_token, officer_token):
    """The audit trail for a whole thread must show every actor and
    action, in the order they actually happened -- across BOTH documents
    in the thread, not just the one requested."""
    doc1 = _submit(client, advisor_token)

    # advisor views their own freshly-submitted document
    client.get(f"/documents/{doc1}", headers={"Authorization": f"Bearer {advisor_token}"})
    # officer views it for review
    client.get(f"/review/documents/{doc1}", headers={"Authorization": f"Bearer {officer_token}"})

    assert _decide(client, officer_token, doc1, "needs_revision", "Please fix.").status_code == 201

    rev = _revise(client, advisor_token, doc1)
    assert rev.status_code == 201
    doc2 = rev.json()["id"]

    assert _decide(client, officer_token, doc2, "approved", "Good now.").status_code == 201

    audit = client.get(
        f"/documents/{doc2}/audit",
        headers={"Authorization": f"Bearer {advisor_token}"},
    )
    assert audit.status_code == 200
    events = audit.json()

    # Ordering must be chronological -- assert as a strict sequence, not
    # a set, since ordering IS the thing under test.
    actual = [(e["actor_id"], e["action"], e["document_id"]) for e in events]

    advisor_resp = client.get("/auth/me", headers={"Authorization": f"Bearer {advisor_token}"}).json()
    officer_resp = client.get("/auth/me", headers={"Authorization": f"Bearer {officer_token}"}).json()
    advisor_id, officer_id = advisor_resp["id"], officer_resp["id"]

    expected = [
        (advisor_id, "submitted", doc1),
        (advisor_id, "viewed", doc1),
        (officer_id, "viewed", doc1),
        (officer_id, "decided", doc1),
        (advisor_id, "resubmitted", doc2),
        (officer_id, "decided", doc2),
    ]
    assert actual == expected

    timestamps = [e["timestamp"] for e in events]
    assert timestamps == sorted(timestamps), "audit events must be returned in chronological order"
