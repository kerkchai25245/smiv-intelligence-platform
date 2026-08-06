from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security import current_user
from app.models import Patient, User

router = APIRouter(prefix="/intelligence", tags=["intelligence"])


@router.get("/map")
async def map_points(
    session: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[User, Depends(current_user)],
) -> list[dict[str, object]]:
    rows = await session.execute(
        select(
            Patient.latitude,
            Patient.longitude,
            Patient.province,
            Patient.district,
            Patient.v1,
            Patient.v2,
            Patient.v3,
            Patient.v4,
        )
        .where(Patient.latitude.is_not(None), Patient.longitude.is_not(None))
        .limit(5000)
    )
    return [
        {
            "latitude": lat,
            "longitude": lng,
            "province": province,
            "district": district,
            "categories": [
                name for name, value in zip(("V1", "V2", "V3", "V4"), values, strict=True) if value
            ],
        }
        for lat, lng, province, district, *values in rows
    ]


@router.get("/insights")
async def insights(
    session: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[User, Depends(current_user)],
) -> dict[str, object]:
    total = await session.scalar(select(func.count()).select_from(Patient)) or 0
    counts = {}
    for name, column in (
        ("V1", Patient.v1),
        ("V2", Patient.v2),
        ("V3", Patient.v3),
        ("V4", Patient.v4),
    ):
        counts[name] = (
            await session.scalar(select(func.count()).select_from(Patient).where(column.is_(True)))
            or 0
        )
    highest = max(counts, key=counts.get) if total else None
    located = (
        await session.scalar(
            select(func.count())
            .select_from(Patient)
            .where(Patient.latitude.is_not(None), Patient.longitude.is_not(None))
        )
        or 0
    )
    messages = (
        ["ยังไม่มีข้อมูลเพียงพอสำหรับวิเคราะห์"]
        if not total
        else [
            f"{highest} เป็นกลุ่มที่พบมากที่สุด ({counts[highest]:,} ราย)",
            f"ข้อมูลมีพิกัดสำหรับแผนที่ {located:,} ราย",
        ]
    )
    return {
        "total": total,
        "category_counts": counts,
        "insights": messages,
        "engine": "deterministic-v1",
    }
