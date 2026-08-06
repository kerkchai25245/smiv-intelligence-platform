from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


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
    bootstrap_admin_email: str = "admin@smiv.local"
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:8080"]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
