import sys
import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from database import get_db
from models import Document, DocumentType, DocumentStatus, AuditEvent, AuditAction, User, AIAnalysis, Flag, Review
from reviews.schemas import ReviewResponse
from auth.dependencies import get_current_user, require_role
from documents.schemas import DocumentResponse
from documents.analysis_schemas import AnalysisResponse

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

# Reverse lookup: DocumentType -> content-type, for serving files back out
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


def _run_analysis(db: Session, document: Document) -> tuple[str, list[dict]]:
    """
    Runs the pipeline only -- makes NO database writes. Raises
    HTTPException(503) on any failure. Separated from persistence so that
    a failed retry can never delete existing good data: callers must get a
    successful result here BEFORE touching any existing cached analysis.
    """
    try:
        raw_text = extract_text(document.file_reference, document.type.value)
        summary, flags_data, _mapping = analyze_text(db, raw_text)
        return summary, flags_data
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Analysis service is currently unavailable. Please retry. ({type(e).__name__})",
        )


def _persist_analysis(db: Session, document_id: uuid.UUID, summary: str, flags_data: list[dict]) -> AIAnalysis:
    analysis = AIAnalysis(document_id=document_id, summary=summary)
    db.add(analysis)
    db.flush()  # get analysis.id before creating flags

    for f in flags_data:
        db.add(Flag(
            analysis_id=analysis.id,
            passage_excerpt=f["passage"],
            matched_rule_id=f["rule_id"],
            explanation=f["explanation"],
            severity=f["severity"],
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

    existing = db.query(AIAnalysis).filter(AIAnalysis.document_id == document_id).first()
    if existing is not None:
        return existing  # cached -- do not re-call the LLM

    summary, flags_data = _run_analysis(db, document)
    return _persist_analysis(db, document.id, summary, flags_data)


@router.post("/{document_id}/analysis/retry", response_model=AnalysisResponse)
def retry_analysis(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    document = db.query(Document).filter(Document.id == document_id).first()
    _check_document_access(document, current_user)

    # Run the new analysis FIRST -- if this raises 503, we return early and
    # the existing cached analysis (if any) is left completely untouched.
    summary, flags_data = _run_analysis(db, document)

    existing = db.query(AIAnalysis).filter(AIAnalysis.document_id == document_id).first()
    if existing is not None:
        db.query(Flag).filter(Flag.analysis_id == existing.id).delete()
        db.delete(existing)
        db.flush()

    return _persist_analysis(db, document.id, summary, flags_data)


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
