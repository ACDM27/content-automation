from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    PROJECT_NAME: str = "热点视频生成平台"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # Database - PostgreSQL
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DATABASE: str = "minimax"

    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379

    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    # Douyin API (placeholder)
    DOUYIN_APP_KEY: str = ""
    DOUYIN_APP_SECRET: str = ""

    # AI Services - 阿里云百炼
    DASHSCOPE_API_KEY: str = "sk-9faaa6865fa9427fba0a840ea089a2ec"
    DASHSCOPE_MODEL: str = "qwen-plus"

    # AI Services - 火山引擎方舟
    ARK_API_KEY: str = "0ffdaaa4-03c1-4148-8288-d3e4e744d306"
    ARK_MODEL: str = "doubao-seedance-1-5-pro-251215"
    ARK_VIDEO_BASE_URL: str = "https://ark.cn-beijing.volces.com"

    # AI Services - OpenAI (备用)
    OPENAI_API_KEY: str = ""

    # Feishu
    FEISHU_APP_ID: str = ""
    FEISHU_APP_SECRET: str = ""

    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql+psycopg2://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DATABASE}"

    @property
    def REDIS_URL(self) -> str:
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/0"

    class Config:
        env_file = ".env"


settings = Settings()
