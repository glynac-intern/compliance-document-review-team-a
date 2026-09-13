import sys
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models import Document, DocumentStatus, Review, AuditEvent, AuditAction, User, Notification
from audit_utils import record_view_if_new

sys.path.insert(0, "/app/ai/compliance")
from precedent_indexer import index_document_as_precedent
from auth.dependencies import require_role
from documents.schemas import DocumentResponse
from reviews.schemas import DecisionRequest, ReviewResponse

router = APIRouter()


@router.get("/queue", response_model=list[DocumentResponse])
def get_queue(
    status_filter: Optional[DocumentStatus] = Query(default=None, alias="status"),
    current_user: User = Depends(require_role("officer")),
    db: Session = Depends(get_db),
):
    query = db.query(Document)
    if status_filter is not None:
        query = query.filter(Document.status == status_filter)
    return query.order_by(Document.uploaded_at).all()


@router.get("/documents/{document_id}", response_model=DocumentResponse)
def get_review_document(
    document_id: uuid.UUID,
    current_user: User = Depends(require_role("officer")),
    db: Session = Depends(get_db),
):
    document = db.query(Document).filter(Document.id == document_id).first()
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")

    record_view_if_new(db, current_user.id, document_id)
    return document


@router.post("/documents/{document_id}/decision", response_model=ReviewResponse, status_code=201)
def submit_decision(
    document_id: uuid.UUID,
    payload: DecisionRequest,
    current_user: User = Depends(require_role("officer")),
    db: Session = Depends(get_db),
):
    document = db.query(Document).filter(Document.id == document_id).first()
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    if document.status != DocumentStatus.pending_review:
        raise HTTPException(
            status_code=400,
            detail=f"Document is '{document.status.value}', not pending review",
        )

    review = Review(
        document_id=document_id,
        officer_id=current_user.id,
        status=payload.status,
        comment=payload.comment,
    )
    db.add(review)

    document.status = DocumentStatus(payload.status.value)

    db.add(AuditEvent(actor_id=current_user.id, document_id=document_id, action=AuditAction.decided))

    status_messages = {
        "approved": "Your document was approved.",
        "rejected": "Your document was rejected.",
        "needs_revision": "Your document needs revision.",
    }
    message = status_messages.get(payload.status.value, f"Your document status changed to {payload.status.value}.")
    if payload.comment:
        message += f" Comment: {payload.comment}"

    db.add(Notification(
        user_id=document.advisor_id,
        document_id=document_id,
        message=message,
    ))

    db.commit()
    db.refresh(review)

    # Precedent indexing is a secondary enhancement, not core to the
    # decision itself -- a transient embedding-API failure must never
    # block an officer's decision from being recorded. Fails gracefully.
    try:
        index_document_as_precedent(db, document)
    except Exception as e:
        db.rollback()
        print(f"WARNING: precedent indexing failed for document {document_id}: {type(e).__name__}: {e}")

    return review
