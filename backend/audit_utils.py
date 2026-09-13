"""
Shared audit-logging helpers, used by both documents/router.py (advisor's
own-document view) and reviews/router.py (officer's review view) -- TA-28
requires BOTH sides to log views, and to do so deliberately rather than
flooding the trail on every request.
"""
import uuid

from sqlalchemy.orm import Session

from models import AuditEvent, AuditAction


def record_view_if_new(db: Session, actor_id: uuid.UUID, document_id: uuid.UUID) -> None:
    """
    Logs a 'viewed' event for this (actor, document) pair -- but only if
    their MOST RECENT event for this document isn't already a view.
    Collapses repeated consecutive views (e.g. refreshing the page) into
    one trail entry, while still logging a fresh view if something else
    happened since (a decision, a resubmission) -- a deliberate policy,
    not an accidental flood.
    """
    # Check the DOCUMENT's overall last event (not just this actor's own
    # history) -- only skip if that global last event was a view BY THIS
    # SAME actor. This correctly logs a fresh view if anything else
    # happened since (a decision, a view by someone else, a resubmission),
    # even if this actor's own last recorded action still happens to be
    # "viewed" from an earlier point in the timeline.
    last_event = (
        db.query(AuditEvent)
        .filter(AuditEvent.document_id == document_id)
        .order_by(AuditEvent.timestamp.desc())
        .first()
    )
    if (
        last_event is not None
        and last_event.action == AuditAction.viewed
        and last_event.actor_id == actor_id
    ):
        return  # this same actor's immediately-preceding action was already a view

    db.add(AuditEvent(actor_id=actor_id, document_id=document_id, action=AuditAction.viewed))
    db.commit()
