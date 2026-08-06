from io import BytesIO
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_national_id, normalize_national_id
from app.models import ImportJob, Patient, User
from app.services.audit import add_audit
from app.services.patients import make_version, parse_bool, parse_date

ALIASES = {
    "national_id": {"national_id", "national id", "thai_id", "cid", "เลขบัตรประชาชน"},
    "first_name": {"first_name", "firstname", "ชื่อ"},
    "last_name": {"last_name", "lastname", "นามสกุล"},
    "date_of_birth": {"date_of_birth", "dob", "วันเกิด"},
    "gender": {"gender", "sex", "เพศ"},
    "province": {"province", "จังหวัด"},
    "district": {"district", "อำเภอ", "เขต"},
    "subdistrict": {"subdistrict", "ตำบล", "แขวง"},
    "latitude": {"latitude", "lat", "ละติจูด"},
    "longitude": {"longitude", "lng", "lon", "ลองจิจูด"},
    "v1": {"v1"},
    "v2": {"v2"},
    "v3": {"v3"},
    "v4": {"v4"},
}


def _canonical(header: object) -> str:
    normalized = str(header or "").strip().lower()
    for canonical, aliases in ALIASES.items():
        if normalized in aliases:
            return canonical
    return normalized


async def import_excel(
    session: AsyncSession, content: bytes, filename: str, user: User
) -> ImportJob:
    job = ImportJob(filename=filename, uploaded_by=user.id, status="processing")
    session.add(job)
    await session.flush()
    from openpyxl import load_workbook

    workbook = load_workbook(BytesIO(content), read_only=True, data_only=True)
    sheet = workbook.active
    rows = sheet.iter_rows(values_only=True)
    headers = [_canonical(value) for value in next(rows, [])]
    if "national_id" not in headers:
        raise ValueError("Missing national_id/เลขบัตรประชาชน column")

    for row_number, values in enumerate(rows, start=2):
        raw: dict[str, Any] = dict(zip(headers, values, strict=False))
        try:
            digits = normalize_national_id(str(raw.get("national_id", "")))
            national_hash = hash_national_id(digits)
            patient = await session.scalar(
                select(Patient).where(Patient.national_id_hash == national_hash)
            )
            known = {key: raw.get(key) for key in ALIASES}
            extras = {key: value for key, value in raw.items() if key not in ALIASES}
            fields = {
                "first_name": str(known["first_name"] or "").strip(),
                "last_name": str(known["last_name"] or "").strip(),
                "date_of_birth": parse_date(known["date_of_birth"]),
                "gender": str(known["gender"] or "").strip() or None,
                "province": str(known["province"] or "").strip() or None,
                "district": str(known["district"] or "").strip() or None,
                "subdistrict": str(known["subdistrict"] or "").strip() or None,
                "latitude": str(known["latitude"] or "").strip() or None,
                "longitude": str(known["longitude"] or "").strip() or None,
                "v1": parse_bool(known["v1"]),
                "v2": parse_bool(known["v2"]),
                "v3": parse_bool(known["v3"]),
                "v4": parse_bool(known["v4"]),
                "extra_data": extras,
            }
            if not fields["first_name"] or not fields["last_name"]:
                raise ValueError("first_name and last_name are required")
            if patient is None:
                patient = Patient(
                    national_id_hash=national_hash,
                    national_id_last4=digits[-4:],
                    **fields,
                )
                session.add(patient)
                await session.flush()
                job.created_count += 1
            else:
                session.add(make_version(patient, user.id))
                for key, value in fields.items():
                    setattr(patient, key, value)
                patient.version += 1
                job.updated_count += 1
        except (TypeError, ValueError) as exc:
            job.skipped_count += 1
            job.errors = [*job.errors, {"row": row_number, "message": str(exc)}]
    job.status = "completed_with_errors" if job.errors else "completed"
    add_audit(
        session,
        actor_id=user.id,
        action="excel.import",
        resource_type="import_job",
        resource_id=str(job.id),
        details={
            "filename": filename,
            "created": job.created_count,
            "updated": job.updated_count,
            "skipped": job.skipped_count,
        },
    )
    await session.commit()
    await session.refresh(job)
    return job
