"""
API Integration Templates Router - Ready-to-use integrations for Zapier, Make.com, etc.
Similar to Nanonets integration marketplace
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
import logging
from datetime import datetime
from enum import Enum
from pydantic import BaseModel

from config.database import get_db
from models.database import Document, DocumentExtraction

router = APIRouter()
logger = logging.getLogger(__name__)

# Integration Template Models
class IntegrationType(str, Enum):
    """Integration platform types"""
    ZAPIER = "zapier"
    MAKE = "make"
    N8N = "n8n"
    POWER_AUTOMATE = "power_automate"
    IFTTT = "ifttt"
    CUSTOM = "custom"

class TriggerType(str, Enum):
    """Trigger types for integrations"""
    DOCUMENT_PROCESSED = "document_processed"
    TRAINING_COMPLETED = "training_completed"
    MODEL_ACTIVATED = "model_activated"
    WEBHOOK_RECEIVED = "webhook_received"

class ActionType(str, Enum):
    """Action types for integrations"""
    PROCESS_DOCUMENT = "process_document"
    TRAIN_MODEL = "train_model"
    GET_DOCUMENTS = "get_documents"
    GET_EXTRACTIONS = "get_extractions"

class IntegrationTemplate(BaseModel):
    """Integration template definition"""
    id: str
    name: str
    description: str
    platform: IntegrationType
    category: str  # "productivity", "crm", "accounting", "storage", etc.
    triggers: List[TriggerType]
    actions: List[ActionType]
    config_schema: Dict[str, Any]  # JSON schema for configuration
    setup_instructions: str
    example_workflow: str
    webhook_url: Optional[str] = None
    api_key_required: bool = True
    created_at: datetime = datetime.utcnow()

# Pre-built integration templates
INTEGRATION_TEMPLATES = [
    # Zapier Templates
    IntegrationTemplate(
        id="zapier-gmail-to-processing",
        name="Gmail to Document Processing",
        description="Automatically process documents from Gmail attachments",
        platform=IntegrationType.ZAPIER,
        category="productivity",
        triggers=[TriggerType.WEBHOOK_RECEIVED],
        actions=[ActionType.PROCESS_DOCUMENT],
        config_schema={
            "type": "object",
            "properties": {
                "gmail_filter": {"type": "string", "description": "Gmail filter for emails with attachments"},
                "auto_reply": {"type": "boolean", "description": "Send auto-reply with results"}
            }
        },
        setup_instructions="""
        1. Connect your Gmail account to Zapier
        2. Set up a trigger for new emails with attachments
        3. Add a filter to match your criteria
        4. Connect to NeoVision IDP webhook
        5. Configure auto-reply settings
        """,
        example_workflow="Gmail → Filter → NeoVision IDP → Send Results Email"
    ),
    
    IntegrationTemplate(
        id="zapier-dropbox-to-processing",
        name="Dropbox to Document Processing",
        description="Process documents when added to Dropbox folder",
        platform=IntegrationType.ZAPIER,
        category="storage",
        triggers=[TriggerType.WEBHOOK_RECEIVED],
        actions=[ActionType.PROCESS_DOCUMENT],
        config_schema={
            "type": "object",
            "properties": {
                "dropbox_folder": {"type": "string", "description": "Dropbox folder path to monitor"},
                "file_types": {"type": "array", "items": {"type": "string"}, "description": "File types to process"}
            }
        },
        setup_instructions="""
        1. Connect your Dropbox account to Zapier
        2. Set up a trigger for new files in specific folder
        3. Add file type filter
        4. Connect to NeoVision IDP webhook
        5. Set up notification for results
        """,
        example_workflow="Dropbox → File Filter → NeoVision IDP → Slack Notification"
    ),
    
    IntegrationTemplate(
        id="zapier-salesforce-invoice",
        name="Invoice Processing to Salesforce",
        description="Extract invoice data and create Salesforce records",
        platform=IntegrationType.ZAPIER,
        category="crm",
        triggers=[TriggerType.DOCUMENT_PROCESSED],
        actions=[ActionType.GET_EXTRACTIONS],
        config_schema={
            "type": "object",
            "properties": {
                "salesforce_object": {"type": "string", "description": "Salesforce object to create (e.g., 'Invoice__c')"},
                "field_mapping": {"type": "object", "description": "Map extracted fields to Salesforce fields"}
            }
        },
        setup_instructions="""
        1. Connect Salesforce to Zapier
        2. Set up NeoVision IDP webhook trigger
        3. Map extracted fields to Salesforce fields
        4. Create Salesforce record with extracted data
        5. Set up error handling and notifications
        """,
        example_workflow="NeoVision IDP → Field Mapping → Salesforce → Email Confirmation"
    ),
    
    # Make.com Templates
    IntegrationTemplate(
        id="make-google-drive-processing",
        name="Google Drive Document Processing",
        description="Process documents from Google Drive with Make.com",
        platform=IntegrationType.MAKE,
        category="storage",
        triggers=[TriggerType.WEBHOOK_RECEIVED],
        actions=[ActionType.PROCESS_DOCUMENT],
        config_schema={
            "type": "object",
            "properties": {
                "drive_folder_id": {"type": "string", "description": "Google Drive folder ID to monitor"},
                "processing_delay": {"type": "number", "description": "Delay in seconds before processing"}
            }
        },
        setup_instructions="""
        1. Create Make.com scenario
        2. Add Google Drive trigger for new files
        3. Add delay module (optional)
        4. Add NeoVision IDP HTTP request module
        5. Add notification module for results
        """,
        example_workflow="Google Drive → Delay → NeoVision IDP → Email → Google Sheets"
    ),
    
    IntegrationTemplate(
        id="make-quickbooks-integration",
        name="Invoice Processing to QuickBooks",
        description="Extract invoice data and create QuickBooks transactions",
        platform=IntegrationType.MAKE,
        category="accounting",
        triggers=[TriggerType.DOCUMENT_PROCESSED],
        actions=[ActionType.GET_EXTRACTIONS],
        config_schema={
            "type": "object",
            "properties": {
                "quickbooks_company": {"type": "string", "description": "QuickBooks company ID"},
                "transaction_type": {"type": "string", "description": "Type of transaction to create"},
                "field_mapping": {"type": "object", "description": "Map extracted fields to QuickBooks fields"}
            }
        },
        setup_instructions="""
        1. Connect QuickBooks to Make.com
        2. Set up NeoVision IDP webhook trigger
        3. Parse extracted data
        4. Map fields to QuickBooks format
        5. Create QuickBooks transaction
        6. Send confirmation email
        """,
        example_workflow="NeoVision IDP → Data Parser → QuickBooks → Email → Slack"
    ),
    
    # Custom API Templates
    IntegrationTemplate(
        id="custom-rest-api",
        name="Custom REST API Integration",
        description="Generic REST API integration template",
        platform=IntegrationType.CUSTOM,
        category="custom",
        triggers=[TriggerType.DOCUMENT_PROCESSED, TriggerType.TRAINING_COMPLETED],
        actions=[ActionType.PROCESS_DOCUMENT, ActionType.GET_DOCUMENTS],
        config_schema={
            "type": "object",
            "properties": {
                "api_endpoint": {"type": "string", "description": "API endpoint URL"},
                "authentication": {"type": "string", "description": "Authentication method"},
                "headers": {"type": "object", "description": "Custom headers"},
                "payload_format": {"type": "string", "description": "Payload format (JSON, XML, etc.)"}
            }
        },
        setup_instructions="""
        1. Configure your API endpoint
        2. Set up authentication (API key, OAuth, etc.)
        3. Define request/response format
        4. Test the integration
        5. Set up monitoring and error handling
        """,
        example_workflow="Custom API → NeoVision IDP → Custom Response Handler"
    )
]

# API Endpoints
@router.get("/integration-templates")
async def list_integration_templates(
    platform: Optional[IntegrationType] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """List available integration templates"""
    try:
        templates = []
        for template in INTEGRATION_TEMPLATES:
            # Filter by platform if specified
            if platform and template.platform != platform:
                continue
            
            # Filter by category if specified
            if category and template.category != category:
                continue
            
            templates.append({
                "id": template.id,
                "name": template.name,
                "description": template.description,
                "platform": template.platform,
                "category": template.category,
                "triggers": template.triggers,
                "actions": template.actions,
                "api_key_required": template.api_key_required,
                "webhook_url": template.webhook_url
            })
        
        return templates
        
    except Exception as e:
        logger.error(f"Error listing integration templates: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list integration templates: {str(e)}"
        )

@router.get("/integration-templates/{template_id}")
async def get_integration_template(
    template_id: str,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get detailed integration template"""
    try:
        template = next((t for t in INTEGRATION_TEMPLATES if t.id == template_id), None)
        if not template:
            raise HTTPException(
                status_code=404,
                detail="Integration template not found"
            )
        
        return {
            "id": template.id,
            "name": template.name,
            "description": template.description,
            "platform": template.platform,
            "category": template.category,
            "triggers": template.triggers,
            "actions": template.actions,
            "config_schema": template.config_schema,
            "setup_instructions": template.setup_instructions,
            "example_workflow": template.example_workflow,
            "webhook_url": template.webhook_url,
            "api_key_required": template.api_key_required
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting integration template: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get integration template: {str(e)}"
        )

@router.post("/integration-templates/{template_id}/generate-config")
async def generate_integration_config(
    template_id: str,
    user_config: Dict[str, Any],
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Generate integration configuration from template"""
    try:
        template = next((t for t in INTEGRATION_TEMPLATES if t.id == template_id), None)
        if not template:
            raise HTTPException(
                status_code=404,
                detail="Integration template not found"
            )
        
        # Generate platform-specific configuration
        config = {
            "template_id": template_id,
            "platform": template.platform,
            "user_config": user_config,
            "generated_at": datetime.utcnow().isoformat()
        }
        
        if template.platform == IntegrationType.ZAPIER:
            config["zapier_config"] = generate_zapier_config(template, user_config)
        elif template.platform == IntegrationType.MAKE:
            config["make_config"] = generate_make_config(template, user_config)
        elif template.platform == IntegrationType.CUSTOM:
            config["custom_config"] = generate_custom_config(template, user_config)
        
        return config
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating integration config: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate integration config: {str(e)}"
        )

def generate_zapier_config(template: IntegrationTemplate, user_config: Dict[str, Any]) -> Dict[str, Any]:
    """Generate Zapier-specific configuration"""
    return {
        "webhook_url": f"https://hooks.zapier.com/hooks/catch/{user_config.get('zapier_webhook_id')}/",
        "trigger_config": {
            "event": "document.processed",
            "filters": user_config.get("filters", {})
        },
        "action_config": {
            "method": "POST",
            "headers": {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {user_config.get('api_key')}"
            }
        }
    }

def generate_make_config(template: IntegrationTemplate, user_config: Dict[str, Any]) -> Dict[str, Any]:
    """Generate Make.com-specific configuration"""
    return {
        "scenario_config": {
            "name": f"NeoVision IDP - {template.name}",
            "modules": [
                {
                    "type": "webhook",
                    "config": {
                        "url": user_config.get("webhook_url"),
                        "method": "POST"
                    }
                },
                {
                    "type": "http_request",
                    "config": {
                        "url": "https://api.neovision.com/process-document",
                        "method": "POST",
                        "headers": {
                            "Authorization": f"Bearer {user_config.get('api_key')}"
                        }
                    }
                }
            ]
        }
    }

def generate_custom_config(template: IntegrationTemplate, user_config: Dict[str, Any]) -> Dict[str, Any]:
    """Generate custom API configuration"""
    return {
        "api_config": {
            "endpoint": user_config.get("api_endpoint"),
            "authentication": user_config.get("authentication"),
            "headers": user_config.get("headers", {}),
            "payload_format": user_config.get("payload_format", "json")
        },
        "webhook_config": {
            "url": user_config.get("webhook_url"),
            "events": template.triggers,
            "secret": user_config.get("webhook_secret")
        }
    }

@router.get("/integration-platforms")
async def list_integration_platforms() -> List[Dict[str, Any]]:
    """List supported integration platforms"""
    return [
        {
            "id": "zapier",
            "name": "Zapier",
            "description": "Connect 5000+ apps with easy automation",
            "website": "https://zapier.com",
            "templates_count": len([t for t in INTEGRATION_TEMPLATES if t.platform == IntegrationType.ZAPIER])
        },
        {
            "id": "make",
            "name": "Make.com",
            "description": "Visual automation platform for complex workflows",
            "website": "https://make.com",
            "templates_count": len([t for t in INTEGRATION_TEMPLATES if t.platform == IntegrationType.MAKE])
        },
        {
            "id": "n8n",
            "name": "n8n",
            "description": "Open-source workflow automation",
            "website": "https://n8n.io",
            "templates_count": 0
        },
        {
            "id": "power_automate",
            "name": "Microsoft Power Automate",
            "description": "Microsoft's workflow automation platform",
            "website": "https://powerautomate.microsoft.com",
            "templates_count": 0
        },
        {
            "id": "custom",
            "name": "Custom API",
            "description": "Build your own integration using REST API",
            "website": None,
            "templates_count": len([t for t in INTEGRATION_TEMPLATES if t.platform == IntegrationType.CUSTOM])
        }
    ]
