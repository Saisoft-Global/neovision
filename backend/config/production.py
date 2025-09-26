"""
Production Configuration for IDP Backend
"""
import os
from typing import List

class ProductionConfig:
    """Production configuration settings"""
    
    # Environment
    ENVIRONMENT = "production"
    DEBUG = False
    LOG_LEVEL = "INFO"
    
    # Server Configuration
    HOST = "0.0.0.0"
    PORT = int(os.getenv("PORT", 8000))
    WORKERS = int(os.getenv("MAX_WORKERS", 1))
    
    # Database Configuration
    DATABASE_URL = os.getenv("DATABASE_URL")
    POSTGRES_DB = os.getenv("POSTGRES_DB", "neocaptured_idp")
    POSTGRES_USER = os.getenv("POSTGRES_USER", "neocaptured_user")
    POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD")
    
    # Redis Configuration
    REDIS_URL = os.getenv("REDIS_URL")
    
    # CORS Configuration
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "https://neocaptured-idp-backend.onrender.com").split(",")
    FRONTEND_URL = os.getenv("FRONTEND_URL", "https://neocaptured-idp-backend.onrender.com")
    
    # OCR Configuration
    OCR_LANG = os.getenv("OCR_LANG", "en,ar")
    OCR_USE_GPU = False  # Render doesn't support GPU
    
    # Model Configuration
    MODEL_CACHE_DIR = os.getenv("MODEL_CACHE_DIR", "/app/models")
    UPLOAD_DIR = os.getenv("UPLOAD_DIR", "/app/uploads")
    TEMP_DIR = os.getenv("TEMP_DIR", "/app/temp")
    
    # Security
    SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-jwt-secret-here")
    
    # File Upload Limits
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
    ALLOWED_EXTENSIONS = [
        "pdf", "jpg", "jpeg", "png", "tiff", "bmp",
        "doc", "docx", "xls", "xlsx", "ppt", "pptx",
        "txt", "rtf"
    ]
    
    # Performance
    REQUEST_TIMEOUT = 300
    PROCESSING_TIMEOUT = 600
    
    # Logging
    LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    LOG_FILE = "/app/logs/app.log"
    
    @classmethod
    def get_database_url(cls) -> str:
        """Get database URL for SQLAlchemy"""
        if cls.DATABASE_URL:
            return cls.DATABASE_URL
        
        if all([cls.POSTGRES_USER, cls.POSTGRES_PASSWORD, cls.POSTGRES_DB]):
            return f"postgresql://{cls.POSTGRES_USER}:{cls.POSTGRES_PASSWORD}@localhost:5432/{cls.POSTGRES_DB}"
        
        return "sqlite:///./idp.db"  # Fallback to SQLite
    
    @classmethod
    def get_redis_url(cls) -> str:
        """Get Redis URL"""
        return cls.REDIS_URL or "redis://localhost:6379/0"
