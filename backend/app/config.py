from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List, Union


class Settings(BaseSettings):
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    CHAT_MODEL: str = "anthropic/claude-sonnet-4"
    COMPRESSION_MODEL: str = "anthropic/claude-haiku-4"

    DATABASE_URL: str = "postgresql+asyncpg://memorymesh:memorymesh@postgres:5432/memorymesh"
    REDIS_URL: str = "redis://redis:6379"

    ADMIN_API_KEY: str = "changeme"
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    # Memory settings
    REDIS_TTL: int = 7200  # 2 hours
    REDIS_MAX_MESSAGES: int = 20
    TOKEN_COMPRESSION_THRESHOLD: int = 4000
    SEMANTIC_TOP_K: int = 5

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Union[str, list]) -> list:
        if isinstance(v, list):
            return v
        v = v.strip()
        if v.startswith("["):
            import json
            return json.loads(v)
        return [origin.strip() for origin in v.split(",") if origin.strip()]

    class Config:
        env_file = ".env"


settings = Settings()
