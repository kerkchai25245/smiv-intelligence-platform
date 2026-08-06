from datetime import UTC, date, datetime
from typing import Any

from app.models import Patient, PatientVersion


def patient_snapshot(patient: Patient) -> dict[str, Any]:
    return {
        "national_id_last4": patient.national_id_last4,
        "national_id_valid": patient.national_id_valid,
        "first_name": patient.first_name,
        "last_name": patient.last_name,
        "date_of_birth": patient.date_of_birth.isoformat() if patient.date_of_birth else None,
        "gender": patient.gender,
        "province": patient.province,
        "district": patient.district,
        "subdistrict": patient.subdistrict,
        "latitude": patient.latitude,
        "longitude": patient.longitude,
        "v1": patient.v1,
        "v2": patient.v2,
        "v3": patient.v3,
        "v4": patient.v4,
        "status": patient.status,
        "extra_data": patient.extra_data,
        "version": patient.version,
    }


def make_version(patient: Patient, changed_by: object) -> PatientVersion:
    return PatientVersion(
        patient_id=patient.id,
        version=patient.version,
        snapshot=patient_snapshot(patient),
        changed_by=changed_by,
        changed_at=datetime.now(UTC),
    )


def parse_date(value: object) -> date | None:
    if value in (None, ""):
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    text = str(value).strip()
    for pattern in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            parsed = datetime.strptime(text, pattern).date()
            if parsed.year > 2400:
                parsed = parsed.replace(year=parsed.year - 543)
            return parsed
        except ValueError:
            continue
    raise ValueError(f"Unsupported date: {text}")


def parse_bool(value: object) -> bool:
    return str(value or "").strip().lower() in {"1", "true", "yes", "y", "ใช่", "มี"}
