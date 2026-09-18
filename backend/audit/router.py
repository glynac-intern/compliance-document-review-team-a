"""
TA-106: officer-wide audit log across ALL documents.

Previously the frontend's officer "Audit Log" tab never called any
backend endpoint at all -- it rendered a hardcoded array of fake
entries client-side. The only real audit data that existed was
per-document (documents/{id}/audit[,/export], scoped to one document's
thread); this is the first cross-document view, needed because the
officer tab has no single document in context.

AuditEvent itself only records a bare action + actor + timestamp (see
models.py) -- the human-readable "details" text and the split of
AuditAction.decided into approved/rejected/needs_revision (matching
what the frontend already renders distinct badges for) are derived
here from the related Review, the same way documents/router.py's
audit CSV export enriches 'decided' events with the Review row.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from database import get_db
from models import AuditAction, AuditEvent, Review, User
from auth.dependencies import require_role
from audit.schemas import AuditLogEntryResponse

router = APIRouter()

_DECISION_ACTION_TYPES = {
    "approved": "DECISION_APPROVED",
    "rejected": "DECISION_REJECTED",
    "needs_revision": "DECISION_REVISION",
}

_ACTION_TYPES = {
    AuditAction.submitted: "DOCUMENT_SUBMITTED",
    AuditAction.viewed: "DOCUMENT_VIEWED",
    AuditAction.resubmitted: "REVISION_UPLOADED",
    AuditAction.reminder_sent: "REMINDER_SENT",
}


def _action_type(event: AuditEvent, review: Review | None) -> str:
    if event.action == AuditAction.decided:
        if review is None:
            return "DECISION_APPROVED"  # shouldn't happen -- a decided event always has a Review
        return _DECISION_ACTION_TYPES.get(review.status.value, "DECISION_APPROVED")
    return _ACTION_TYPES.get(event.action, event.action.value.upper())


def _details(event: AuditEvent, filename: str, revision_notes: str | None, review: Review | None) -> str:
    if event.action == AuditAction.submitted:
        return f'Submitted "{filename}" for compliance review.'
    if event.action == AuditAction.viewed:
        return f'Viewed "{filename}".'
    if event.action == AuditAction.resubmitted:
        note = f" Advisor note: {revision_notes}" if revision_notes else ""
        return f'Uploaded a revision of "{filename}".{note}'
    if event.action == AuditAction.reminder_sent:
        return f'Sent a reminder that "{filename}" is still awaiting review.'
    if event.action == AuditAction.decided:
        if review is None:
            return f'Recorded a decision on "{filename}".'
        verb = {
            "approved": "Approved",
            "rejected": "Rejected",
            "needs_revision": "Requested revision on",
        }.get(review.status.value, "Decided on")
        comment = f" {review.comment}" if review.comment else ""
        return f'{verb} "{filename}".{comment}'
    return f'{event.action.value} on "{filename}".'


@router.get("", response_model=list[AuditLogEntryResponse])
def get_officer_audit_log(
    current_user: User = Depends(require_role("officer")),
    db: Session = Depends(get_db),
):
    """
    Not scoped to a single officer -- same "any officer can act on any
    document" boundary already used by /review/queue and reminders,
    since there is no per-officer routing in this system.
    """
    events = (
        db.query(AuditEvent)
        .options(joinedload(AuditEvent.document))
        .order_by(AuditEvent.timestamp.desc())
        .all()
    )

    actor_ids = {e.actor_id for e in events}
    actors = {u.id: u for u in db.query(User).filter(User.id.in_(actor_ids)).all()}

    document_ids = {e.document_id for e in events}
    # At most one Review per document -- submit_decision only runs while
    # a document is pending_review, and it always changes the status
    # away from pending as part of the same transaction, so a document
    # can never be decided twice.
    reviews_by_document = {
        r.document_id: r
        for r in db.query(Review).filter(Review.document_id.in_(document_ids)).all()
    }

    entries = []
    for e in events:
        actor = actors.get(e.actor_id)
        document = e.document
        filename = document.original_filename if document and document.original_filename else "an untitled document"
        review = reviews_by_document.get(e.document_id) if e.action == AuditAction.decided else None
        entries.append(AuditLogEntryResponse(
            id=str(e.id),
            timestamp=e.timestamp,
            actor_name=actor.name if actor else "Unknown user",
            actor_role=actor.role.value if actor else "unknown",
            action_type=_action_type(e, review),
            document_id=str(e.document_id),
            document_title=filename,
            details=_details(e, filename, document.revision_notes if document else None, review),
        ))
    return entries
