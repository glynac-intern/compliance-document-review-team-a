import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from models import DocumentStatus, DocumentType


class DocumentResponse(BaseModel):
    id: uuid.UUID
    advisor_id: uuid.UUID
    advisor_name: str  # TA-66 -- officers need to know who submitted this
    advisor_viewed_decision: Optional[bool]  # TA-92 -- None until decided
    status: DocumentStatus
    original_filename: Optional[str]
    type: DocumentType
    uploaded_at: datetime
    thread_id: uuid.UUID
    replaces_document_id: Optional[uuid.UUID]

    class Config:
        from_attributes = True


class ThreadReviewResponse(BaseModel):
    status: str
    comment: Optional[str]
    decided_at: datetime

    class Config:
        from_attributes = True


class ThreadEntryResponse(BaseModel):
    document_id: uuid.UUID
    status: DocumentStatus
    type: DocumentType
    uploaded_at: datetime
    replaces_document_id: Optional[uuid.UUID]
    review: Optional[ThreadReviewResponse]

    class Config:
        from_attributes = True
