import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class FlagResponse(BaseModel):
    id: uuid.UUID
    passage_excerpt: str
    matched_rule_id: Optional[uuid.UUID]
    explanation: str
    severity: str

    class Config:
        from_attributes = True


class AnalysisResponse(BaseModel):
    id: uuid.UUID
    document_id: uuid.UUID
    summary: str
    generated_at: datetime
    flags: list[FlagResponse]

    class Config:
        from_attributes = True
