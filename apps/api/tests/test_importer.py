from app.services.importer import _canonical, _find_headers


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
