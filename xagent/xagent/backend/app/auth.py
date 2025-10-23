"""
Authentication module for FastAPI backend
Simplified for development - works without Supabase token verification
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import logging
import os

logger = logging.getLogger(__name__)
security = HTTPBearer(auto_error=False)

# Get SECRET_KEY from environment
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")

def verify_token_optional(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """
    Optional token verification - returns user ID or fallback
    This allows the API to work without authentication in development
    """
    if not credentials:
        logger.info("⚠️ No credentials provided, using dev fallback user")
        return "dev-user-fallback"
    
    token = credentials.credentials
    
    # For development, just return a user ID without verification
    # In production, you would verify the token properly
    logger.info(f"✅ Token received, using dev user")
    return "dev-user-authenticated"

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """
    Required token verification - same as optional for now
    """
    return verify_token_optional(credentials)
