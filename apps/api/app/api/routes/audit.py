from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security import require_roles
from app.models import AuditLog, User

router = APIRouter(prefix="/audit", tags=["audit"])


class AuditRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    action: str
    resource_type: str
    resource_id: str | None
    details: dict[str, object]
    occurred_at: datetime


@router.get("", response_model=list[AuditRead])
async def list_audit(
    session: Annotated[AsyncSession, Depends(get_session)],
    _: Annotated[User, Depends(require_roles("admin"))],
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
) -> list[AuditLog]:
    rows = await session.scalars(
        select(AuditLog).order_by(AuditLog.occurred_at.desc()).limit(limit)
    )
    return list(rows)
