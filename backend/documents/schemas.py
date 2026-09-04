import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from models import DocumentStatus, DocumentType


class DocumentResponse(BaseModel):
    id: uuid.UUID
    advisor_id: uuid.UUID
    status: DocumentStatus
    file_reference: str
    type: DocumentType
    uploaded_at: datetime
    thread_id: uuid.UUID
    replaces_document_id: Optional[uuid.UUID]

    class Config:
        from_attributes = True
