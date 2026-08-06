import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_comma_separated_cors_origins() -> None:
    settings = Settings(cors_origins="https://one.example, https://two.example")
    assert settings.cors_origins == ["https://one.example", "https://two.example"]


def test_production_rejects_example_secrets() -> None:
    with pytest.raises(ValidationError):
        Settings(app_env="production")
