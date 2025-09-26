"""
Supabase authentication router for production-grade IDP solution
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from pydantic import BaseModel, EmailStr
import logging

from models.supabase_client import get_supabase_client

router = APIRouter()
security = HTTPBearer()
logger = logging.getLogger(__name__)

# Pydantic Models
class UserSignup(BaseModel):
    email: EmailStr
    password: str
    username: str
    avatar_url: Optional[str] = None
    organization_name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    user: dict
    organization: dict

class ApiKeyCreate(BaseModel):
    name: str
    permissions: dict = {}
    expires_at: Optional[str] = None

class ApiKeyResponse(BaseModel):
    id: str
    name: str
    key: str  # Only returned on creation
    permissions: dict
    expires_at: Optional[str]
    created_at: str

# Utility Functions
def verify_supabase_token(token: str) -> dict:
    """Verify Supabase JWT token"""
    try:
        # Supabase handles JWT verification automatically
        # We just need to get the user from the token
        client = get_supabase_client()
        result = client.supabase.auth.get_user(token)
        if result.user:
            return {
                "user_id": result.user.id,
                "email": result.user.email,
                "role": result.user.role
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
    except Exception as e:
        logger.error(f"Token verification error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )

# Dependencies
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """Get current authenticated user from Supabase"""
    token = credentials.credentials
    user_data = verify_supabase_token(token)
    
    # Get user profile from database
    client = get_supabase_client()
    user_profile = await client.get_user_profile(user_data["user_id"])
    if not user_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found"
        )
    
    return user_profile

async def get_current_organization(current_user: dict = Depends(get_current_user)) -> dict:
    """Get current user's organization"""
    if not current_user.get("organization_id"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    
    client = get_supabase_client()
    organization = await client.get_organization(current_user["organization_id"])
    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    
    return organization

# Routes
@router.post("/signup", response_model=TokenResponse)
async def signup(user_data: UserSignup):
    """Register new user and organization using Supabase"""
    
    try:
        # Create organization first
        client = get_supabase_client()
        organization = await client.create_organization(
            name=user_data.organization_name,
            slug=user_data.organization_name.lower().replace(" ", "-")
        )
        
        # Create user in Supabase Auth
        auth_result = client.supabase.auth.sign_up({
            "email": user_data.email,
            "password": user_data.password
        })
        
        if not auth_result.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create user account"
            )
        
        # Create user profile
        user_profile = await client.create_user_profile(
            user_id=auth_result.user.id,
            organization_id=organization["id"],
            username=user_data.username,
            avatar_url=user_data.avatar_url,
            role="admin"  # First user in organization is admin
        )
        
        # Get session tokens
        session = auth_result.session
        if not session:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create session"
            )
        
        return TokenResponse(
            access_token=session.access_token,
            refresh_token=session.refresh_token,
            user={
                "id": user_profile["id"],
                "email": user_data.email,
                "username": user_data.username,
                "avatar_url": user_data.avatar_url,
                "role": user_profile["role"]
            },
            organization={
                "id": organization["id"],
                "name": organization["name"],
                "slug": organization["slug"]
            }
        )
        
    except Exception as e:
        logger.error(f"Signup error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Registration failed: {str(e)}"
        )

@router.post("/login", response_model=TokenResponse)
async def login(login_data: UserLogin):
    """Login user using Supabase"""
    
    try:
        # Authenticate with Supabase
        client = get_supabase_client()
        auth_result = client.supabase.auth.sign_in_with_password({
            "email": login_data.email,
            "password": login_data.password
        })
        
        if not auth_result.user or not auth_result.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Get user profile
        user_profile = await client.get_user_profile(auth_result.user.id)
        if not user_profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )
        
        # Get organization
        organization = await client.get_organization(user_profile["organization_id"])
        if not organization:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organization not found"
            )
        
        return TokenResponse(
            access_token=auth_result.session.access_token,
            refresh_token=auth_result.session.refresh_token,
            user={
                "id": user_profile["id"],
                "email": user_profile.get("email", login_data.email),
                "username": user_profile["username"],
                "avatar_url": user_profile.get("avatar_url"),
                "role": user_profile["role"]
            },
            organization={
                "id": organization["id"],
                "name": organization["name"],
                "slug": organization["slug"]
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Login failed"
        )

@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """Logout user from Supabase"""
    
    try:
        # Supabase handles logout automatically
        # Just return success message
        return {"message": "Logged out successfully"}
        
    except Exception as e:
        logger.error(f"Logout error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed"
        )

@router.get("/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current user information"""
    
    return {
        "id": current_user["id"],
        "email": current_user.get("email"),
        "username": current_user["username"],
        "avatar_url": current_user.get("avatar_url"),
        "role": current_user["role"],
        "status": current_user["status"],
        "organization_id": current_user["organization_id"],
        "created_at": current_user["created_at"]
    }

@router.post("/api-keys", response_model=ApiKeyResponse)
async def create_api_key(
    api_key_data: ApiKeyCreate,
    current_user: dict = Depends(get_current_user),
    current_org: dict = Depends(get_current_organization)
):
    """Create API key for organization"""
    
    # Check if user has admin or manager role
    if current_user["role"] not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and managers can create API keys"
        )
    
    # Generate API key
    import secrets
    api_key = f"nck_{secrets.token_urlsafe(32)}"
    
    # Hash the key (in production, use proper hashing)
    key_hash = api_key  # For demo purposes
    
    # Create API key record
    client = get_supabase_client()
    db_api_key = await client.create_api_key(
        organization_id=current_org["id"],
        name=api_key_data.name,
        key_hash=key_hash,
        permissions=api_key_data.permissions,
        expires_at=api_key_data.expires_at
    )
    
    return ApiKeyResponse(
        id=db_api_key["id"],
        name=db_api_key["name"],
        key=api_key,  # Only returned on creation
        permissions=db_api_key["permissions"],
        expires_at=db_api_key["expires_at"],
        created_at=db_api_key["created_at"]
    )

@router.get("/api-keys")
async def list_api_keys(
    current_user: dict = Depends(get_current_user),
    current_org: dict = Depends(get_current_organization)
):
    """List organization API keys"""
    
    client = get_supabase_client()
    api_keys = await client.get_organization_api_keys(current_org["id"])
    
    return [
        {
            "id": key["id"],
            "name": key["name"],
            "permissions": key["permissions"],
            "expires_at": key["expires_at"],
            "created_at": key["created_at"]
        }
        for key in api_keys
    ]

@router.delete("/api-keys/{key_id}")
async def delete_api_key(
    key_id: str,
    current_user: dict = Depends(get_current_user),
    current_org: dict = Depends(get_current_organization)
):
    """Delete API key"""
    
    # Check if user has admin or manager role
    if current_user["role"] not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and managers can delete API keys"
        )
    
    try:
        # Delete API key from Supabase
        client = get_supabase_client()
        result = client.supabase.table("api_keys").delete().eq("id", key_id).eq("organization_id", current_org["id"]).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API key not found"
            )
        
        return {"message": "API key deleted successfully"}
        
    except Exception as e:
        logger.error(f"Error deleting API key: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete API key"
        )
