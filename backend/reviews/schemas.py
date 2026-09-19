import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

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

    model_config = ConfigDict(from_attributes=True)


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []


class ChatResponse(BaseModel):
    reply: str
    suggested_decision_note: Optional[str] = None
