"""
Tests for TA-109: submit_decision (reviews/router.py) reads
document.status, checks it's pending_review, then writes a new Review
row and flips the status -- with no row lock and no DB constraint
stopping two Review rows on one document. backend/audit/router.py's
own comment assumes "at most one Review per document" as an invariant;
if this race is real, that breaks, and the officer-wide audit log
(TA-106) silently drops one of the two decisions via
reviews_by_document, a dict keyed by document_id.

Fires several concurrent decision requests at the same pending
document, each through its OWN DB session/connection -- not the shared
per-test `db_session` fixture, which is a single Python object and
isn't safe (or realistic) for concurrent use. This overrides get_db to
hand out a fresh session per request, exactly like the real app's
get_db does per connection, so the test exercises genuine concurrent
transactions against Postgres, not an artifact of test scaffolding.

Uses 8 concurrent attempts rather than exactly 2: hitting the precise
interleave window isn't fully guaranteed with only two threads, and 8
makes it overwhelmingly likely at least two interleave before either
commits, on unfixed code.
"""

import pytest

pytestmark = pytest.mark.integration

import threading
from concurrent.futures import ThreadPoolExecutor

from sqlalchemy.orm import sessionmaker

from database import get_db
from main import app
from models import Review

FAKE_PDF = ("test.pdf", b"%PDF-1.4 minimal fake content", "application/pdf")

CONCURRENCY = 8


def _submit(client, advisor_token):
    resp = client.post(
        "/documents",
        headers={"Authorization": f"Bearer {advisor_token}"},
        files={"file": FAKE_PDF},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


def test_concurrent_decisions_produce_at_most_one_review(
    client, test_db_engine, advisor_token, officer_token
):
    doc_id = _submit(client, advisor_token)

    SessionLocalTest = sessionmaker(bind=test_db_engine)

    def override_get_db():
        session = SessionLocalTest()
        try:
            yield session
        finally:
            session.close()

    # From here on, every request gets its OWN session -- matching
    # database.py's real get_db, unlike the client fixture's default
    # override (one shared session for the whole test).
    app.dependency_overrides[get_db] = override_get_db

    barrier = threading.Barrier(CONCURRENCY)

    def decide(i):
        barrier.wait()  # all CONCURRENCY requests fire as close to simultaneously as possible
        return client.post(
            f"/review/documents/{doc_id}/decision",
            headers={"Authorization": f"Bearer {officer_token}"},
            json={"status": "approved" if i % 2 == 0 else "rejected", "comment": f"Decision {i}."},
        )

    with ThreadPoolExecutor(max_workers=CONCURRENCY) as pool:
        responses = list(pool.map(decide, range(CONCURRENCY)))

    status_codes = [r.status_code for r in responses]
    succeeded = [c for c in status_codes if c == 201]
    rejected = [c for c in status_codes if c == 400]

    verify_session = SessionLocalTest()
    try:
        review_count = verify_session.query(Review).filter(Review.document_id == doc_id).count()
    finally:
        verify_session.close()

    assert len(succeeded) + len(rejected) == CONCURRENCY, f"Unexpected status codes: {status_codes}"
    assert len(succeeded) == 1, (
        f"Expected exactly 1 of {CONCURRENCY} concurrent decisions to succeed, got {len(succeeded)} "
        f"(status codes: {status_codes})"
    )
    assert review_count == 1, (
        f"Expected exactly 1 Review row for the document, found {review_count} -- "
        f"the 'at most one Review per document' invariant was violated"
    )
