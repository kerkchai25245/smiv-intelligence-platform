from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_session
from app.core.security import create_access_token, current_user, verify_google_token
from app.models import User
from app.schemas.auth import GoogleLoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/google", response_model=TokenResponse)
async def google_login(
    body: GoogleLoginRequest, session: Annotated[AsyncSession, Depends(get_session)]
) -> TokenResponse:
    claims = verify_google_token(body.credential)
    email = str(claims.get("email", "")).lower()
    if not email or claims.get("email_verified") is not True:
        raise HTTPException(status_code=401, detail="A verified Google email is required")
    if settings.google_allowed_domain and claims.get("hd") != settings.google_allowed_domain:
        raise HTTPException(status_code=403, detail="Google account domain is not allowed")
    user = await session.scalar(select(User).where(User.email == email))
    if user is None:
        role = "admin" if email == settings.bootstrap_admin_email.lower() else "viewer"
        user = User(email=email, display_name=str(claims.get("name", email)), role=role)
        session.add(user)
        await session.commit()
        await session.refresh(user)
    return TokenResponse(
        access_token=create_access_token(user),
        user={
            "id": str(user.id),
            "email": user.email,
            "name": user.display_name,
            "role": user.role,
        },
    )


@router.get("/me")
async def me(user: Annotated[User, Depends(current_user)]) -> dict[str, str]:
    return {"id": str(user.id), "email": user.email, "name": user.display_name, "role": user.role}
