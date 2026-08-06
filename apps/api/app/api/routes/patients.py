import re
from hashlib import sha256
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security import current_user, hash_national_id, require_roles
from app.models import Patient, PatientVersion, User
from app.schemas.patient import PatientPage, PatientRead, PatientUpdate, VersionRead
from app.services.audit import add_audit
from app.services.patients import make_version

router = APIRouter(prefix="/patients", tags=["patients"])


@router.get("", response_model=PatientPage)
async def list_patients(
    session: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[User, Depends(current_user)],
    national_id: str | None = None,
    first_name: str | None = None,
    last_name: str | None = None,
    district: str | None = None,
    subdistrict: str | None = None,
    gender: str | None = None,
    v: Annotated[list[str] | None, Query()] = None,
    status: str | None = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=200)] = 50,
) -> PatientPage:
    filters = []
    if national_id:
        try:
            filters.append(Patient.national_id_hash == hash_national_id(national_id))
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
    if first_name:
        filters.append(Patient.first_name.ilike(f"%{first_name.strip()}%"))
    if last_name:
        filters.append(Patient.last_name.ilike(f"%{last_name.strip()}%"))
    for column, value in ((Patient.district, district), (Patient.subdistrict, subdistrict)):
        if value:
            filters.append(column == value)
    if gender:
        filters.append(Patient.gender == gender)
    v_columns = {"v1": Patient.v1, "v2": Patient.v2, "v3": Patient.v3, "v4": Patient.v4}
    for selected in v or []:
        if selected.lower() in v_columns:
            filters.append(v_columns[selected.lower()].is_(True))
    if status:
        filters.append(Patient.status == status)
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


@router.get("/filters")
async def patient_filters(
    session: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[User, Depends(current_user)],
) -> dict[str, list[str]]:
    districts = await session.scalars(
        select(Patient.district)
        .where(Patient.district.is_not(None))
        .distinct()
        .order_by(Patient.district)
    )
    subdistricts = await session.scalars(
        select(Patient.subdistrict)
        .where(Patient.subdistrict.is_not(None))
        .distinct()
        .order_by(Patient.subdistrict)
    )
    genders = await session.scalars(
        select(Patient.gender)
        .where(Patient.gender.is_not(None))
        .distinct()
        .order_by(Patient.gender)
    )
    return {
        "districts": [value for value in districts if value],
        "subdistricts": [value for value in subdistricts if value],
        "genders": [value for value in genders if value],
    }


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
    updates = body.model_dump(exclude_unset=True)
    national_id = updates.pop("national_id", None)
    if national_id is not None:
        digits = re.sub(r"\D", "", national_id)
        if len(digits) == 13:
            new_hash = hash_national_id(digits)
            duplicate = await session.scalar(
                select(Patient.id).where(
                    Patient.national_id_hash == new_hash,
                    Patient.id != patient.id,
                )
            )
            if duplicate:
                raise HTTPException(status_code=409, detail="National ID already exists")
            patient.national_id_hash = new_hash
            patient.national_id_last4 = digits[-4:]
            patient.national_id_valid = True
            patient.national_id_invalid_value = None
        else:
            patient.national_id_hash = sha256(
                f"invalid:{patient.id}:{national_id}".encode()
            ).hexdigest()
            patient.national_id_last4 = digits[-4:] if digits else ""
            patient.national_id_valid = False
            patient.national_id_invalid_value = national_id
    for key, value in updates.items():
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
