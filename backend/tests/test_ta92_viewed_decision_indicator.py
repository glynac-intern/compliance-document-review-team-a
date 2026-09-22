"""
Tests for TA-92: the officer queue surfaces whether the advisor has
viewed the decision yet, computed from the existing audit trail rather
than any new tracking mechanism.
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
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


def _queue_entry(client, officer_token, doc_id):
    queue = client.get(
        "/review/queue",
        headers={"Authorization": f"Bearer {officer_token}"},
    ).json()
    return next(d for d in queue if d["id"] == doc_id)


def test_advisor_viewed_decision_is_null_before_any_decision(client, advisor_token, officer_token):
    doc_id = _submit(client, advisor_token)
    entry = _queue_entry(client, officer_token, doc_id)
    assert entry["advisor_viewed_decision"] is None


def test_advisor_viewed_decision_is_false_before_advisor_views_it(client, advisor_token, officer_token):
    doc_id = _submit(client, advisor_token)
    decision = client.post(
        f"/review/documents/{doc_id}/decision",
        headers={"Authorization": f"Bearer {officer_token}"},
        json={"status": "approved", "comment": "Looks good."},
    )
    assert decision.status_code == 201

    entry = _queue_entry(client, officer_token, doc_id)
    assert entry["advisor_viewed_decision"] is False


def test_advisor_viewed_decision_is_true_after_advisor_views_it(client, advisor_token, officer_token):
    doc_id = _submit(client, advisor_token)
    assert (
        client.post(
            f"/review/documents/{doc_id}/decision",
            headers={"Authorization": f"Bearer {officer_token}"},
            json={"status": "approved", "comment": "Looks good."},
        ).status_code
        == 201
    )

    # advisor opens their own document, recording a 'viewed' audit event
    view_resp = client.get(
        f"/documents/{doc_id}",
        headers={"Authorization": f"Bearer {advisor_token}"},
    )
    assert view_resp.status_code == 200

    entry = _queue_entry(client, officer_token, doc_id)
    assert entry["advisor_viewed_decision"] is True


def test_a_view_before_the_decision_does_not_count(client, advisor_token, officer_token):
    """The advisor viewing their own freshly-submitted document (before
    it's even been decided) must not be mistaken for having seen the
    decision -- only a view AFTER decided_at counts."""
    doc_id = _submit(client, advisor_token)

    # advisor views the document while it's still pending_review
    assert (
        client.get(
            f"/documents/{doc_id}",
            headers={"Authorization": f"Bearer {advisor_token}"},
        ).status_code
        == 200
    )

    assert (
        client.post(
            f"/review/documents/{doc_id}/decision",
            headers={"Authorization": f"Bearer {officer_token}"},
            json={"status": "approved", "comment": "Looks good."},
        ).status_code
        == 201
    )

    entry = _queue_entry(client, officer_token, doc_id)
    assert entry["advisor_viewed_decision"] is False
