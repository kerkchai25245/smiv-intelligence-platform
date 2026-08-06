from typing import Annotated
from urllib.parse import unquote
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security import require_roles
from app.models import ImportJob, User
from app.services.importer import import_excel, preview_excel

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


class ImportPreview(BaseModel):
    filename: str
    total_rows: int
    valid_rows: int
    created_count: int
    updated_count: int
    skipped_count: int
    errors: list[dict[str, object]]


def _validate_upload(filename: str, content: bytes) -> None:
    if not filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=415, detail="Only .xlsx files are supported")
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File exceeds 10 MB")


@router.post("/excel/preview", response_model=ImportPreview)
async def preview_upload(
    session: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[User, Depends(require_roles("admin", "editor"))],
    request: Request,
    filename: Annotated[str, Header(alias="X-Filename")],
) -> dict[str, object]:
    filename = unquote(filename)
    content = await request.body()
    _validate_upload(filename, content)
    try:
        return {"filename": filename, **(await preview_excel(session, content))}
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/excel", response_model=ImportJobRead)
async def upload_excel(
    session: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[User, Depends(require_roles("admin", "editor"))],
    request: Request,
    filename: Annotated[str, Header(alias="X-Filename")],
) -> ImportJob:
    filename = unquote(filename)
    content = await request.body()
    _validate_upload(filename, content)
    try:
        return await import_excel(session, content, filename, user)
    except ValueError as exc:
        await session.rollback()
        raise HTTPException(status_code=422, detail=str(exc)) from exc
