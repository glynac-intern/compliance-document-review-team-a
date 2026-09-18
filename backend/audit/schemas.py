from datetime import datetime

from pydantic import BaseModel


class AuditLogEntryResponse(BaseModel):
    id: str
    timestamp: datetime
    actor_name: str
    actor_role: str
    action_type: str
    document_id: str
    document_title: str
    details: str
