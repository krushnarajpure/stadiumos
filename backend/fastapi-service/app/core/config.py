import os
from typing import Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "StadiumOS"
    API_V1_STR: str = "/api/v1"
    
    # Core system environment
    STADIUMOS_ENV: str = Field(default="development", validation_alias="STADIUMOS_ENV")
    STADIUMOS_GATEWAY_PORT: int = Field(default=8000, validation_alias="STADIUMOS_GATEWAY_PORT")
    STADIUMOS_API_HOST: str = Field(default="0.0.0.0", validation_alias="STADIUMOS_API_HOST")
    STADIUMOS_MODEL_PATH: str = Field(default="models/crowd_prediction.pkl", validation_alias="STADIUMOS_MODEL_PATH")

    # Security Configurations (No hardcoded defaults)
    SECRET_KEY: str = Field(default="", validation_alias="STADIUMOS_GATEWAY_JWT_SECRET")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Database Configurations (No hardcoded credentials)
    PG_HOST: str = Field(default="localhost", validation_alias="STADIUMOS_PG_HOST")
    PG_PORT: str = Field(default="5432", validation_alias="STADIUMOS_PG_PORT")
    PG_DB: str = Field(default="stadiumos_db", validation_alias="STADIUMOS_PG_DB")
    PG_USER: str = Field(default="", validation_alias="STADIUMOS_PG_USER")
    PG_PASS: str = Field(default="", validation_alias="STADIUMOS_PG_PASS")
    
    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql://{self.PG_USER}:{self.PG_PASS}@{self.PG_HOST}:{self.PG_PORT}/{self.PG_DB}"

    # Redis Configurations
    REDIS_HOST: str = Field(default="localhost", validation_alias="STADIUMOS_REDIS_HOST")
    REDIS_PORT: int = Field(default=6379, validation_alias="STADIUMOS_REDIS_PORT")

    # Kafka Configurations
    STADIUMOS_KAFKA_BROKERS: str = Field(default="localhost:9092", validation_alias="STADIUMOS_KAFKA_BROKERS")

    # Copilot & LLM Configurations
    GEMINI_API_KEY: str = Field(default="", validation_alias="GEMINI_API_KEY")
    COPILOT_LLM_PROVIDER: str = Field(default="gemini", validation_alias="COPILOT_LLM_PROVIDER")
    LLM_PROVIDER: str = Field(default="gemini", validation_alias="LLM_PROVIDER")
    COPILOT_LLM_MODEL: str = Field(default="", validation_alias="COPILOT_LLM_MODEL")
    OPENAI_API_KEY: str = Field(default="", validation_alias="OPENAI_API_KEY")
    ANTHROPIC_API_KEY: str = Field(default="", validation_alias="ANTHROPIC_API_KEY")
    GROQ_API_KEY: str = Field(default="", validation_alias="GROQ_API_KEY")
    OPENROUTER_API_KEY: str = Field(default="", validation_alias="OPENROUTER_API_KEY")
    OLLAMA_BASE_URL: str = Field(default="http://localhost:11434", validation_alias="OLLAMA_BASE_URL")

    # CORS Configurations
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:5173",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, list[str]]) -> list[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )
settings = Settings()
