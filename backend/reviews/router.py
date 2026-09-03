from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.get("/queue")
def get_queue():
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.get("/documents/{document_id}")
def get_review_document(document_id: str):
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.post("/documents/{document_id}/decision")
def submit_decision(document_id: str):
    raise HTTPException(status_code=501, detail="Not implemented yet")
