from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.post("")
def submit_document():
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.get("")
def list_documents():
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.get("/{document_id}")
def get_document(document_id: str):
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.post("/{document_id}/revisions")
def submit_revision(document_id: str):
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.get("/{document_id}/analysis")
def get_analysis(document_id: str):
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.post("/{document_id}/analysis/retry")
def retry_analysis(document_id: str):
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.get("/{document_id}/audit")
def get_document_audit(document_id: str):
    raise HTTPException(status_code=501, detail="Not implemented yet")
