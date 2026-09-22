"""
E2E Test Run Data Cleanup Script.

Cleans up test users, documents, reviews, audit events, and ensures no stray
entries remain in the precedent index from E2E test runs.

Addresses the TA-104 failure mode where test documents polluted the live
precedent index.

Usage:
    python scripts/cleanup_e2e_run.py [--prefix PREFIX] [--verify-only]
    docker compose run --rm backend python scripts/cleanup_e2e_run.py [--prefix PREFIX]
"""

import argparse
import sys
from pathlib import Path

# Ensure repo root is on sys.path so backend imports work
REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
BACKEND_DIR = REPO_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from database import SessionLocal
from models import (
    AIAnalysis,
    AuditEvent,
    Document,
    Flag,
    Notification,
    PIIMapping,
    PrecedentIndex,
    Review,
    User,
)


def cleanup_e2e_run(db, prefix: str = "e2e_", verify_only: bool = False) -> dict:
    """
    Finds and deletes all records associated with test users matching the prefix,
    and removes any stray precedent_index entries.
    """
    pattern = f"%{prefix}%"
    email_pattern = "%@e2e.test"

    # Find test users
    test_users = (
        db.query(User)
        .filter(
            (User.email.ilike(pattern))
            | (User.name.ilike(pattern))
            | (User.email.ilike(email_pattern))
            | (User.email.ilike(f"%{prefix}%@example.com"))
        )
        .all()
    )
    user_ids = [u.id for u in test_users]

    # Find documents owned by test users or matching prefix
    test_docs = (
        db.query(Document)
        .filter((Document.advisor_id.in_(user_ids)) | (Document.original_filename.ilike(pattern)))
        .all()
        if user_ids
        else db.query(Document).filter(Document.original_filename.ilike(pattern)).all()
    )
    doc_ids = [d.id for d in test_docs]

    # Find any precedent index rows matching test docs or test advisor names
    stray_precedents = (
        db.query(PrecedentIndex).filter(PrecedentIndex.document_id.in_(doc_ids)).all() if doc_ids else []
    )

    stats = {
        "users": len(test_users),
        "documents": len(test_docs),
        "stray_precedents": len(stray_precedents),
    }

    if verify_only:
        return stats

    # Delete in dependent order
    if stray_precedents:
        for p in stray_precedents:
            db.delete(p)
        db.flush()

    if doc_ids:
        # Reviews
        reviews = db.query(Review).filter(Review.document_id.in_(doc_ids)).all()
        for r in reviews:
            db.delete(r)

        # Audit events
        events = db.query(AuditEvent).filter(AuditEvent.document_id.in_(doc_ids)).all()
        for e in events:
            db.delete(e)

        # Notifications for test documents
        doc_notifications = db.query(Notification).filter(Notification.document_id.in_(doc_ids)).all()
        for n in doc_notifications:
            db.delete(n)

        # PII mappings
        pii = db.query(PIIMapping).filter(PIIMapping.document_id.in_(doc_ids)).all()
        for p in pii:
            db.delete(p)

        # AI Analyses and flags
        analyses = db.query(AIAnalysis).filter(AIAnalysis.document_id.in_(doc_ids)).all()
        analysis_ids = [a.id for a in analyses]
        if analysis_ids:
            flags = db.query(Flag).filter(Flag.analysis_id.in_(analysis_ids)).all()
            for f in flags:
                db.delete(f)
            for a in analyses:
                db.delete(a)

        # Break self-referencing FK chain before deleting documents.
        # PostgreSQL enforces documents.replaces_document_id → documents.id,
        # so we must null out the references first to avoid ordering issues.
        for d in test_docs:
            if d.replaces_document_id is not None:
                d.replaces_document_id = None
        db.flush()

        # Documents
        for d in test_docs:
            db.delete(d)
        db.flush()

    if user_ids:
        # Notifications for test users
        notifications = db.query(Notification).filter(Notification.user_id.in_(user_ids)).all()
        for n in notifications:
            db.delete(n)

        # Reviews by officer
        officer_reviews = db.query(Review).filter(Review.officer_id.in_(user_ids)).all()
        for r in officer_reviews:
            db.delete(r)

        # Audit events by user
        user_events = db.query(AuditEvent).filter(AuditEvent.actor_id.in_(user_ids)).all()
        for e in user_events:
            db.delete(e)

        for u in test_users:
            db.delete(u)

    db.commit()
    return stats


def verify_precedent_index_clean(db, prefix: str = "e2e_") -> bool:
    """Verifies that no precedent index rows contain the test prefix."""
    pattern = f"%{prefix}%"
    rows = (
        db.query(PrecedentIndex)
        .join(Document, Document.id == PrecedentIndex.document_id)
        .join(User, User.id == Document.advisor_id)
        .filter(
            (User.name.ilike(pattern))
            | (User.email.ilike(pattern))
            | (Document.original_filename.ilike(pattern))
        )
        .all()
    )
    return len(rows) == 0


def main():
    parser = argparse.ArgumentParser(description="Cleanup E2E test data")
    parser.add_argument(
        "--prefix",
        default="e2e_",
        help="Prefix to match test users and documents (default: e2e_)",
    )
    parser.add_argument(
        "--verify-only",
        action="store_true",
        help="Check for test data without deleting",
    )
    args = parser.parse_args()

    db = SessionLocal()
    try:
        stats = cleanup_e2e_run(db, prefix=args.prefix, verify_only=args.verify_only)
        action = "Found" if args.verify_only else "Cleaned up"
        print(
            f"[E2E Cleanup] {action}: {stats['users']} users, {stats['documents']} documents, {stats['stray_precedents']} precedent index entries."
        )

        is_clean = verify_precedent_index_clean(db, prefix=args.prefix)
        if not is_clean:
            print("[E2E Cleanup] WARNING: Precedent index still contains matching entries!", file=sys.stderr)
            sys.exit(1)
        else:
            print("[E2E Cleanup] Precedent index verified clean.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
