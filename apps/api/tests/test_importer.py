from io import BytesIO

from openpyxl import Workbook

from app.services.importer import _canonical, _find_headers, _parse_excel


def test_common_thai_national_id_headers_are_supported() -> None:
    assert _canonical("เลขบัตรประชาชน") == "national_id"
    assert _canonical("เลขบัตรประจำตัวประชาชน") == "national_id"
    assert _canonical("เลขประจำตัวประชาชน (13 หลัก)") == "national_id"
    assert _canonical("NATIONAL-ID") == "national_id"


def test_header_row_can_follow_report_title() -> None:
    rows = iter(
        [
            ("รายงานผู้รับบริการ", None),
            (None, None),
            ("ลำดับ", "เลขบัตรประจำตัวของประชาชน", "ชื่อ"),
        ]
    )

    headers, row_number = _find_headers(rows)

    assert row_number == 3
    assert headers[1] == "national_id"


def test_songkhla_workbook_headers_are_supported() -> None:
    headers = [
        "CID",
        "sex",
        "fullname",
        "tmb",
        "amp",
        "chw",
        "SMI-V1",
        "SMI-V2",
        "SMI-V3",
        "SMI-V4",
    ]

    assert [_canonical(value) for value in headers] == [
        "national_id",
        "gender",
        "full_name",
        "subdistrict",
        "district",
        "province",
        "v1",
        "v2",
        "v3",
        "v4",
    ]


def test_invalid_national_id_is_stored_with_warning() -> None:
    workbook = Workbook()
    sheet = workbook.active
    sheet.append(["CID", "fullname", "SMI-V1"])
    sheet.append(["12345", "Test Person", 1])
    content = BytesIO()
    workbook.save(content)

    parsed, warnings, total = _parse_excel(content.getvalue())

    assert total == 1
    assert len(parsed) == 1
    assert next(iter(parsed.values()))["national_id_valid"] is False
    assert warnings[0]["stored"] is True
