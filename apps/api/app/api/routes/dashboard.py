from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security import current_user
from app.models import Patient, User

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
async def summary(
    session: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[User, Depends(current_user)],
) -> dict[str, object]:
    totals = (
        await session.execute(
            select(
                func.count(Patient.id).label("total"),
                func.sum(case((Patient.v1.is_(True), 1), else_=0)).label("v1"),
                func.sum(case((Patient.v2.is_(True), 1), else_=0)).label("v2"),
                func.sum(case((Patient.v3.is_(True), 1), else_=0)).label("v3"),
                func.sum(case((Patient.v4.is_(True), 1), else_=0)).label("v4"),
            )
        )
    ).one()
    province_rows = (
        await session.execute(
            select(Patient.province, func.count(Patient.id))
            .where(Patient.province.is_not(None))
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
        "by_province": [{"name": name, "count": count} for name, count in province_rows],
    }


@router.get("/unions")
async def unions(
    session: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[User, Depends(current_user)],
) -> dict[str, int]:
    columns = [Patient.v1, Patient.v2, Patient.v3, Patient.v4]
    result: dict[str, int] = {}
    for mask in range(1, 16):
        filters = [column.is_(bool(mask & (1 << index))) for index, column in enumerate(columns)]
        label = "&".join(f"V{index + 1}" for index in range(4) if mask & (1 << index))
        result[label] = (
            await session.scalar(select(func.count()).select_from(Patient).where(*filters)) or 0
        )
    return result
