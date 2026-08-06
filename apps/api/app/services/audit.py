from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AuditLog


def add_audit(
    session: AsyncSession,
    *,
    actor_id: UUID | None,
    action: str,
    resource_type: str,
    resource_id: str | None = None,
    details: dict[str, object] | None = None,
) -> None:
    session.add(
        AuditLog(
            actor_id=actor_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details or {},
            occurred_at=datetime.now(UTC),
        )
    )
