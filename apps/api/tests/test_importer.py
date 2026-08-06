from app.services.importer import _canonical


def test_common_thai_national_id_headers_are_supported() -> None:
    assert _canonical("เลขบัตรประชาชน") == "national_id"
    assert _canonical("เลขบัตรประจำตัวประชาชน") == "national_id"
    assert _canonical("เลขประจำตัวประชาชน (13 หลัก)") == "national_id"
    assert _canonical("NATIONAL-ID") == "national_id"
