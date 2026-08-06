from typing import Annotated
from urllib.parse import unquote
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security import require_roles
from app.models import ImportJob, User
from app.services.importer import import_excel

router = APIRouter(prefix="/imports", tags=["imports"])


class ImportJobRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    filename: str
    status: str
    created_count: int
    updated_count: int
    skipped_count: int
    errors: list[dict[str, object]]


@router.post("/excel", response_model=ImportJobRead)
async def upload_excel(
    session: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[User, Depends(require_roles("admin", "editor"))],
    request: Request,
    filename: Annotated[str, Header(alias="X-Filename")],
) -> ImportJob:
    filename = unquote(filename)
    if not filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=415, detail="Only .xlsx files are supported")
    content = await request.body()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File exceeds 10 MB")
    try:
        return await import_excel(session, content, filename, user)
    except ValueError as exc:
        await session.rollback()
        raise HTTPException(status_code=422, detail=str(exc)) from exc
