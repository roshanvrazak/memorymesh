from pydantic_settings import BaseSettings
from typing import List


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

    class Config:
        env_file = ".env"


settings = Settings()
