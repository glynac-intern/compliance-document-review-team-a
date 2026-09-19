import uuid
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


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: uuid.UUID
    name: str
    email: EmailStr
    role: UserRole

    model_config = ConfigDict(from_attributes=True)
