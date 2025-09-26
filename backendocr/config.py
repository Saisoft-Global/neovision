from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    # API configuration
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    
    # CORS settings
    allowed_origins: list = ["http://localhost:5173"]
    
    # File upload settings
    max_upload_size: int = 10 * 1024 * 1024  # 10MB
    allowed_file_types: list = ["application/pdf", "image/jpeg", "image/png"]
    
    class Config:
        env_file = ".env"

settings = Settings()