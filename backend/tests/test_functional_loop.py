"""
TA-124 (integration tests): the brief's rubric checks the Functional
Loop as one continuous chain -- "Advisor submits a real file; officer
finds it in a status-filtered queue, decides with a comment; advisor
sees the decision." -- but before this file, no single test walked
that whole chain in one place: test_role_boundary.py, test_advisor_
decisions.py, and test_ta94_queue_filters.py each cover one mechanism
of it in isolation (submit access, reading a decision, queue
filtering), but none of them submit -> find via the same
status-filtered query the rubric names -> decide -> read back, as one
narrative through the real endpoints.

This is that missing single trace, not a replacement for the
mechanism-level tests above (which stay useful for their own, more
targeted failure modes).
"""

import pytest

pytestmark = pytest.mark.integration

FAKE_PDF = ("test.pdf", b"%PDF-1.4 minimal fake content", "application/pdf")


def test_full_functional_loop_submit_find_in_queue_decide_advisor_sees_it(
    client, advisor_token, officer_token
):
    # 1. Advisor submits a real file.
    submit = client.post(
        "/documents",
        headers={"Authorization": f"Bearer {advisor_token}"},
        files={"file": FAKE_PDF},
    )
    assert submit.status_code == 201
    doc_id = submit.json()["id"]
    assert submit.json()["status"] == "pending_review"

    # 2. Officer finds it in a status-filtered queue -- the exact query
    # shape the rubric names, not just an unfiltered queue dump.
    queue = client.get(
        "/review/queue?status=pending_review",
        headers={"Authorization": f"Bearer {officer_token}"},
    )
    assert queue.status_code == 200
    queued_ids = [d["id"] for d in queue.json()]
    assert doc_id in queued_ids

    # 3. Officer decides, with a comment.
    decision = client.post(
        f"/review/documents/{doc_id}/decision",
        headers={"Authorization": f"Bearer {officer_token}"},
        json={"status": "approved", "comment": "Meets disclosure requirements."},
    )
    assert decision.status_code == 201

    # The document no longer shows up under a pending_review filter --
    # the queue and the decision aren't just two disconnected calls.
    queue_after = client.get(
        "/review/queue?status=pending_review",
        headers={"Authorization": f"Bearer {officer_token}"},
    )
    assert doc_id not in [d["id"] for d in queue_after.json()]

    # 4. Advisor sees the decision.
    reviews = client.get(
        f"/documents/{doc_id}/reviews",
        headers={"Authorization": f"Bearer {advisor_token}"},
    )
    assert reviews.status_code == 200
    review_list = reviews.json()
    assert len(review_list) == 1
    assert review_list[0]["status"] == "approved"
    assert review_list[0]["comment"] == "Meets disclosure requirements."
