import io
import os
import uuid
import zipfile
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from database import get_db
from models import (
    Document, DocumentType, DocumentStatus, AuditEvent, AuditAction, User,
    AIAnalysis, Flag, Review, PIIMapping, AnalysisStatus, DocumentChunk,
    PrecedentIndex,
)
from audit_utils import record_view_if_new
from auth.dependencies import get_current_user, require_role
from documents.schemas import DocumentResponse, ThreadEntryResponse
from documents.analysis_schemas import AnalysisResponse
from reviews.schemas import ReviewResponse

from data_pipeline.extraction.extract import extract_text
from ai.compliance.analyze_document import analyze_text
from data_pipeline.retrieval.precedent_retrieval import retrieve_similar_precedents

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


def _detect_file_type(contents: bytes) -> DocumentType | None:
    """
    Determines file type from the file's own signature, not any
    client-supplied header (TA-23). PDFs have a simple magic-byte
    prefix; DOCX/XLSX are both ZIP containers, distinguished by which
    Office-specific internal file each one actually contains.
    """
    if contents.startswith(b"%PDF-"):
        return DocumentType.pdf

    if contents.startswith(b"PK\x03\x04") or contents.startswith(b"PK\x05\x06"):
        try:
            with zipfile.ZipFile(io.BytesIO(contents)) as zf:
                names = zf.namelist()
                if "word/document.xml" in names:
                    return DocumentType.docx
                if "xl/workbook.xml" in names:
                    return DocumentType.xlsx
        except zipfile.BadZipFile:
            return None

    return None


CHUNK_SIZE = 1024 * 1024  # 1MB


def _read_upload_with_cap(file: UploadFile) -> bytes:
    """
    Reads the upload in chunks, enforcing MAX_FILE_SIZE WHILE STREAMING
    (TA-24) rather than after the whole file is already buffered. Stops
    reading as soon as the cap is exceeded -- an oversized upload is
    never fully resident in memory.
    """
    buffer = bytearray()
    total = 0
    while True:
        chunk = file.file.read(CHUNK_SIZE)
        if not chunk:
            break
        total += len(chunk)
        if total > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File exceeds 10MB limit.")
        buffer.extend(chunk)
    return bytes(buffer)


def _save_upload(file: UploadFile, document_id: uuid.UUID) -> tuple[str, DocumentType]:
    contents = _read_upload_with_cap(file)

    detected_type = _detect_file_type(contents)
    if detected_type is None:
        raise HTTPException(
            status_code=400,
            detail="Unsupported or unrecognized file type. The file's signature "
                   "does not match PDF, DOCX, or XLSX.",
        )

    declared_type = ALLOWED_CONTENT_TYPES.get(file.content_type)
    if declared_type != detected_type:
        raise HTTPException(
            status_code=400,
            detail=f"Declared content type ({file.content_type}) does not match "
                   f"the file's actual signature (detected: {detected_type.value}). "
                   f"Refusing to store a mislabelled file.",
        )

    # Filename is ALWAYS server-derived: document_id (a UUID we generated)
    # plus an extension looked up from the DETECTED type -- never from
    # anything the client sent (TA-23).
    ext = DOCUMENT_TYPE_EXTENSIONS[detected_type]
    file_path = UPLOAD_DIR / f"{document_id}.{ext}"
    with open(file_path, "wb") as f:
        f.write(contents)
    return str(file_path), detected_type


def _check_document_access(document: Document, current_user: User):
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    if current_user.role.value == "advisor" and document.advisor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this document")


def _execute_pipeline(db: Session, document: Document) -> tuple[str, list[dict], dict, list[dict]]:
    """Runs extraction + the full analysis pipeline. Raises the RAW
    exception on failure -- no HTTPException conversion here, so the
    caller can capture real error detail to persist."""
    raw_text = extract_text(document.file_reference, document.type.value)
    summary, flags_data, mapping, chunks_data = analyze_text(db, raw_text)
    return summary, flags_data, mapping, chunks_data


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
        summary, flags_data, mapping, chunks_data = _execute_pipeline(db, document)
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

    # Replace any prior chunks for this document -- re-analysing must
    # never accumulate stale rows alongside fresh ones (TA-51).
    db.query(DocumentChunk).filter(DocumentChunk.document_id == document.id).delete()
    for chunk_data in chunks_data:
        db.add(DocumentChunk(
            document_id=document.id,
            chunk_index=chunk_data["chunk_index"],
            masked_text=chunk_data["masked_text"],
            embedding=chunk_data["embedding"],
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
    # Display-only metadata (TA-25) -- NEVER used for any filesystem path.
    original_filename = (file.filename or "unnamed")[:255]

    document = Document(
        id=document_id,
        advisor_id=current_user.id,
        status=DocumentStatus.pending_review,
        file_reference=file_path,
        original_filename=original_filename,
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

    record_view_if_new(db, current_user.id, document_id)
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
    original_filename = (file.filename or "unnamed")[:255]

    revision = Document(
        id=new_id,
        advisor_id=current_user.id,
        status=DocumentStatus.pending_review,
        file_reference=file_path,
        original_filename=original_filename,
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


def _average_embedding(embeddings: list[list[float]]) -> list[float]:
    """Mean-pools chunk embeddings into one representative document-level
    vector -- zero new API calls, reuses what's already stored (TA-51)."""
    n = len(embeddings)
    dim = len(embeddings[0])
    return [sum(e[i] for e in embeddings) / n for i in range(dim)]


def _compute_precedents_for_document(db: Session, document: Document) -> list[PrecedentIndex]:
    """
    Computed FRESH on every call, not cached -- the precedent index
    keeps growing as other documents get decided, so a cached snapshot
    from whenever this document was first analyzed would go stale.
    Uses stored DocumentChunk embeddings (TA-51), so this costs zero
    embedding API calls, only a pgvector query.
    """
    chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == document.id).all()
    if not chunks:
        return []  # empty state, not an error -- e.g. analysis hasn't run yet

    doc_embedding = _average_embedding([c.embedding for c in chunks])

    thread_document_ids = [
        d.id for d in db.query(Document.id).filter(Document.thread_id == document.thread_id).all()
    ]
    return retrieve_similar_precedents(db, doc_embedding, exclude_document_ids=thread_document_ids, top_k=3)


def _build_analysis_response(db: Session, document: Document, analysis: AIAnalysis) -> dict:
    precedents = _compute_precedents_for_document(db, document)
    return {
        "id": analysis.id,
        "document_id": analysis.document_id,
        "status": analysis.status,
        "error_message": analysis.error_message,
        "summary": analysis.summary,
        "generated_at": analysis.generated_at,
        "flags": analysis.flags,
        "precedents": precedents,
    }


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
        analysis = _execute_analysis(db, document, analysis)

    # in_progress, succeeded, or failed -- report the persisted state
    # as-is. No silent re-running; a failure stays visible until the
    # caller explicitly retries. Precedents are always computed fresh
    # regardless of analysis cache state.
    return _build_analysis_response(db, document, analysis)


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

    analysis = _execute_analysis(db, document, analysis)
    return _build_analysis_response(db, document, analysis)


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


@router.get("/{document_id}/thread", response_model=list[ThreadEntryResponse])
def get_document_thread(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns every revision in the thread, in submission order, each with
    its own status and decision (if any). Requesting ANY document in a
    thread returns the same thread, since all documents share one
    thread_id. Access is limited to the advisor's own threads via the
    standard access check on the requested document -- every document in
    a thread shares the same advisor_id by construction (a revision can
    only be created by the original submitter), so checking access on
    the requested document is equivalent to checking access on the
    whole thread.
    """
    document = db.query(Document).filter(Document.id == document_id).first()
    _check_document_access(document, current_user)

    thread_documents = (
        db.query(Document)
        .filter(Document.thread_id == document.thread_id)
        .order_by(Document.uploaded_at)
        .all()
    )

    entries = []
    for doc in thread_documents:
        review = db.query(Review).filter(Review.document_id == doc.id).first()
        entries.append({
            "document_id": doc.id,
            "status": doc.status,
            "type": doc.type,
            "uploaded_at": doc.uploaded_at,
            "replaces_document_id": doc.replaces_document_id,
            "review": review,
        })
    return entries
