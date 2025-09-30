"""
Integration Dashboard Router - Central management for all integrations
Similar to Nanonets integration management interface
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
import logging
from datetime import datetime, timedelta
from enum import Enum
from pydantic import BaseModel

from config.database import get_db
from models.database import Document, DocumentExtraction

router = APIRouter()
logger = logging.getLogger(__name__)

# Import integration routers
from routers.email_integration import email_watchers
from routers.folder_monitoring import folder_watchers
from routers.webhook_system import webhook_integrations, webhook_deliveries

class IntegrationStatus(str, Enum):
    """Integration status types"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"
    PENDING = "pending"

class IntegrationType(str, Enum):
    """Integration types"""
    EMAIL = "email"
    FOLDER = "folder"
    WEBHOOK = "webhook"
    API = "api"

class IntegrationSummary(BaseModel):
    """Integration summary for dashboard"""
    id: str
    name: str
    type: IntegrationType
    status: IntegrationStatus
    last_activity: Optional[datetime] = None
    documents_processed: int = 0
    error_count: int = 0
    created_at: datetime
    config_summary: Dict[str, Any] = {}

# API Endpoints
@router.get("/dashboard/overview")
async def get_integration_overview(
    user_id: str,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get integration dashboard overview"""
    try:
        # Count integrations by type
        email_count = len([w for w in email_watchers.values() if w.get("user_id") == user_id])
        folder_count = len([w for w in folder_watchers.values() if w.get("user_id") == user_id])
        webhook_count = len([w for w in webhook_integrations.values() if w.user_id == user_id])
        
        # Get recent activity
        recent_documents = db.query(Document).filter(
            Document.user_id == user_id,
            Document.created_at >= datetime.utcnow() - timedelta(days=7)
        ).count()
        
        # Get processing stats
        total_documents = db.query(Document).filter(
            Document.user_id == user_id
        ).count()
        
        successful_extractions = db.query(DocumentExtraction).join(Document).filter(
            Document.user_id == user_id,
            DocumentExtraction.confidence >= 0.7
        ).count()
        
        return {
            "summary": {
                "total_integrations": email_count + folder_count + webhook_count,
                "active_integrations": email_count + folder_count + webhook_count,  # Simplified
                "documents_processed_7d": recent_documents,
                "total_documents": total_documents,
                "success_rate": (successful_extractions / total_documents * 100) if total_documents > 0 else 0
            },
            "integrations_by_type": {
                "email": email_count,
                "folder": folder_count,
                "webhook": webhook_count,
                "api": 0  # API integrations are managed separately
            },
            "recent_activity": await get_recent_activity(user_id, db)
        }
        
    except Exception as e:
        logger.error(f"Error getting integration overview: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get integration overview: {str(e)}"
        )

@router.get("/dashboard/integrations")
async def list_all_integrations(
    user_id: str,
    integration_type: Optional[IntegrationType] = None,
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """List all user integrations"""
    try:
        integrations = []
        
        # Email integrations
        if not integration_type or integration_type == IntegrationType.EMAIL:
            for integration_id, watcher_info in email_watchers.items():
                if watcher_info.get("user_id") == user_id:
                    integrations.append({
                        "id": integration_id,
                        "name": f"Email Integration {integration_id[:8]}",
                        "type": IntegrationType.EMAIL,
                        "status": IntegrationStatus.ACTIVE if watcher_info.get("running", False) else IntegrationStatus.INACTIVE,
                        "last_activity": None,  # You can track this
                        "documents_processed": 0,  # You can track this
                        "error_count": 0,  # You can track this
                        "created_at": watcher_info.get("created_at", datetime.utcnow()),
                        "config_summary": {
                            "email_type": "IMAP",
                            "check_interval": "5 minutes"
                        }
                    })
        
        # Folder integrations
        if not integration_type or integration_type == IntegrationType.FOLDER:
            for integration_id, watcher_info in folder_watchers.items():
                if watcher_info.get("user_id") == user_id:
                    integrations.append({
                        "id": integration_id,
                        "name": f"Folder Monitor {integration_id[:8]}",
                        "type": IntegrationType.FOLDER,
                        "status": IntegrationStatus.ACTIVE if watcher_info["watcher"].running else IntegrationStatus.INACTIVE,
                        "last_activity": None,
                        "documents_processed": 0,
                        "error_count": 0,
                        "created_at": watcher_info.get("created_at", datetime.utcnow()),
                        "config_summary": {
                            "folder_path": watcher_info["config"].folder_path,
                            "recursive": watcher_info["config"].recursive
                        }
                    })
        
        # Webhook integrations
        if not integration_type or integration_type == IntegrationType.WEBHOOK:
            for webhook_id, webhook in webhook_integrations.items():
                if webhook.user_id == user_id:
                    integrations.append({
                        "id": webhook_id,
                        "name": webhook.name,
                        "type": IntegrationType.WEBHOOK,
                        "status": IntegrationStatus.ACTIVE if webhook.config.enabled else IntegrationStatus.INACTIVE,
                        "last_activity": None,
                        "documents_processed": 0,
                        "error_count": 0,
                        "created_at": webhook.created_at,
                        "config_summary": {
                            "url": webhook.config.url,
                            "events": len(webhook.config.events)
                        }
                    })
        
        # Sort by created_at desc
        integrations.sort(key=lambda x: x["created_at"], reverse=True)
        
        return integrations
        
    except Exception as e:
        logger.error(f"Error listing integrations: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list integrations: {str(e)}"
        )

@router.get("/dashboard/integrations/{integration_id}")
async def get_integration_details(
    integration_id: str,
    user_id: str,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get detailed integration information"""
    try:
        # Check email integrations
        if integration_id in email_watchers:
            watcher_info = email_watchers[integration_id]
            if watcher_info.get("user_id") == user_id:
                return {
                    "id": integration_id,
                    "type": IntegrationType.EMAIL,
                    "name": f"Email Integration {integration_id[:8]}",
                    "status": IntegrationStatus.ACTIVE if watcher_info.get("running", False) else IntegrationStatus.INACTIVE,
                    "config": {
                        "email_type": "IMAP",
                        "host": "configured",
                        "folder": "INBOX",
                        "check_interval": "5 minutes"
                    },
                    "stats": {
                        "documents_processed": 0,
                        "last_activity": None,
                        "error_count": 0
                    },
                    "logs": []  # You can implement logging
                }
        
        # Check folder integrations
        if integration_id in folder_watchers:
            watcher_info = folder_watchers[integration_id]
            if watcher_info.get("user_id") == user_id:
                return {
                    "id": integration_id,
                    "type": IntegrationType.FOLDER,
                    "name": f"Folder Monitor {integration_id[:8]}",
                    "status": IntegrationStatus.ACTIVE if watcher_info["watcher"].running else IntegrationStatus.INACTIVE,
                    "config": {
                        "folder_path": watcher_info["config"].folder_path,
                        "recursive": watcher_info["config"].recursive,
                        "file_patterns": watcher_info["config"].file_patterns,
                        "processing_delay": watcher_info["config"].processing_delay_seconds
                    },
                    "stats": {
                        "documents_processed": 0,
                        "last_activity": None,
                        "error_count": 0
                    },
                    "logs": []
                }
        
        # Check webhook integrations
        if integration_id in webhook_integrations:
            webhook = webhook_integrations[integration_id]
            if webhook.user_id == user_id:
                # Get delivery stats
                deliveries = [d for d in webhook_deliveries if d.webhook_id == integration_id]
                successful_deliveries = len([d for d in deliveries if d.status == "delivered"])
                failed_deliveries = len([d for d in deliveries if d.status == "failed"])
                
                return {
                    "id": integration_id,
                    "type": IntegrationType.WEBHOOK,
                    "name": webhook.name,
                    "status": IntegrationStatus.ACTIVE if webhook.config.enabled else IntegrationStatus.INACTIVE,
                    "config": {
                        "url": webhook.config.url,
                        "events": webhook.config.events,
                        "timeout": webhook.config.timeout_seconds,
                        "retry_attempts": webhook.config.retry_attempts
                    },
                    "stats": {
                        "documents_processed": successful_deliveries,
                        "last_activity": deliveries[-1].last_attempt if deliveries else None,
                        "error_count": failed_deliveries
                    },
                    "logs": deliveries[-10:] if deliveries else []  # Last 10 deliveries
                }
        
        raise HTTPException(
            status_code=404,
            detail="Integration not found"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting integration details: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get integration details: {str(e)}"
        )

@router.post("/dashboard/integrations/{integration_id}/toggle")
async def toggle_integration(
    integration_id: str,
    user_id: str,
    enabled: bool,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Enable/disable integration"""
    try:
        # Check email integrations
        if integration_id in email_watchers:
            watcher_info = email_watchers[integration_id]
            if watcher_info.get("user_id") == user_id:
                # Toggle email watcher
                if enabled:
                    # Start watcher (you'd need to implement this)
                    pass
                else:
                    # Stop watcher
                    if "task" in watcher_info:
                        watcher_info["task"].cancel()
                
                return {
                    "status": "success",
                    "message": f"Email integration {'enabled' if enabled else 'disabled'}"
                }
        
        # Check folder integrations
        if integration_id in folder_watchers:
            watcher_info = folder_watchers[integration_id]
            if watcher_info.get("user_id") == user_id:
                if enabled:
                    watcher_info["watcher"].start_watching()
                else:
                    watcher_info["watcher"].stop_watching()
                
                return {
                    "status": "success",
                    "message": f"Folder integration {'enabled' if enabled else 'disabled'}"
                }
        
        # Check webhook integrations
        if integration_id in webhook_integrations:
            webhook = webhook_integrations[integration_id]
            if webhook.user_id == user_id:
                webhook.config.enabled = enabled
                
                return {
                    "status": "success",
                    "message": f"Webhook integration {'enabled' if enabled else 'disabled'}"
                }
        
        raise HTTPException(
            status_code=404,
            detail="Integration not found"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling integration: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to toggle integration: {str(e)}"
        )

@router.get("/dashboard/activity")
async def get_recent_activity(
    user_id: str,
    limit: int = 20,
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """Get recent integration activity"""
    try:
        activities = []
        
        # Get recent documents
        recent_documents = db.query(Document).filter(
            Document.user_id == user_id
        ).order_by(Document.created_at.desc()).limit(limit).all()
        
        for doc in recent_documents:
            activities.append({
                "id": str(doc.id),
                "type": "document_processed",
                "message": f"Document '{doc.name}' processed successfully",
                "timestamp": doc.created_at,
                "metadata": {
                    "filename": doc.name,
                    "file_size": doc.file_size,
                    "file_type": doc.file_type
                }
            })
        
        # Get recent webhook deliveries
        user_webhooks = [w for w in webhook_integrations.values() if w.user_id == user_id]
        for webhook in user_webhooks:
            webhook_id = next(k for k, v in webhook_integrations.items() if v == webhook)
            deliveries = [d for d in webhook_deliveries if d.webhook_id == webhook_id]
            
            for delivery in deliveries[-5:]:  # Last 5 deliveries per webhook
                activities.append({
                    "id": str(delivery.webhook_id),
                    "type": "webhook_delivery",
                    "message": f"Webhook {'delivered' if delivery.status == 'delivered' else 'failed'}",
                    "timestamp": delivery.last_attempt or delivery.created_at,
                    "metadata": {
                        "event_type": delivery.event_type,
                        "status": delivery.status,
                        "attempts": delivery.attempts
                    }
                })
        
        # Sort by timestamp desc and limit
        activities.sort(key=lambda x: x["timestamp"], reverse=True)
        return activities[:limit]
        
    except Exception as e:
        logger.error(f"Error getting recent activity: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get recent activity: {str(e)}"
        )

@router.get("/dashboard/stats")
async def get_integration_stats(
    user_id: str,
    days: int = 30,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get integration statistics"""
    try:
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Document processing stats
        total_documents = db.query(Document).filter(
            Document.user_id == user_id,
            Document.created_at >= start_date
        ).count()
        
        successful_extractions = db.query(DocumentExtraction).join(Document).filter(
            Document.user_id == user_id,
            Document.created_at >= start_date,
            DocumentExtraction.confidence >= 0.7
        ).count()
        
        # Webhook delivery stats
        user_webhooks = [w for w in webhook_integrations.values() if w.user_id == user_id]
        webhook_ids = [k for k, v in webhook_integrations.items() if v in user_webhooks]
        
        webhook_deliveries_count = len([
            d for d in webhook_deliveries 
            if d.webhook_id in webhook_ids and d.created_at >= start_date
        ])
        
        successful_webhooks = len([
            d for d in webhook_deliveries 
            if d.webhook_id in webhook_ids and d.status == "delivered" and d.created_at >= start_date
        ])
        
        return {
            "period_days": days,
            "documents": {
                "total_processed": total_documents,
                "successful_extractions": successful_extractions,
                "success_rate": (successful_extractions / total_documents * 100) if total_documents > 0 else 0
            },
            "webhooks": {
                "total_deliveries": webhook_deliveries_count,
                "successful_deliveries": successful_webhooks,
                "success_rate": (successful_webhooks / webhook_deliveries_count * 100) if webhook_deliveries_count > 0 else 0
            },
            "integrations": {
                "total_active": len([w for w in email_watchers.values() if w.get("user_id") == user_id]) +
                              len([w for w in folder_watchers.values() if w.get("user_id") == user_id]) +
                              len([w for w in webhook_integrations.values() if w.user_id == user_id])
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting integration stats: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get integration stats: {str(e)}"
        )
