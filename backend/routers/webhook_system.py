"""
Webhook System Router - Outbound notifications for processing events
Similar to Nanonets webhook capabilities
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
import asyncio
import logging
import aiohttp
import json
import uuid
from datetime import datetime
from enum import Enum
from pydantic import BaseModel

from config.database import get_db
from models.database import Document, DocumentExtraction

router = APIRouter()
logger = logging.getLogger(__name__)

# Webhook Models
class WebhookEvent(str, Enum):
    """Webhook event types"""
    DOCUMENT_PROCESSED = "document.processed"
    DOCUMENT_FAILED = "document.failed"
    TRAINING_COMPLETED = "training.completed"
    TRAINING_FAILED = "training.failed"
    MODEL_ACTIVATED = "model.activated"

class WebhookConfig(BaseModel):
    """Webhook configuration"""
    url: str
    events: List[WebhookEvent]
    secret: Optional[str] = None
    timeout_seconds: int = 30
    retry_attempts: int = 3
    retry_delay_seconds: int = 5
    enabled: bool = True

class WebhookIntegration(BaseModel):
    """Webhook integration settings"""
    name: str
    config: WebhookConfig
    user_id: str
    organization_id: str
    created_at: datetime = datetime.utcnow()

class WebhookDelivery(BaseModel):
    """Webhook delivery record"""
    webhook_id: str
    event_type: str
    payload: Dict[str, Any]
    status: str  # "pending", "delivered", "failed"
    attempts: int = 0
    last_attempt: Optional[datetime] = None
    response_status: Optional[int] = None
    response_body: Optional[str] = None
    created_at: datetime = datetime.utcnow()

# Global webhook storage (in production, use database)
webhook_integrations: Dict[str, WebhookIntegration] = {}
webhook_deliveries: List[WebhookDelivery] = []

class WebhookSender:
    """Webhook delivery system"""
    
    def __init__(self):
        self.session = None
    
    async def get_session(self):
        """Get or create aiohttp session"""
        if self.session is None or self.session.closed:
            timeout = aiohttp.ClientTimeout(total=30)
            self.session = aiohttp.ClientSession(timeout=timeout)
        return self.session
    
    async def send_webhook(self, webhook: WebhookIntegration, event_type: str, payload: Dict[str, Any]) -> bool:
        """Send webhook notification"""
        try:
            if not webhook.config.enabled:
                return False
            
            if event_type not in webhook.config.events:
                return False
            
            # Prepare headers
            headers = {
                "Content-Type": "application/json",
                "User-Agent": "NeoVision-IDP-Webhook/1.0",
                "X-Webhook-Event": event_type,
                "X-Webhook-Timestamp": datetime.utcnow().isoformat()
            }
            
            # Add signature if secret is provided
            if webhook.config.secret:
                import hmac
                import hashlib
                payload_str = json.dumps(payload, sort_keys=True)
                signature = hmac.new(
                    webhook.config.secret.encode(),
                    payload_str.encode(),
                    hashlib.sha256
                ).hexdigest()
                headers["X-Webhook-Signature"] = f"sha256={signature}"
            
            # Send webhook
            session = await self.get_session()
            async with session.post(
                webhook.config.url,
                json=payload,
                headers=headers
            ) as response:
                response_body = await response.text()
                
                if response.status >= 200 and response.status < 300:
                    logger.info(f"Webhook delivered successfully: {webhook.config.url}")
                    return True
                else:
                    logger.warning(f"Webhook delivery failed: {response.status} - {response_body}")
                    return False
                    
        except Exception as e:
            logger.error(f"Error sending webhook: {str(e)}")
            return False
    
    async def close(self):
        """Close aiohttp session"""
        if self.session and not self.session.closed:
            await self.session.close()

# Global webhook sender
webhook_sender = WebhookSender()

async def trigger_webhook(event_type: str, payload: Dict[str, Any], user_id: str = None, org_id: str = None):
    """Trigger webhooks for an event"""
    try:
        # Find matching webhooks
        matching_webhooks = []
        for webhook_id, webhook in webhook_integrations.items():
            if event_type in webhook.config.events:
                # Filter by user/org if provided
                if user_id and webhook.user_id != user_id:
                    continue
                if org_id and webhook.organization_id != org_id:
                    continue
                matching_webhooks.append((webhook_id, webhook))
        
        # Send webhooks
        for webhook_id, webhook in matching_webhooks:
            try:
                success = await webhook_sender.send_webhook(webhook, event_type, payload)
                
                # Record delivery
                delivery = WebhookDelivery(
                    webhook_id=webhook_id,
                    event_type=event_type,
                    payload=payload,
                    status="delivered" if success else "failed",
                    attempts=1,
                    last_attempt=datetime.utcnow(),
                    response_status=200 if success else 500
                )
                webhook_deliveries.append(delivery)
                
            except Exception as e:
                logger.error(f"Error sending webhook {webhook_id}: {str(e)}")
                
                # Record failed delivery
                delivery = WebhookDelivery(
                    webhook_id=webhook_id,
                    event_type=event_type,
                    payload=payload,
                    status="failed",
                    attempts=1,
                    last_attempt=datetime.utcnow(),
                    response_body=str(e)
                )
                webhook_deliveries.append(delivery)
        
        logger.info(f"Triggered {len(matching_webhooks)} webhooks for event: {event_type}")
        
    except Exception as e:
        logger.error(f"Error triggering webhooks: {str(e)}")

# API Endpoints
@router.post("/webhooks")
async def create_webhook(
    webhook: WebhookIntegration,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Create new webhook integration"""
    try:
        webhook_id = str(uuid.uuid4())
        webhook_integrations[webhook_id] = webhook
        
        return {
            "webhook_id": webhook_id,
            "status": "created",
            "message": "Webhook integration created successfully"
        }
        
    except Exception as e:
        logger.error(f"Error creating webhook: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create webhook: {str(e)}"
        )

@router.get("/webhooks")
async def list_webhooks(
    user_id: str,
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """List user's webhook integrations"""
    try:
        webhooks = []
        for webhook_id, webhook in webhook_integrations.items():
            if webhook.user_id == user_id:
                webhooks.append({
                    "webhook_id": webhook_id,
                    "name": webhook.name,
                    "url": webhook.config.url,
                    "events": webhook.config.events,
                    "enabled": webhook.config.enabled,
                    "created_at": webhook.created_at.isoformat()
                })
        
        return webhooks
        
    except Exception as e:
        logger.error(f"Error listing webhooks: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list webhooks: {str(e)}"
        )

@router.post("/webhooks/{webhook_id}/test")
async def test_webhook(
    webhook_id: str,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Test webhook integration"""
    try:
        if webhook_id not in webhook_integrations:
            raise HTTPException(
                status_code=404,
                detail="Webhook not found"
            )
        
        webhook = webhook_integrations[webhook_id]
        
        # Send test payload
        test_payload = {
            "event": "webhook.test",
            "message": "This is a test webhook from NeoVision IDP",
            "timestamp": datetime.utcnow().isoformat()
        }
        
        success = await webhook_sender.send_webhook(webhook, "webhook.test", test_payload)
        
        return {
            "status": "success" if success else "failed",
            "message": "Webhook test completed",
            "url": webhook.config.url
        }
        
    except Exception as e:
        logger.error(f"Error testing webhook: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Webhook test failed: {str(e)}"
        )

@router.delete("/webhooks/{webhook_id}")
async def delete_webhook(
    webhook_id: str,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Delete webhook integration"""
    try:
        if webhook_id not in webhook_integrations:
            raise HTTPException(
                status_code=404,
                detail="Webhook not found"
            )
        
        del webhook_integrations[webhook_id]
        
        return {
            "status": "deleted",
            "message": f"Webhook {webhook_id} deleted successfully"
        }
        
    except Exception as e:
        logger.error(f"Error deleting webhook: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete webhook: {str(e)}"
        )

@router.get("/webhooks/{webhook_id}/deliveries")
async def get_webhook_deliveries(
    webhook_id: str,
    limit: int = 50,
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """Get webhook delivery history"""
    try:
        deliveries = []
        for delivery in webhook_deliveries:
            if delivery.webhook_id == webhook_id:
                deliveries.append({
                    "event_type": delivery.event_type,
                    "status": delivery.status,
                    "attempts": delivery.attempts,
                    "last_attempt": delivery.last_attempt.isoformat() if delivery.last_attempt else None,
                    "response_status": delivery.response_status,
                    "response_body": delivery.response_body,
                    "created_at": delivery.created_at.isoformat()
                })
        
        # Sort by created_at desc and limit
        deliveries.sort(key=lambda x: x["created_at"], reverse=True)
        return deliveries[:limit]
        
    except Exception as e:
        logger.error(f"Error getting webhook deliveries: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get webhook deliveries: {str(e)}"
        )

# Integration with other systems
async def notify_document_processed(document: Document, extraction: DocumentExtraction):
    """Notify webhooks when document is processed"""
    payload = {
        "event": "document.processed",
        "document": {
            "id": str(document.id),
            "name": document.name,
            "file_size": document.file_size,
            "file_type": document.file_type,
            "created_at": document.created_at.isoformat()
        },
        "extraction": {
            "id": str(extraction.id),
            "model_name": extraction.model_name,
            "confidence": float(extraction.confidence),
            "fields": extraction.fields_json,
            "processing_time_ms": extraction.processing_time_ms,
            "created_at": extraction.created_at.isoformat()
        }
    }
    
    await trigger_webhook(
        WebhookEvent.DOCUMENT_PROCESSED,
        payload,
        document.user_id,
        document.organization_id
    )

async def notify_training_completed(model_name: str, user_id: str, org_id: str):
    """Notify webhooks when training is completed"""
    payload = {
        "event": "training.completed",
        "model_name": model_name,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    await trigger_webhook(
        WebhookEvent.TRAINING_COMPLETED,
        payload,
        user_id,
        org_id
    )
