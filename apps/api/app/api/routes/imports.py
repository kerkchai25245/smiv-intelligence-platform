from typing import Annotated
from urllib.parse import unquote
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security import hash_national_id, normalize_national_id, require_roles
from app.models import ImportIssue, ImportJob, Patient, User
from app.services.importer import import_excel, preview_excel
from app.services.patients import parse_bool

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


class ImportIssueRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    import_job_id: UUID
    row_number: int
    reason: str
    raw_data: dict[str, object]
    resolved: bool


class ImportIssuePage(BaseModel):
    items: list[ImportIssueRead]
    total: int


class ImportIssueCorrection(BaseModel):
    national_id: str
    first_name: str = Field(min_length=1, max_length=150)
    last_name: str = Field(min_length=1, max_length=150)


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


@router.get("/issues", response_model=ImportIssuePage)
async def list_import_issues(
    session: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[User, Depends(require_roles("admin", "editor"))],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> ImportIssuePage:
    filters = [ImportIssue.resolved.is_(False)]
    total = await session.scalar(select(func.count()).select_from(ImportIssue).where(*filters))
    rows = await session.scalars(
        select(ImportIssue)
        .where(*filters)
        .order_by(ImportIssue.created_at.desc(), ImportIssue.row_number)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return ImportIssuePage(items=list(rows), total=total or 0)


@router.post("/issues/{issue_id}/resolve", response_model=ImportIssueRead)
async def resolve_import_issue(
    issue_id: UUID,
    body: ImportIssueCorrection,
    session: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[User, Depends(require_roles("admin", "editor"))],
) -> ImportIssue:
    issue = await session.get(ImportIssue, issue_id)
    if issue is None or issue.resolved:
        raise HTTPException(status_code=404, detail="Import issue not found")
    try:
        digits = normalize_national_id(body.national_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    national_hash = hash_national_id(digits)
    if await session.scalar(select(Patient.id).where(Patient.national_id_hash == national_hash)):
        raise HTTPException(status_code=409, detail="National ID already exists")
    raw = issue.raw_data
    patient = Patient(
        national_id_hash=national_hash,
        national_id_last4=digits[-4:],
        first_name=body.first_name.strip(),
        last_name=body.last_name.strip(),
        gender=str(raw.get("gender") or "").strip() or None,
        province=str(raw.get("province") or "").strip() or None,
        district=str(raw.get("district") or "").strip() or None,
        subdistrict=str(raw.get("subdistrict") or "").strip() or None,
        v1=parse_bool(raw.get("v1")), v2=parse_bool(raw.get("v2")),
        v3=parse_bool(raw.get("v3")), v4=parse_bool(raw.get("v4")),
        extra_data=raw,
    )
    session.add(patient)
    issue.resolved = True
    await session.commit()
    await session.refresh(issue)
    return issue
