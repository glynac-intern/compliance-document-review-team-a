import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from models import ReviewStatus


class DecisionRequest(BaseModel):
    status: ReviewStatus
    comment: Optional[str] = None


class ReviewResponse(BaseModel):
    id: uuid.UUID
    document_id: uuid.UUID
    officer_id: uuid.UUID
    status: ReviewStatus
    comment: Optional[str]
    decided_at: datetime

    class Config:
        from_attributes = True
