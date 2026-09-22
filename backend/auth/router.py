from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import User
from auth.schemas import SignupRequest, LoginRequest, TokenResponse, UserResponse, UpdateMeRequest
from auth.security import hash_password, verify_password, create_access_token
from auth.dependencies import get_current_user

router = APIRouter()


@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        name=payload.name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(user_id=str(user.id), role=user.role.value)
    return TokenResponse(access_token=token)


@router.post("/logout")
def logout():
    # Stateless JWT — nothing to invalidate server-side.
    # Client is responsible for discarding the token.
    return {"detail": "Logged out"}


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserResponse)
def update_me(
    payload: UpdateMeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.email is not None and payload.email != current_user.email:
        existing = db.query(User).filter(User.email == payload.email, User.id != current_user.id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        current_user.email = payload.email

    if payload.name is not None:
        current_user.name = payload.name

    if payload.in_app_notifications_enabled is not None:
        current_user.in_app_notifications_enabled = payload.in_app_notifications_enabled

    db.commit()
    db.refresh(current_user)
    return current_user
