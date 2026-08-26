from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    gemini_api_key: str = Field(default="")
    openai_api_key: str = Field(default="")
    
    database_url: str = Field(default="sqlite+aiosqlite:///./raygpt.db")
    redis_url: str = Field(default="memory")
    qdrant_url: str = Field(default="http://localhost:6333")
    
    jwt_secret: str = Field(default="dev_secret")
    
    default_model: str = Field(default="gemini/gemini-2.5-flash")
    vision_model: str = Field(default="gemini/gemini-2.5-pro")
    embedding_model: str = Field(default="all-MiniLM-L6-v2")

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
