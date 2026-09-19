import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload, selectinload

from database import get_db
from models import (
    Document, DocumentStatus, DocumentType, Review, AuditEvent, AuditAction, User, Notification,
    AIAnalysis, DocumentChunk, PIIMapping,
)
from audit_utils import record_view_if_new

from ai.compliance.precedent_indexer import index_document_as_precedent
from ai.compliance.chat import generate_chat_reply
from ai.masking.masker import unmask_for_display
from auth.dependencies import require_role
from data_pipeline.embeddings.embed_client import get_client
from documents.schemas import DocumentResponse
from reviews.schemas import DecisionRequest, ReviewResponse, ChatRequest, ChatResponse

router = APIRouter()


@router.get("/queue", response_model=list[DocumentResponse])
def get_queue(
    status_filter: Optional[DocumentStatus] = Query(default=None, alias="status"),
    # TA-94: narrow the queue by advisor and/or document type, on top of
    # the existing status filter. All three combine as AND, not OR --
    # each is an independent, optional .filter() clause.
    advisor_id: Optional[uuid.UUID] = Query(default=None),
    type_filter: Optional[DocumentType] = Query(default=None, alias="type"),
    current_user: User = Depends(require_role("officer")),
    db: Session = Depends(get_db),
):
    # TA-66: eager-load advisor to avoid an N+1 query -- one query
    # for the whole queue, regardless of how many rows it returns.
    # TA-92: same reasoning for advisor_viewed_decision, which reads
    # reviews + audit_events.
    query = db.query(Document).options(
        joinedload(Document.advisor),
        selectinload(Document.reviews),
        selectinload(Document.audit_events),
    )
    if status_filter is not None:
        query = query.filter(Document.status == status_filter)
    if advisor_id is not None:
        query = query.filter(Document.advisor_id == advisor_id)
    if type_filter is not None:
        query = query.filter(Document.type == type_filter)
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

    # Atomic guard against a race between two concurrent decisions on
    # the same document (TA-109): a plain "read status, then write" has
    # a gap between the check and the commit where two concurrent
    # requests can both see pending_review and both proceed, producing
    # two Review rows for one document. Folding the check into the
    # UPDATE's WHERE clause makes Postgres the arbiter instead -- only
    # one concurrent UPDATE against this row can ever match the WHERE
    # clause, whatever the interleaving; the loser affects 0 rows and
    # is rejected here, deterministically, with no explicit row lock.
    updated_rows = (
        db.query(Document)
        .filter(Document.id == document_id, Document.status == DocumentStatus.pending_review)
        .update({"status": payload.status.value}, synchronize_session="fetch")
    )
    if updated_rows == 0:
        db.rollback()
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


@router.post("/documents/{document_id}/chat", response_model=ChatResponse)
def chat_with_document(
    document_id: uuid.UUID,
    payload: ChatRequest,
    current_user: User = Depends(require_role("officer")),
    db: Session = Depends(get_db),
):
    """
    TA-103: answers the officer's actual question, grounded in the
    document's own (masked) text plus its existing summary/flags --
    this route previously didn't exist at all, so the frontend always
    fell through to a fixed, keyword-matched local fallback.
    """
    document = db.query(Document).filter(Document.id == document_id).first()
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")

    chunks = (
        db.query(DocumentChunk)
        .filter(DocumentChunk.document_id == document_id)
        .order_by(DocumentChunk.chunk_index)
        .all()
    )
    document_text = "\n\n".join(c.masked_text for c in chunks)

    analysis = db.query(AIAnalysis).filter(AIAnalysis.document_id == document_id).first()
    flags = [
        {
            "rule_id": f.matched_rule.text if f.matched_rule else None,
            "explanation": f.explanation,
            "severity": f.severity,
        }
        for f in (analysis.flags if analysis else [])
    ]

    mapping = {
        m.placeholder: m.original_value
        for m in db.query(PIIMapping).filter(PIIMapping.document_id == document_id).all()
    }

    try:
        client = get_client()
        result = generate_chat_reply(
            client,
            query=payload.message,
            history=[h.model_dump() for h in payload.history],
            document_text=document_text,
            title=document.original_filename,
            summary=analysis.summary if analysis else None,
            flags=flags,
        )
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"AI assist is unavailable: {type(e).__name__}: {e}",
        )

    return ChatResponse(
        reply=unmask_for_display(result["reply"], mapping),
        suggested_decision_note=(
            unmask_for_display(result["suggested_decision_note"], mapping)
            if result["suggested_decision_note"]
            else None
        ),
    )
