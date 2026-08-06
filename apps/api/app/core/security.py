import base64
import hashlib
import hmac
import json
from datetime import UTC, datetime, timedelta
from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_session
from app.models import User

bearer = HTTPBearer(auto_error=False)


def normalize_national_id(value: str) -> str:
    digits = "".join(character for character in value if character.isdigit())
    if len(digits) != 13:
        raise ValueError("Thai national ID must contain 13 digits")
    checksum = (
        11 - sum(int(digit) * (13 - index) for index, digit in enumerate(digits[:12])) % 11
    ) % 10
    if checksum != int(digits[-1]):
        raise ValueError("Thai national ID checksum is invalid")
    return digits


def hash_national_id(value: str) -> str:
    digits = normalize_national_id(value)
    return hmac.new(settings.pii_hash_secret.encode(), digits.encode(), hashlib.sha256).hexdigest()


def create_access_token(user: User) -> str:
    expires = datetime.now(UTC) + timedelta(minutes=settings.jwt_expire_minutes)
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "exp": int(expires.timestamp()),
    }
    parts = [_b64(json.dumps(item, separators=(",", ":")).encode()) for item in (header, payload)]
    signature = hmac.new(
        settings.jwt_secret.encode(), ".".join(parts).encode(), hashlib.sha256
    ).digest()
    return ".".join([*parts, _b64(signature)])


def _b64(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode()


def _decode_token(token: str) -> dict[str, object]:
    try:
        header, payload, signature = token.split(".")
        expected = hmac.new(
            settings.jwt_secret.encode(), f"{header}.{payload}".encode(), hashlib.sha256
        ).digest()
        actual = base64.urlsafe_b64decode(signature + "=" * (-len(signature) % 4))
        if not hmac.compare_digest(expected, actual):
            raise ValueError("signature")
        data = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
        metadata = json.loads(base64.urlsafe_b64decode(header + "=" * (-len(header) % 4)))
        if metadata != {"alg": "HS256", "typ": "JWT"}:
            raise ValueError("unsupported header")
        if int(data["exp"]) < int(datetime.now(UTC).timestamp()):
            raise ValueError("expired")
        return data
    except (ValueError, KeyError, TypeError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=401, detail="Invalid access token") from exc


def verify_google_token(credential: str) -> dict[str, object]:
    if not settings.google_client_id:
        raise HTTPException(status_code=503, detail="Google login is not configured")
    try:
        from google.auth.transport import requests
        from google.oauth2 import id_token

        return id_token.verify_oauth2_token(
            credential, requests.Request(), settings.google_client_id
        )
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="Invalid Google credential") from exc


async def current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> User:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        payload = _decode_token(credentials.credentials)
        user_id = UUID(payload["sub"])
    except (KeyError, ValueError, TypeError) as exc:
        raise HTTPException(status_code=401, detail="Invalid access token") from exc
    user = await session.scalar(select(User).where(User.id == user_id, User.is_active.is_(True)))
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def require_roles(*roles: str):
    async def dependency(user: Annotated[User, Depends(current_user)]) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user

    return dependency
