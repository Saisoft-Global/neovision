"""
Audit logging service
Tracks all user actions and security events
"""
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, DateTime, Text, JSON
from app.database import Base
import json

class AuditLog(Base):
    """
    Audit log table for tracking user actions
    """
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    user_id = Column(String, index=True)
    action = Column(String, index=True)
    resource_type = Column(String, index=True)
    resource_id = Column(String)
    ip_address = Column(String)
    user_agent = Column(String)
    status = Column(String)  # success, failure, error
    details = Column(JSON)
    error_message = Column(Text, nullable=True)

class AuditService:
    """
    Service for logging audit events
    """
    
    # Action types
    ACTION_LOGIN = "login"
    ACTION_LOGOUT = "logout"
    ACTION_LOGIN_FAILED = "login_failed"
    ACTION_SIGNUP = "signup"
    ACTION_PASSWORD_CHANGE = "password_change"
    ACTION_PASSWORD_RESET = "password_reset"
    ACTION_CREATE = "create"
    ACTION_READ = "read"
    ACTION_UPDATE = "update"
    ACTION_DELETE = "delete"
    ACTION_DOWNLOAD = "download"
    ACTION_UPLOAD = "upload"
    ACTION_SHARE = "share"
    ACTION_PERMISSION_CHANGE = "permission_change"
    ACTION_CONFIG_CHANGE = "config_change"
    
    # Resource types
    RESOURCE_USER = "user"
    RESOURCE_DOCUMENT = "document"
    RESOURCE_AGENT = "agent"
    RESOURCE_WORKFLOW = "workflow"
    RESOURCE_KNOWLEDGE = "knowledge"
    RESOURCE_API_KEY = "api_key"
    RESOURCE_SETTINGS = "settings"
    
    # Status types
    STATUS_SUCCESS = "success"
    STATUS_FAILURE = "failure"
    STATUS_ERROR = "error"
    
    @staticmethod
    def log(
        db: Session,
        user_id: Optional[str],
        action: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        status: str = STATUS_SUCCESS,
        details: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None
    ):
        """
        Log an audit event
        
        Args:
            db: Database session
            user_id: ID of user performing action
            action: Action being performed
            resource_type: Type of resource being accessed
            resource_id: ID of specific resource
            ip_address: Client IP address
            user_agent: Client user agent
            status: Status of action (success/failure/error)
            details: Additional details as dictionary
            error_message: Error message if status is error
        """
        try:
            audit_log = AuditLog(
                user_id=user_id,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                ip_address=ip_address,
                user_agent=user_agent,
                status=status,
                details=details or {},
                error_message=error_message
            )
            
            db.add(audit_log)
            db.commit()
        except Exception as e:
            # Don't let audit logging failures break the application
            print(f"Failed to log audit event: {str(e)}")
            db.rollback()
    
    @staticmethod
    def log_login(
        db: Session,
        user_id: str,
        ip_address: str,
        user_agent: str,
        success: bool,
        error_message: Optional[str] = None
    ):
        """Log a login attempt"""
        AuditService.log(
            db=db,
            user_id=user_id,
            action=AuditService.ACTION_LOGIN if success else AuditService.ACTION_LOGIN_FAILED,
            resource_type=AuditService.RESOURCE_USER,
            resource_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            status=AuditService.STATUS_SUCCESS if success else AuditService.STATUS_FAILURE,
            error_message=error_message
        )
    
    @staticmethod
    def log_data_access(
        db: Session,
        user_id: str,
        resource_type: str,
        resource_id: str,
        action: str,
        ip_address: str,
        details: Optional[Dict[str, Any]] = None
    ):
        """Log data access"""
        AuditService.log(
            db=db,
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            ip_address=ip_address,
            status=AuditService.STATUS_SUCCESS,
            details=details
        )
    
    @staticmethod
    def log_security_event(
        db: Session,
        user_id: Optional[str],
        event_type: str,
        ip_address: str,
        details: Dict[str, Any]
    ):
        """Log a security event"""
        AuditService.log(
            db=db,
            user_id=user_id,
            action=event_type,
            resource_type="security",
            ip_address=ip_address,
            status=AuditService.STATUS_SUCCESS,
            details=details
        )
