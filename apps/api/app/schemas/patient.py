from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class PatientRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    national_id_last4: str
    first_name: str
    last_name: str
    date_of_birth: date | None
    gender: str | None
    province: str | None
    district: str | None
    subdistrict: str | None
    latitude: float | None
    longitude: float | None
    v1: bool
    v2: bool
    v3: bool
    v4: bool
    status: str
    version: int
    updated_at: datetime


class PatientPage(BaseModel):
    items: list[PatientRead]
    total: int
    page: int
    page_size: int


class PatientUpdate(BaseModel):
    first_name: str | None = Field(default=None, max_length=150)
    last_name: str | None = Field(default=None, max_length=150)
    province: str | None = Field(default=None, max_length=120)
    district: str | None = Field(default=None, max_length=120)
    subdistrict: str | None = Field(default=None, max_length=120)
    latitude: float | None = None
    longitude: float | None = None
    v1: bool | None = None
    v2: bool | None = None
    v3: bool | None = None
    v4: bool | None = None
    status: Literal["active", "deceased", "moved"] | None = None


class VersionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    version: int
    snapshot: dict[str, object]
    changed_by: UUID | None
    changed_at: datetime
