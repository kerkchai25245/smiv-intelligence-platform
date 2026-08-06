from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security import current_user, hash_national_id
from app.models import Patient, User

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _filters(
    national_id: str | None, first_name: str | None, last_name: str | None,
    district: str | None, subdistrict: str | None, gender: str | None,
    versions: list[str] | None,
) -> list[object]:
    result: list[object] = []
    if national_id:
        try:
            result.append(Patient.national_id_hash == hash_national_id(national_id))
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
    if first_name:
        result.append(Patient.first_name.ilike(f"%{first_name.strip()}%"))
    if last_name:
        result.append(Patient.last_name.ilike(f"%{last_name.strip()}%"))
    dimensions = (
        (Patient.district, district),
        (Patient.subdistrict, subdistrict),
        (Patient.gender, gender),
    )
    for column, value in dimensions:
        if value:
            result.append(column == value)
    columns = {"v1": Patient.v1, "v2": Patient.v2, "v3": Patient.v3, "v4": Patient.v4}
    for value in versions or []:
        if value.lower() in columns:
            result.append(columns[value.lower()].is_(True))
    return result


@router.get("/summary")
async def summary(
    session: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[User, Depends(current_user)],
    national_id: str | None = None, first_name: str | None = None, last_name: str | None = None,
    district: str | None = None, subdistrict: str | None = None, gender: str | None = None,
    v: Annotated[list[str] | None, Query()] = None,
) -> dict[str, object]:
    filters = _filters(national_id, first_name, last_name, district, subdistrict, gender, v)
    totals = (
        await session.execute(
            select(
                func.count(Patient.id).label("total"),
                func.sum(case((Patient.v1.is_(True), 1), else_=0)).label("v1"),
                func.sum(case((Patient.v2.is_(True), 1), else_=0)).label("v2"),
                func.sum(case((Patient.v3.is_(True), 1), else_=0)).label("v3"),
                func.sum(case((Patient.v4.is_(True), 1), else_=0)).label("v4"),
                func.sum(
                    case((Patient.national_id_valid.is_(False), 1), else_=0)
                ).label("invalid_ids"),
            ).where(*filters)
        )
    ).one()
    province_rows = (
        await session.execute(
            select(Patient.province, func.count(Patient.id))
            .where(Patient.province.is_not(None), *filters)
            .group_by(Patient.province)
            .order_by(func.count(Patient.id).desc())
            .limit(20)
        )
    ).all()
    return {
        "total": totals.total,
        "categories": {
            "v1": totals.v1 or 0,
            "v2": totals.v2 or 0,
            "v3": totals.v3 or 0,
            "v4": totals.v4 or 0,
        },
        "invalid_national_id_count": totals.invalid_ids or 0,
        "by_province": [{"name": name, "count": count} for name, count in province_rows],
    }


@router.get("/unions")
async def unions(
    session: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[User, Depends(current_user)],
    v: Annotated[list[str] | None, Query()] = None,
    national_id: str | None = None, first_name: str | None = None, last_name: str | None = None,
    district: str | None = None, subdistrict: str | None = None, gender: str | None = None,
) -> dict[str, int]:
    columns = [Patient.v1, Patient.v2, Patient.v3, Patient.v4]
    global_filters = _filters(national_id, first_name, last_name, district, subdistrict, gender, v)
    result: dict[str, int] = {}
    for mask in range(1, 16):
        filters = [column.is_(bool(mask & (1 << index))) for index, column in enumerate(columns)]
        label = "&".join(f"V{index + 1}" for index in range(4) if mask & (1 << index))
        result[label] = (
            await session.scalar(
                select(func.count()).select_from(Patient).where(*global_filters, *filters)
            )
            or 0
        )
    return result
