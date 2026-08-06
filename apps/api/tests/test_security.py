from app.core.security import hash_national_id, normalize_national_id


def test_national_id_normalization_and_hashing() -> None:
    assert normalize_national_id("1-1017-00207-03-0") == "1101700207030"
    hashed = hash_national_id("1101700207030")
    assert len(hashed) == 64
    assert "1101700207030" not in hashed


def test_invalid_national_id_rejected() -> None:
    try:
        normalize_national_id("123")
    except ValueError as exc:
        assert "13 digits" in str(exc)
    else:
        raise AssertionError("Invalid national ID was accepted")


def test_invalid_checksum_rejected() -> None:
    try:
        normalize_national_id("1101700207031")
    except ValueError as exc:
        assert "checksum" in str(exc)
    else:
        raise AssertionError("Invalid checksum was accepted")
