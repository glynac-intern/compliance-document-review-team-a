import os
import sys
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from database import get_db
from models import (
    Document, DocumentType, DocumentStatus, AuditEvent, AuditAction, User,
    AIAnalysis, Flag, Review, PIIMapping, AnalysisStatus,
)
from auth.dependencies import get_current_user, require_role
from documents.schemas import DocumentResponse
from documents.analysis_schemas import AnalysisResponse
from reviews.schemas import ReviewResponse

sys.path.insert(0, "/app/data_pipeline/extraction")
sys.path.insert(0, "/app/ai/compliance")
from extract import extract_text
from analyze_document import analyze_text

router = APIRouter()

UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", "/app/uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_CONTENT_TYPES = {
    "application/pdf": DocumentType.pdf,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": DocumentType.docx,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": DocumentType.xlsx,
}

DOCUMENT_TYPE_MEDIA_TYPES = {v: k for k, v in ALLOWED_CONTENT_TYPES.items()}
DOCUMENT_TYPE_EXTENSIONS = {
    DocumentType.pdf: "pdf",
    DocumentType.docx: "docx",
    DocumentType.xlsx: "xlsx",
}


def _save_upload(file: UploadFile, document_id: uuid.UUID) -> tuple[str, DocumentType]:
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Only PDF, DOCX, and XLSX are accepted.",
        )
    contents = file.file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds 10MB limit.")

    ext = Path(file.filename).suffix
    file_path = UPLOAD_DIR / f"{document_id}{ext}"
    with open(file_path, "wb") as f:
        f.write(contents)
    return str(file_path), ALLOWED_CONTENT_TYPES[file.content_type]


def _check_document_access(document: Document, current_user: User):
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    if current_user.role.value == "advisor" and document.advisor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this document")


def _execute_pipeline(db: Session, document: Document) -> tuple[str, list[dict], dict]:
    """Runs extraction + the full analysis pipeline. Raises the RAW
    exception on failure -- no HTTPException conversion here, so the
    caller can capture real error detail to persist."""
    raw_text = extract_text(document.file_reference, document.type.value)
    summary, flags_data, mapping = analyze_text(db, raw_text)
    return summary, flags_data, mapping


def _execute_analysis(db: Session, document: Document, analysis: AIAnalysis) -> AIAnalysis:
    """
    Moves an AIAnalysis row through not_started/failed -> in_progress ->
    succeeded/failed, persisting the result onto the SAME row (never
    creates a second row per document -- uq_ai_analysis_document enforces
    this at the DB level too).
    """
    analysis.status = AnalysisStatus.in_progress
    db.commit()

    try:
        summary, flags_data, mapping = _execute_pipeline(db, document)
    except Exception as e:
        analysis.status = AnalysisStatus.failed
        analysis.error_message = f"{type(e).__name__}: {e}"
        db.commit()
        raise HTTPException(
            status_code=503,
            detail=f"Analysis failed: {analysis.error_message}. Retry to try again.",
        )

    analysis.status = AnalysisStatus.succeeded
    analysis.summary = summary
    analysis.generated_at = datetime.utcnow()
    analysis.error_message = None
    db.flush()

    for f in flags_data:
        db.add(Flag(
            analysis_id=analysis.id,
            passage_excerpt=f["passage"],
            matched_rule_id=f["rule_id"],
            explanation=f["explanation"],
            severity=f["severity"],
        ))

    for placeholder, original_value in mapping.items():
        db.add(PIIMapping(
            document_id=document.id,
            placeholder=placeholder,
            original_value=original_value,
        ))

    db.commit()
    db.refresh(analysis)
    return analysis


@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def submit_document(
    file: UploadFile = File(...),
    current_user: User = Depends(require_role("advisor")),
    db: Session = Depends(get_db),
):
    document_id = uuid.uuid4()
    file_path, doc_type = _save_upload(file, document_id)

    document = Document(
        id=document_id,
        advisor_id=current_user.id,
        status=DocumentStatus.pending_review,
        file_reference=file_path,
        type=doc_type,
        thread_id=document_id,
        replaces_document_id=None,
    )
    db.add(document)
    db.add(AuditEvent(actor_id=current_user.id, document_id=document_id, action=AuditAction.submitted))
    # Eagerly create the analysis row so a client can immediately see
    # "not_started" rather than there being no record at all.
    db.add(AIAnalysis(document_id=document_id, status=AnalysisStatus.not_started))
    db.commit()
    db.refresh(document)
    return document


@router.get("", response_model=list[DocumentResponse])
def list_documents(
    current_user: User = Depends(require_role("advisor")),
    db: Session = Depends(get_db),
):
    return db.query(Document).filter(Document.advisor_id == current_user.id).all()


@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    document = db.query(Document).filter(Document.id == document_id).first()
    _check_document_access(document, current_user)
    return document


@router.get("/{document_id}/file")
def download_document_file(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Streams the original uploaded file. The path served is ALWAYS
    document.file_reference from the database -- never anything derived
    from the request -- so a client cannot influence which file on disk
    gets read.
    """
    document = db.query(Document).filter(Document.id == document_id).first()
    _check_document_access(document, current_user)

    file_path = Path(document.file_reference)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on server")

    ext = DOCUMENT_TYPE_EXTENSIONS.get(document.type, "bin")
    filename = f"document-{document.id}.{ext}"
    media_type = DOCUMENT_TYPE_MEDIA_TYPES.get(document.type, "application/octet-stream")

    return FileResponse(
        path=file_path,
        media_type=media_type,
        filename=filename,
    )


@router.post("/{document_id}/revisions", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def submit_revision(
    document_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(require_role("advisor")),
    db: Session = Depends(get_db),
):
    original = db.query(Document).filter(Document.id == document_id).first()
    if original is None:
        raise HTTPException(status_code=404, detail="Original document not found")
    if original.advisor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to revise this document")
    if original.status != DocumentStatus.needs_revision:
        raise HTTPException(status_code=400, detail="Only documents marked 'needs_revision' can be resubmitted")

    existing_revision = (
        db.query(Document)
        .filter(Document.replaces_document_id == original.id)
        .first()
    )
    if existing_revision is not None:
        raise HTTPException(status_code=400, detail="This document has already been revised")

    new_id = uuid.uuid4()
    file_path, doc_type = _save_upload(file, new_id)

    revision = Document(
        id=new_id,
        advisor_id=current_user.id,
        status=DocumentStatus.pending_review,
        file_reference=file_path,
        type=doc_type,
        thread_id=original.thread_id,
        replaces_document_id=original.id,
    )
    db.add(revision)
    db.add(AuditEvent(actor_id=current_user.id, document_id=new_id, action=AuditAction.resubmitted))
    db.add(AIAnalysis(document_id=new_id, status=AnalysisStatus.not_started))
    db.commit()
    db.refresh(revision)
    return revision


@router.get("/{document_id}/analysis", response_model=AnalysisResponse)
def get_analysis(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    document = db.query(Document).filter(Document.id == document_id).first()
    _check_document_access(document, current_user)

    analysis = db.query(AIAnalysis).filter(AIAnalysis.document_id == document_id).first()
    if analysis is None:
        # Legacy fallback: a document submitted before this row was made
        # eager at submission time. Create it now, still not_started.
        analysis = AIAnalysis(document_id=document.id, status=AnalysisStatus.not_started)
        db.add(analysis)
        db.commit()
        db.refresh(analysis)

    if analysis.status == AnalysisStatus.not_started:
        return _execute_analysis(db, document, analysis)

    # in_progress, succeeded, or failed -- report the persisted state
    # as-is. No silent re-running; a failure stays visible until the
    # caller explicitly retries.
    return analysis


@router.post("/{document_id}/analysis/retry", response_model=AnalysisResponse)
def retry_analysis(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    document = db.query(Document).filter(Document.id == document_id).first()
    _check_document_access(document, current_user)

    analysis = db.query(AIAnalysis).filter(AIAnalysis.document_id == document_id).first()
    if analysis is None:
        analysis = AIAnalysis(document_id=document.id, status=AnalysisStatus.not_started)
        db.add(analysis)
        db.flush()

    # Clear previous results -- retry moves the state forward, it never
    # leaves stale flags/mapping from a prior attempt lying around.
    db.query(Flag).filter(Flag.analysis_id == analysis.id).delete()
    db.query(PIIMapping).filter(PIIMapping.document_id == document_id).delete()
    analysis.error_message = None
    db.commit()

    return _execute_analysis(db, document, analysis)


@router.get("/{document_id}/audit")
def get_document_audit(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    document = db.query(Document).filter(Document.id == document_id).first()
    _check_document_access(document, current_user)

    thread_document_ids = [
        d.id for d in db.query(Document.id).filter(Document.thread_id == document.thread_id).all()
    ]

    events = (
        db.query(AuditEvent)
        .filter(AuditEvent.document_id.in_(thread_document_ids))
        .order_by(AuditEvent.timestamp)
        .all()
    )
    return [
        {
            "id": str(e.id),
            "actor_id": str(e.actor_id),
            "document_id": str(e.document_id),
            "action": e.action.value,
            "timestamp": e.timestamp.isoformat(),
        }
        for e in events
    ]


@router.get("/{document_id}/reviews", response_model=list[ReviewResponse])
def get_document_reviews(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    document = db.query(Document).filter(Document.id == document_id).first()
    _check_document_access(document, current_user)

    thread_document_ids = [
        d.id for d in db.query(Document.id).filter(Document.thread_id == document.thread_id).all()
    ]

    reviews = (
        db.query(Review)
        .filter(Review.document_id.in_(thread_document_ids))
        .order_by(Review.decided_at)
        .all()
    )
    return reviews
