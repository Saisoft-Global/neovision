"""
Organization management router for production-grade IDP solution
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

from models.database import get_db, Organization, User, ApiKey
from routers.auth import get_current_user, get_current_organization

router = APIRouter()

# Pydantic Models
class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    settings: Optional[dict] = None

class OrganizationResponse(BaseModel):
    id: str
    name: str
    slug: str
    settings: dict
    created_at: datetime
    updated_at: datetime
    user_count: int
    document_count: int

class UserInvite(BaseModel):
    email: str
    first_name: str
    last_name: str
    role: str = "user"

class UserResponse(BaseModel):
    id: str
    email: str
    first_name: str
    last_name: str
    role: str
    status: str
    created_at: datetime

class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None

# Routes
@router.get("/", response_model=OrganizationResponse)
async def get_organization(
    current_user: User = Depends(get_current_user),
    current_org: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """Get current organization details"""
    
    # Get user count
    user_count = db.query(User).filter(
        User.organization_id == current_org.id
    ).count()
    
    # Get document count
    from models.database import Document
    document_count = db.query(Document).filter(
        Document.organization_id == current_org.id
    ).count()
    
    return OrganizationResponse(
        id=str(current_org.id),
        name=current_org.name,
        slug=current_org.slug,
        settings=current_org.settings,
        created_at=current_org.created_at,
        updated_at=current_org.updated_at,
        user_count=user_count,
        document_count=document_count
    )

@router.put("/", response_model=OrganizationResponse)
async def update_organization(
    org_data: OrganizationUpdate,
    current_user: User = Depends(get_current_user),
    current_org: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """Update organization details"""
    
    # Check if user has admin role
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only organization admins can update organization details"
        )
    
    # Update organization
    if org_data.name:
        current_org.name = org_data.name
        current_org.slug = org_data.name.lower().replace(" ", "-")
    
    if org_data.settings:
        current_org.settings = {**current_org.settings, **org_data.settings}
    
    current_org.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(current_org)
    
    # Get counts
    user_count = db.query(User).filter(
        User.organization_id == current_org.id
    ).count()
    
    from models.database import Document
    document_count = db.query(Document).filter(
        Document.organization_id == current_org.id
    ).count()
    
    return OrganizationResponse(
        id=str(current_org.id),
        name=current_org.name,
        slug=current_org.slug,
        settings=current_org.settings,
        created_at=current_org.created_at,
        updated_at=current_org.updated_at,
        user_count=user_count,
        document_count=document_count
    )

@router.get("/users", response_model=List[UserResponse])
async def list_organization_users(
    current_user: User = Depends(get_current_user),
    current_org: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """List organization users"""
    
    users = db.query(User).filter(
        User.organization_id == current_org.id
    ).all()
    
    return [
        UserResponse(
            id=str(user.id),
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            role=user.role,
            status=user.status,
            created_at=user.created_at
        )
        for user in users
    ]

@router.post("/users/invite", response_model=UserResponse)
async def invite_user(
    user_data: UserInvite,
    current_user: User = Depends(get_current_user),
    current_org: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """Invite new user to organization"""
    
    # Check if user has admin or manager role
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and managers can invite users"
        )
    
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    # Create user with temporary password
    from routers.auth import hash_password
    temp_password = "temp_password_123"  # In production, generate secure temp password
    hashed_password = hash_password(temp_password)
    
    new_user = User(
        organization_id=current_org.id,
        email=user_data.email,
        password_hash=hashed_password,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        role=user_data.role,
        status="inactive"  # User needs to set password first
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Send invitation email with password reset link
    try:
        await send_invitation_email(new_user.email, organization.name, new_user.first_name)
        logger.info(f"Invitation email sent to {new_user.email}")
    except Exception as e:
        logger.warning(f"Failed to send invitation email: {str(e)}")
        # Don't fail the user creation if email fails
    
    return UserResponse(
        id=str(new_user.id),
        email=new_user.email,
        first_name=new_user.first_name,
        last_name=new_user.last_name,
        role=new_user.role,
        status=new_user.status,
        created_at=new_user.created_at
    )

@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    current_org: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """Update user details"""
    
    # Check if user has admin or manager role
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and managers can update users"
        )
    
    # Find user
    user = db.query(User).filter(
        User.id == user_id,
        User.organization_id == current_org.id
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update user
    if user_data.first_name:
        user.first_name = user_data.first_name
    if user_data.last_name:
        user.last_name = user_data.last_name
    if user_data.role:
        user.role = user_data.role
    if user_data.status:
        user.status = user_data.status
    
    user.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(user)
    
    return UserResponse(
        id=str(user.id),
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        role=user.role,
        status=user.status,
        created_at=user.created_at
    )

@router.delete("/users/{user_id}")
async def remove_user(
    user_id: str,
    current_user: User = Depends(get_current_user),
    current_org: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """Remove user from organization"""
    
    # Check if user has admin role
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only organization admins can remove users"
        )
    
    # Find user
    user = db.query(User).filter(
        User.id == user_id,
        User.organization_id == current_org.id
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Don't allow removing the last admin
    if user.role == "admin":
        admin_count = db.query(User).filter(
            User.organization_id == current_org.id,
            User.role == "admin",
            User.status == "active"
        ).count()
        
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove the last admin user"
            )
    
    # Remove user
    db.delete(user)
    db.commit()
    
    return {"message": "User removed successfully"}

@router.get("/settings")
async def get_organization_settings(
    current_user: User = Depends(get_current_user),
    current_org: Organization = Depends(get_current_organization)
):
    """Get organization settings"""
    
    return {
        "organization_id": str(current_org.id),
        "settings": current_org.settings
    }

@router.put("/settings")
async def update_organization_settings(
    settings: dict,
    current_user: User = Depends(get_current_user),
    current_org: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """Update organization settings"""
    
    # Check if user has admin role
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only organization admins can update settings"
        )
    
    # Update settings
    current_org.settings = {**current_org.settings, **settings}
    current_org.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {"message": "Settings updated successfully", "settings": current_org.settings}

@router.get("/usage")
async def get_organization_usage(
    current_user: User = Depends(get_current_user),
    current_org: Organization = Depends(get_current_organization),
    db: Session = Depends(get_db)
):
    """Get organization usage statistics"""
    
    # Get user count
    user_count = db.query(User).filter(
        User.organization_id == current_org.id
    ).count()
    
    # Get document count
    from models.database import Document
    document_count = db.query(Document).filter(
        Document.organization_id == current_org.id
    ).count()
    
    # Get API key count
    api_key_count = db.query(ApiKey).filter(
        ApiKey.organization_id == current_org.id
    ).count()
    
    # Get documents processed this month
    from datetime import datetime, timedelta
    month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    monthly_documents = db.query(Document).filter(
        Document.organization_id == current_org.id,
        Document.created_at >= month_start
    ).count()
    
    return {
        "organization_id": str(current_org.id),
        "users": user_count,
        "documents": document_count,
        "api_keys": api_key_count,
        "monthly_documents": monthly_documents,
        "created_at": current_org.created_at
    }

async def send_invitation_email(email: str, organization_name: str, user_name: str):
    """Send invitation email to new user"""
    try:
        # Get email configuration from environment
        smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        smtp_username = os.getenv("SMTP_USERNAME")
        smtp_password = os.getenv("SMTP_PASSWORD")
        
        if not smtp_username or not smtp_password:
            raise Exception("SMTP credentials not configured")
        
        # Create message
        msg = MIMEMultipart()
        msg['From'] = smtp_username
        msg['To'] = email
        msg['Subject'] = f"Welcome to {organization_name} - NeoCaptured IDP"
        
        # Email body
        body = f"""
        Hello {user_name},
        
        You have been invited to join {organization_name} on NeoCaptured IDP platform.
        
        Your account has been created and you can now access the platform.
        
        To get started:
        1. Visit the platform
        2. Use your email: {email}
        3. Set up your password
        
        Best regards,
        The NeoCaptured Team
        """
        
        msg.attach(MIMEText(body, 'plain'))
        
        # Send email
        server = smtplib.SMTP(smtp_host, smtp_port)
        server.starttls()
        server.login(smtp_username, smtp_password)
        text = msg.as_string()
        server.sendmail(smtp_username, email, text)
        server.quit()
        
    except Exception as e:
        raise Exception(f"Failed to send invitation email: {str(e)}")
