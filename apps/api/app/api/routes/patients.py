from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security import current_user, require_roles
from app.models import Patient, PatientVersion, User
from app.schemas.patient import PatientPage, PatientRead, PatientUpdate, VersionRead
from app.services.audit import add_audit
from app.services.patients import make_version

router = APIRouter(prefix="/patients", tags=["patients"])


@router.get("", response_model=PatientPage)
async def list_patients(
    session: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[User, Depends(current_user)],
    search: str | None = None,
    province: str | None = None,
    district: str | None = None,
    v1: bool | None = None,
    v2: bool | None = None,
    v3: bool | None = None,
    v4: bool | None = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=200)] = 50,
) -> PatientPage:
    filters = []
    if search:
        term = f"%{search.strip()}%"
        filters.append(or_(Patient.first_name.ilike(term), Patient.last_name.ilike(term)))
    for column, value in ((Patient.province, province), (Patient.district, district)):
        if value:
            filters.append(column == value)
    for column, value in ((Patient.v1, v1), (Patient.v2, v2), (Patient.v3, v3), (Patient.v4, v4)):
        if value is not None:
            filters.append(column.is_(value))
    total = await session.scalar(select(func.count()).select_from(Patient).where(*filters))
    result = await session.scalars(
        select(Patient)
        .where(*filters)
        .order_by(Patient.updated_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return PatientPage(
        items=[PatientRead.model_validate(item) for item in result],
        total=total or 0,
        page=page,
        page_size=page_size,
    )


@router.patch("/{patient_id}", response_model=PatientRead)
async def update_patient(
    patient_id: UUID,
    body: PatientUpdate,
    session: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[User, Depends(require_roles("admin", "editor"))],
) -> Patient:
    patient = await session.get(Patient, patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    session.add(make_version(patient, user.id))
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(patient, key, value)
    patient.version += 1
    add_audit(
        session,
        actor_id=user.id,
        action="patient.update",
        resource_type="patient",
        resource_id=str(patient.id),
        details={"fields": list(body.model_dump(exclude_unset=True))},
    )
    await session.commit()
    await session.refresh(patient)
    return patient


@router.get("/{patient_id}/history", response_model=list[VersionRead])
async def patient_history(
    patient_id: UUID,
    session: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[User, Depends(current_user)],
) -> list[PatientVersion]:
    versions = await session.scalars(
        select(PatientVersion)
        .where(PatientVersion.patient_id == patient_id)
        .order_by(PatientVersion.version.desc())
    )
    return list(versions)
