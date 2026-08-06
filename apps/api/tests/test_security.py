from app.core.security import hash_national_id, normalize_national_id


def test_national_id_normalization_and_hashing() -> None:
    assert normalize_national_id("1-2345-67890-12-3") == "1234567890123"
    hashed = hash_national_id("1234567890123")
    assert len(hashed) == 64
    assert "1234567890123" not in hashed


def test_invalid_national_id_rejected() -> None:
    try:
        normalize_national_id("123")
    except ValueError as exc:
        assert "13 digits" in str(exc)
    else:
        raise AssertionError("Invalid national ID was accepted")
