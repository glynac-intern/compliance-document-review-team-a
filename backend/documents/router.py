import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from database import get_db
from models import Document, DocumentType, DocumentStatus, AuditEvent, AuditAction, User
from auth.dependencies import get_current_user, require_role
from documents.schemas import DocumentResponse

router = APIRouter()

UPLOAD_DIR = Path("/app/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_CONTENT_TYPES = {
    "application/pdf": DocumentType.pdf,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": DocumentType.docx,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": DocumentType.xlsx,
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
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    if current_user.role.value == "advisor" and document.advisor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this document")
    return document


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


@router.get("/{document_id}/analysis")
def get_analysis(document_id: uuid.UUID):
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.post("/{document_id}/analysis/retry")
def retry_analysis(document_id: uuid.UUID):
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.get("/{document_id}/audit")
def get_document_audit(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    document = db.query(Document).filter(Document.id == document_id).first()
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    if current_user.role.value == "advisor" and document.advisor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this document")

    events = (
        db.query(AuditEvent)
        .filter(AuditEvent.document_id == document_id)
        .order_by(AuditEvent.timestamp)
        .all()
    )
    return [
        {"id": str(e.id), "actor_id": str(e.actor_id), "action": e.action.value, "timestamp": e.timestamp.isoformat()}
        for e in events
    ]
