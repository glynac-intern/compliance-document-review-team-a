import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from models import AnalysisStatus


class MatchedRuleResponse(BaseModel):
    id: uuid.UUID
    text: str
    type: str

    model_config = ConfigDict(from_attributes=True)


class FlagResponse(BaseModel):
    id: uuid.UUID
    passage_excerpt: str
    matched_rule: Optional[MatchedRuleResponse]
    explanation: str
    severity: str

    model_config = ConfigDict(from_attributes=True)


class PrecedentResponse(BaseModel):
    document_id: uuid.UUID
    masked_text: str
    decision: str
    comment: Optional[str]

    model_config = ConfigDict(from_attributes=True)


class AnalysisResponse(BaseModel):
    id: uuid.UUID
    document_id: uuid.UUID
    status: AnalysisStatus
    error_message: Optional[str]
    summary: Optional[str]
    generated_at: Optional[datetime]
    flags: list[FlagResponse]
    precedents: list[PrecedentResponse]

    model_config = ConfigDict(from_attributes=True)
