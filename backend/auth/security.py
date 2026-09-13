import os
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

SECRET_KEY = os.environ["BACKEND_SECRET_KEY"]
ALGORITHM = "HS256"

# Token lifetime: 8 hours -- a DELIBERATE choice (TA-14), not a leftover
# development convenience default. Long enough to cover a full workday
# without forcing re-login mid-session; short enough to bound how long a
# leaked or stolen token stays valid. See README's Security section for
# the full rationale and accepted risks.
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8

# Refuse to start on an obviously placeholder or too-short secret key,
# rather than running insecurely (TA-14). Checked at import time so a
# misconfigured deployment fails fast and loudly, not silently -- this
# is exactly what caught this project's OWN local .env still holding
# the literal .env.example placeholder value when this check was added.
_KNOWN_PLACEHOLDER_SECRETS = {
    "changeme_generate_a_real_secret",
    "secret",
    "changeme",
    "your_secret_key_here",
    "",
}
_MIN_SECRET_KEY_LENGTH = 32  # matches `openssl rand -hex 32`'s output

if SECRET_KEY in _KNOWN_PLACEHOLDER_SECRETS or len(SECRET_KEY) < _MIN_SECRET_KEY_LENGTH:
    raise RuntimeError(
        f"BACKEND_SECRET_KEY is missing, a known placeholder, or shorter than "
        f"{_MIN_SECRET_KEY_LENGTH} characters. Generate a real one with: "
        f"openssl rand -hex 32"
    )

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(user_id: str, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": user_id, "role": role, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise ValueError("Invalid or expired token")
