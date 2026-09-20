import uuid
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator

from models import UserRole


class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole

    @field_validator("password")
    @classmethod
    def password_complexity(cls, v: str) -> str:
        # Minimum bar for a project like this -- not enterprise-grade
        # policy, but sign-up no longer accepts any string at all (TA-14).
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        if not any(c.isalpha() for c in v):
            raise ValueError("Password must contain at least one letter")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UpdateMeRequest(BaseModel):
    # TA-117: Settings > Profile's Name/Email "Save" -- both optional so
    # each field can be saved independently, matching EditableField's
    # one-field-at-a-time inline edit on the frontend.
    name: Optional[str] = None
    email: Optional[EmailStr] = None

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("Name cannot be empty")
        return v.strip() if v is not None else v


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: uuid.UUID
    name: str
    email: EmailStr
    role: UserRole

    model_config = ConfigDict(from_attributes=True)
