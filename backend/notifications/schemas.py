import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class NotificationResponse(BaseModel):
    id: uuid.UUID
    document_id: Optional[uuid.UUID]
    message: str
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
