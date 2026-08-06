from functools import lru_cache
from typing import Annotated

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "SMI-V Intelligence Platform API"
    version: str = "0.1.0"
    app_env: str = "development"
    log_level: str = "INFO"
    database_url: str = "postgresql+asyncpg://smiv:change-me@localhost:5432/smiv"
    jwt_secret: str = "development-only-change-me"
    jwt_expire_minutes: int = 60
    pii_hash_secret: str = "development-only-change-me"
    google_client_id: str = ""
    google_allowed_domain: str = ""
    bootstrap_admin_email: str = "admin@smiv.local"
    cors_origins: Annotated[list[str], NoDecode] = [
        "http://localhost:5173",
        "http://localhost:8080",
    ]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @model_validator(mode="after")
    def secure_production_secrets(self) -> "Settings":
        if self.app_env == "production":
            for name in ("jwt_secret", "pii_hash_secret"):
                value = getattr(self, name)
                if len(value) < 32 or "change-me" in value or "replace-with" in value:
                    raise ValueError(f"{name} must be a strong production secret")
            if self.jwt_secret == self.pii_hash_secret:
                raise ValueError("JWT_SECRET and PII_HASH_SECRET must be different")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
