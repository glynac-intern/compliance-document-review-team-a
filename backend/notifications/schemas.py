import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: uuid.UUID
    document_id: Optional[uuid.UUID]
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True
