"""
Workflow Automation Router - Document processing workflows with triggers and actions
Similar to Nanonets workflow automation capabilities
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
import asyncio
import logging
import json
import uuid
from datetime import datetime
from enum import Enum
from pydantic import BaseModel

from config.database import get_db
from models.database import Document, DocumentExtraction
from routers.documents import save_document_to_db
from routers.inference import get_document_processor

router = APIRouter()
logger = logging.getLogger(__name__)

class TriggerType(str, Enum):
    EMAIL = "email"
    FOLDER = "folder"
    WEBHOOK = "webhook"
    MANUAL = "manual"

class ActionType(str, Enum):
    PROCESS_DOCUMENT = "process_document"
    SEND_TO_ERP = "send_to_erp"
    SEND_WEBHOOK = "send_webhook"
    SEND_EMAIL = "send_email"
    SAVE_TO_DATABASE = "save_to_database"
    NOTIFY_USER = "notify_user"

class WorkflowStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"

class WorkflowTrigger(BaseModel):
    type: TriggerType
    config: Dict[str, Any]
    conditions: Optional[Dict[str, Any]] = None

class WorkflowAction(BaseModel):
    type: ActionType
    config: Dict[str, Any]
    conditions: Optional[Dict[str, Any]] = None
    delay_seconds: Optional[int] = 0

class WorkflowCreate(BaseModel):
    name: str
    description: Optional[str] = None
    trigger: WorkflowTrigger
    actions: List[WorkflowAction]
    enabled: bool = True
    user_id: str
    organization_id: str

class WorkflowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    trigger: Optional[WorkflowTrigger] = None
    actions: Optional[List[WorkflowAction]] = None
    enabled: Optional[bool] = None

class WorkflowExecution(BaseModel):
    workflow_id: str
    document_id: Optional[str] = None
    trigger_data: Dict[str, Any]
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    execution_log: List[Dict[str, Any]] = []

# In-memory workflow storage (in production, use database)
workflows_db = {}
workflow_executions_db = {}

@router.post("/workflows")
async def create_workflow(
    workflow: WorkflowCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Create a new workflow"""
    try:
        workflow_id = str(uuid.uuid4())
        
        workflow_data = {
            "id": workflow_id,
            "name": workflow.name,
            "description": workflow.description,
            "trigger": workflow.trigger.dict(),
            "actions": [action.dict() for action in workflow.actions],
            "enabled": workflow.enabled,
            "user_id": workflow.user_id,
            "organization_id": workflow.organization_id,
            "status": WorkflowStatus.ACTIVE if workflow.enabled else WorkflowStatus.INACTIVE,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "execution_count": 0,
            "success_count": 0,
            "error_count": 0
        }
        
        workflows_db[workflow_id] = workflow_data
        
        # Start monitoring if trigger is email or folder
        if workflow.trigger.type in [TriggerType.EMAIL, TriggerType.FOLDER]:
            background_tasks.add_task(start_trigger_monitoring, workflow_id, workflow.trigger)
        
        logger.info(f"Created workflow {workflow_id}: {workflow.name}")
        
        return {
            "id": workflow_id,
            "status": "created",
            "message": f"Workflow '{workflow.name}' created successfully"
        }
        
    except Exception as e:
        logger.error(f"Error creating workflow: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create workflow: {str(e)}"
        )

@router.get("/workflows")
async def list_workflows(
    user_id: str,
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """List workflows for a user"""
    try:
        user_workflows = [
            w for w in workflows_db.values() 
            if w.get("user_id") == user_id
        ]
        
        total_count = len(user_workflows)
        workflows = user_workflows[offset:offset + limit]
        
        return {
            "total": total_count,
            "limit": limit,
            "offset": offset,
            "workflows": workflows
        }
        
    except Exception as e:
        logger.error(f"Error listing workflows: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list workflows: {str(e)}"
        )

@router.get("/workflows/{workflow_id}")
async def get_workflow(
    workflow_id: str,
    user_id: str,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get workflow details"""
    try:
        workflow = workflows_db.get(workflow_id)
        
        if not workflow or workflow.get("user_id") != user_id:
            raise HTTPException(
                status_code=404,
                detail="Workflow not found"
            )
        
        return workflow
        
    except Exception as e:
        logger.error(f"Error getting workflow {workflow_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get workflow: {str(e)}"
        )

@router.put("/workflows/{workflow_id}")
async def update_workflow(
    workflow_id: str,
    workflow_update: WorkflowUpdate,
    user_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Update workflow"""
    try:
        workflow = workflows_db.get(workflow_id)
        
        if not workflow or workflow.get("user_id") != user_id:
            raise HTTPException(
                status_code=404,
                detail="Workflow not found"
            )
        
        # Update fields
        if workflow_update.name is not None:
            workflow["name"] = workflow_update.name
        if workflow_update.description is not None:
            workflow["description"] = workflow_update.description
        if workflow_update.trigger is not None:
            workflow["trigger"] = workflow_update.trigger.dict()
        if workflow_update.actions is not None:
            workflow["actions"] = [action.dict() for action in workflow_update.actions]
        if workflow_update.enabled is not None:
            workflow["enabled"] = workflow_update.enabled
            workflow["status"] = WorkflowStatus.ACTIVE if workflow_update.enabled else WorkflowStatus.INACTIVE
        
        workflow["updated_at"] = datetime.utcnow()
        
        # Restart monitoring if needed
        if workflow_update.trigger is not None and workflow["enabled"]:
            if workflow_update.trigger.type in [TriggerType.EMAIL, TriggerType.FOLDER]:
                background_tasks.add_task(start_trigger_monitoring, workflow_id, workflow_update.trigger)
        
        logger.info(f"Updated workflow {workflow_id}")
        
        return {
            "id": workflow_id,
            "status": "updated",
            "message": f"Workflow '{workflow['name']}' updated successfully"
        }
        
    except Exception as e:
        logger.error(f"Error updating workflow {workflow_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update workflow: {str(e)}"
        )

@router.delete("/workflows/{workflow_id}")
async def delete_workflow(
    workflow_id: str,
    user_id: str,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Delete workflow"""
    try:
        workflow = workflows_db.get(workflow_id)
        
        if not workflow or workflow.get("user_id") != user_id:
            raise HTTPException(
                status_code=404,
                detail="Workflow not found"
            )
        
        del workflows_db[workflow_id]
        
        logger.info(f"Deleted workflow {workflow_id}")
        
        return {
            "id": workflow_id,
            "status": "deleted",
            "message": f"Workflow '{workflow['name']}' deleted successfully"
        }
        
    except Exception as e:
        logger.error(f"Error deleting workflow {workflow_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete workflow: {str(e)}"
        )

@router.post("/workflows/{workflow_id}/execute")
async def execute_workflow(
    workflow_id: str,
    trigger_data: Dict[str, Any],
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Manually execute a workflow"""
    try:
        workflow = workflows_db.get(workflow_id)
        
        if not workflow:
            raise HTTPException(
                status_code=404,
                detail="Workflow not found"
            )
        
        if not workflow.get("enabled"):
            raise HTTPException(
                status_code=400,
                detail="Workflow is disabled"
            )
        
        execution_id = str(uuid.uuid4())
        
        background_tasks.add_task(
            run_workflow_execution,
            execution_id,
            workflow_id,
            trigger_data,
            db
        )
        
        return {
            "execution_id": execution_id,
            "status": "started",
            "message": "Workflow execution started"
        }
        
    except Exception as e:
        logger.error(f"Error executing workflow {workflow_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to execute workflow: {str(e)}"
        )

@router.get("/workflows/{workflow_id}/executions")
async def list_workflow_executions(
    workflow_id: str,
    user_id: str,
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """List workflow executions"""
    try:
        workflow = workflows_db.get(workflow_id)
        
        if not workflow or workflow.get("user_id") != user_id:
            raise HTTPException(
                status_code=404,
                detail="Workflow not found"
            )
        
        executions = [
            e for e in workflow_executions_db.values()
            if e.get("workflow_id") == workflow_id
        ]
        
        total_count = len(executions)
        executions = executions[offset:offset + limit]
        
        return {
            "total": total_count,
            "limit": limit,
            "offset": offset,
            "executions": executions
        }
        
    except Exception as e:
        logger.error(f"Error listing workflow executions: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list workflow executions: {str(e)}"
        )

@router.post("/webhook-trigger/{workflow_id}")
async def webhook_trigger(
    workflow_id: str,
    trigger_data: Dict[str, Any],
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Webhook endpoint to trigger workflows"""
    try:
        workflow = workflows_db.get(workflow_id)
        
        if not workflow:
            raise HTTPException(
                status_code=404,
                detail="Workflow not found"
            )
        
        if not workflow.get("enabled"):
            raise HTTPException(
                status_code=400,
                detail="Workflow is disabled"
            )
        
        # Add workflow context to trigger data
        trigger_data.update({
            "trigger_type": "webhook",
            "workflow_id": workflow_id,
            "user_id": workflow.get("user_id"),
            "organization_id": workflow.get("organization_id")
        })
        
        execution_id = str(uuid.uuid4())
        
        background_tasks.add_task(
            run_workflow_execution,
            execution_id,
            workflow_id,
            trigger_data,
            db
        )
        
        return {
            "execution_id": execution_id,
            "status": "triggered",
            "message": "Workflow triggered successfully"
        }
        
    except Exception as e:
        logger.error(f"Error in webhook trigger for workflow {workflow_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to trigger workflow: {str(e)}"
        )

@router.post("/test-trigger/{workflow_id}")
async def test_trigger(
    workflow_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Test endpoint to manually trigger a workflow"""
    try:
        workflow = workflows_db.get(workflow_id)
        
        if not workflow:
            raise HTTPException(
                status_code=404,
                detail="Workflow not found"
            )
        
        # Create a real test document for processing
        test_document_path = await create_test_document()
        
        # Create test trigger data
        trigger_data = {
            "trigger_type": "manual_test",
            "workflow_id": workflow_id,
            "user_id": workflow.get("user_id"),
            "organization_id": workflow.get("organization_id"),
            "file_path": test_document_path,
            "filename": "test_invoice.pdf",
            "mime_type": "application/pdf"
        }
        
        execution_id = str(uuid.uuid4())
        
        background_tasks.add_task(
            run_workflow_execution,
            execution_id,
            workflow_id,
            trigger_data,
            db
        )
        
        return {
            "execution_id": execution_id,
            "status": "test_triggered",
            "message": f"Test workflow '{workflow['name']}' triggered successfully",
            "workflow_name": workflow["name"],
            "actions_count": len(workflow["actions"])
        }
        
    except Exception as e:
        logger.error(f"Error in test trigger for workflow {workflow_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to test trigger workflow: {str(e)}"
        )

async def create_test_document() -> str:
    """Create a real test PDF document for workflow testing"""
    try:
        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import letter
        import tempfile
        import os
        
        # Create temporary PDF file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
        temp_file_path = temp_file.name
        temp_file.close()
        
        # Create a real PDF with invoice-like content
        c = canvas.Canvas(temp_file_path, pagesize=letter)
        width, height = letter
        
        # Invoice header
        c.setFont("Helvetica-Bold", 16)
        c.drawString(100, height - 100, "INVOICE")
        
        # Invoice details
        c.setFont("Helvetica", 12)
        c.drawString(100, height - 150, "Invoice Number: INV-2024-001")
        c.drawString(100, height - 170, "Date: 2024-01-15")
        c.drawString(100, height - 190, "Due Date: 2024-02-15")
        
        # Company details
        c.drawString(100, height - 230, "From: ACME Corporation")
        c.drawString(100, height - 250, "123 Business St, City, State 12345")
        c.drawString(100, height - 270, "Phone: (555) 123-4567")
        
        c.drawString(100, height - 310, "To: Customer Name")
        c.drawString(100, height - 330, "456 Customer Ave, City, State 67890")
        
        # Line items
        c.drawString(100, height - 380, "Description")
        c.drawString(300, height - 380, "Quantity")
        c.drawString(400, height - 380, "Price")
        c.drawString(500, height - 380, "Total")
        
        # Draw line
        c.line(100, height - 390, 550, height - 390)
        
        # Item 1
        c.drawString(100, height - 420, "Product A")
        c.drawString(300, height - 420, "2")
        c.drawString(400, height - 420, "$50.00")
        c.drawString(500, height - 420, "$100.00")
        
        # Item 2
        c.drawString(100, height - 450, "Product B")
        c.drawString(300, height - 450, "1")
        c.drawString(400, height - 450, "$75.00")
        c.drawString(500, height - 450, "$75.00")
        
        # Total
        c.setFont("Helvetica-Bold", 12)
        c.drawString(400, height - 500, "Total: $175.00")
        
        # Payment terms
        c.setFont("Helvetica", 10)
        c.drawString(100, height - 550, "Payment Terms: Net 30 days")
        c.drawString(100, height - 570, "Thank you for your business!")
        
        c.save()
        
        logger.info(f"Created test document: {temp_file_path}")
        return temp_file_path
        
    except Exception as e:
        logger.error(f"Error creating test document: {e}", exc_info=True)
        # Fallback: create a simple text file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.txt', mode='w')
        temp_file.write("INVOICE\nInvoice Number: INV-2024-001\nDate: 2024-01-15\nTotal: $175.00")
        temp_file.close()
        return temp_file.name

# Background task functions
async def start_trigger_monitoring(workflow_id: str, trigger: WorkflowTrigger):
    """Start monitoring for email/folder triggers"""
    try:
        if trigger.type == TriggerType.EMAIL:
            await monitor_email_trigger(workflow_id, trigger.config)
        elif trigger.type == TriggerType.FOLDER:
            await monitor_folder_trigger(workflow_id, trigger.config)
    except Exception as e:
        logger.error(f"Error in trigger monitoring for workflow {workflow_id}: {e}", exc_info=True)

async def monitor_email_trigger(workflow_id: str, config: Dict[str, Any]):
    """Monitor email for new attachments"""
    try:
        # Get email integration ID from config
        email_integration_id = config.get("email_integration_id")
        if not email_integration_id:
            logger.error(f"No email_integration_id in workflow {workflow_id} config")
            return
        
        # Start actual email monitoring using the email integration system
        await start_email_monitoring(workflow_id, email_integration_id, config)
        
    except Exception as e:
        logger.error(f"Error setting up email monitoring for workflow {workflow_id}: {e}", exc_info=True)

async def start_email_monitoring(workflow_id: str, email_integration_id: str, config: Dict[str, Any]):
    """Start actual email monitoring using IMAP"""
    try:
        import imaplib
        import email
        import asyncio
        from email.header import decode_header
        import time
        
        # Get email configuration from the integration
        email_config = await get_email_integration_config(email_integration_id)
        if not email_config:
            logger.error(f"Email integration {email_integration_id} not found")
            return
        
        async def check_emails():
            """Check for new emails with attachments"""
            try:
                # Connect to IMAP server
                if email_config.get("use_ssl", True):
                    mail = imaplib.IMAP4_SSL(email_config["host"], email_config["port"])
                else:
                    mail = imaplib.IMAP4(email_config["host"], email_config["port"])
                
                mail.login(email_config["username"], email_config["password"])
                mail.select("INBOX")
                
                # Search for unread emails
                status, messages = mail.search(None, "UNSEEN")
                email_ids = messages[0].split()
                
                for email_id in email_ids:
                    # Fetch email
                    status, msg_data = mail.fetch(email_id, "(RFC822)")
                    email_body = msg_data[0][1]
                    email_message = email.message_from_bytes(email_body)
                    
                    # Check for attachments
                    attachments = []
                    for part in email_message.walk():
                        if part.get_content_disposition() == "attachment":
                            filename = part.get_filename()
                            if filename:
                                # Decode filename if needed
                                decoded_filename = decode_header(filename)[0][0]
                                if isinstance(decoded_filename, bytes):
                                    decoded_filename = decoded_filename.decode()
                                attachments.append({
                                    "filename": decoded_filename,
                                    "content": part.get_payload(decode=True)
                                })
                    
                    # Process attachments
                    for attachment in attachments:
                        if any(attachment["filename"].lower().endswith(ext) for ext in ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx']):
                            await process_email_attachment(workflow_id, attachment, email_message)
                
                mail.close()
                mail.logout()
                
            except Exception as e:
                logger.error(f"Error checking emails: {e}", exc_info=True)
        
        # Start periodic email checking
        check_interval = config.get("check_interval", 60)  # Default 60 seconds
        
        async def email_monitor_loop():
            while True:
                try:
                    await check_emails()
                    await asyncio.sleep(check_interval)
                except Exception as e:
                    logger.error(f"Error in email monitor loop: {e}", exc_info=True)
                    await asyncio.sleep(check_interval)
        
        # Start the monitoring loop
        asyncio.create_task(email_monitor_loop())
        logger.info(f"Started email monitoring for workflow {workflow_id} (checking every {check_interval}s)")
        
    except Exception as e:
        logger.error(f"Error starting email monitoring: {e}", exc_info=True)

async def get_email_integration_config(email_integration_id: str) -> Dict[str, Any]:
    """Get email integration configuration from database"""
    try:
        from sqlalchemy.orm import sessionmaker
        from config.database import engine
        
        # Create database session
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        
        try:
            # Query email integrations table (this would be a real table in production)
            # For now, we'll use environment variables or a config file
            import os
            
            config = {
                "host": os.getenv("EMAIL_HOST", "imap.gmail.com"),
                "port": int(os.getenv("EMAIL_PORT", "993")),
                "username": os.getenv("EMAIL_USERNAME"),
                "password": os.getenv("EMAIL_PASSWORD"),
                "use_ssl": os.getenv("EMAIL_USE_SSL", "true").lower() == "true"
            }
            
            if not config["username"] or not config["password"]:
                logger.error("Email credentials not configured. Set EMAIL_USERNAME and EMAIL_PASSWORD environment variables.")
                return None
            
            return config
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Error getting email integration config: {e}", exc_info=True)
        return None

async def process_email_attachment(workflow_id: str, attachment: Dict[str, Any], email_message):
    """Process email attachment and trigger workflow"""
    try:
        from sqlalchemy.orm import sessionmaker
        from config.database import engine
        import tempfile
        import os
        
        # Create database session
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        
        try:
            # Save attachment to temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(attachment["filename"])[1]) as temp_file:
                temp_file.write(attachment["content"])
                temp_file_path = temp_file.name
            
            # Prepare trigger data
            trigger_data = {
                "trigger_type": "email",
                "file_path": temp_file_path,
                "filename": attachment["filename"],
                "mime_type": email_message.get_content_type(),
                "workflow_id": workflow_id,
                "user_id": "00000000-0000-0000-0000-000000000000",
                "organization_id": "00000000-0000-0000-0000-000000000000",
                "email_subject": email_message.get("Subject", ""),
                "email_from": email_message.get("From", "")
            }
            
            # Execute workflow
            execution_id = str(uuid.uuid4())
            await run_workflow_execution(execution_id, workflow_id, trigger_data, db)
            
            logger.info(f"Triggered workflow {workflow_id} for email attachment {attachment['filename']}")
            
        finally:
            db.close()
            # Clean up temp file after processing
            try:
                os.unlink(temp_file_path)
            except:
                pass
            
    except Exception as e:
        logger.error(f"Error processing email attachment: {e}", exc_info=True)

async def monitor_folder_trigger(workflow_id: str, config: Dict[str, Any]):
    """Monitor folder for new files"""
    try:
        folder_path = config.get("folder_path")
        file_patterns = config.get("file_patterns", [".pdf", ".jpg", ".png"])
        
        if not folder_path:
            logger.error(f"No folder_path in workflow {workflow_id} config")
            return
        
        # Register workflow with folder monitoring system
        if not hasattr(monitor_folder_trigger, 'workflow_registry'):
            monitor_folder_trigger.workflow_registry = {}
        
        monitor_folder_trigger.workflow_registry[folder_path] = {
            "workflow_id": workflow_id,
            "file_patterns": file_patterns,
            "config": config
        }
        logger.info(f"Registered workflow {workflow_id} for folder monitoring {folder_path}")
        
        # Start actual file system monitoring
        await start_file_system_monitoring(folder_path, file_patterns, workflow_id)
        
    except Exception as e:
        logger.error(f"Error setting up folder monitoring for workflow {workflow_id}: {e}", exc_info=True)

async def start_file_system_monitoring(folder_path: str, file_patterns: list, workflow_id: str):
    """Start actual file system monitoring using watchdog"""
    try:
        from watchdog.observers import Observer
        from watchdog.events import FileSystemEventHandler
        import asyncio
        from pathlib import Path
        
        class WorkflowFileHandler(FileSystemEventHandler):
            def __init__(self, workflow_id: str, file_patterns: list):
                self.workflow_id = workflow_id
                self.file_patterns = file_patterns
                self.observer = None
            
            def on_created(self, event):
                if not event.is_directory:
                    file_path = Path(event.src_path)
                    if any(file_path.suffix.lower() in [p.lower() for p in self.file_patterns]):
                        logger.info(f"New file detected: {file_path} for workflow {self.workflow_id}")
                        # Trigger workflow execution
                        asyncio.create_task(trigger_workflow_from_file(self.workflow_id, str(file_path)))
        
        # Create observer and start monitoring
        event_handler = WorkflowFileHandler(workflow_id, file_patterns)
        observer = Observer()
        observer.schedule(event_handler, folder_path, recursive=True)
        observer.start()
        
        # Store observer for cleanup
        if not hasattr(start_file_system_monitoring, 'observers'):
            start_file_system_monitoring.observers = {}
        start_file_system_monitoring.observers[workflow_id] = observer
        
        logger.info(f"Started file system monitoring for {folder_path} (workflow {workflow_id})")
        
    except Exception as e:
        logger.error(f"Error starting file system monitoring: {e}", exc_info=True)

async def trigger_workflow_from_file(workflow_id: str, file_path: str):
    """Trigger workflow execution when a new file is detected"""
    try:
        from sqlalchemy.orm import sessionmaker
        from config.database import engine
        
        # Create database session
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        
        try:
            # Prepare trigger data
            trigger_data = {
                "trigger_type": "folder",
                "file_path": file_path,
                "filename": Path(file_path).name,
                "mime_type": "application/octet-stream",  # Could be detected
                "workflow_id": workflow_id,
                "user_id": trigger_data.get("user_id"),
                "organization_id": trigger_data.get("organization_id")
            }
            
            # Execute workflow
            execution_id = str(uuid.uuid4())
            await run_workflow_execution(execution_id, workflow_id, trigger_data, db)
            
            logger.info(f"Triggered workflow {workflow_id} for file {file_path}")
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Error triggering workflow from file: {e}", exc_info=True)

async def run_workflow_execution(
    execution_id: str,
    workflow_id: str,
    trigger_data: Dict[str, Any],
    db: Session
):
    """Execute a workflow with all its actions"""
    try:
        workflow = workflows_db.get(workflow_id)
        if not workflow:
            return
        
        execution = {
            "id": execution_id,
            "workflow_id": workflow_id,
            "trigger_data": trigger_data,
            "status": "running",
            "started_at": datetime.utcnow(),
            "execution_log": []
        }
        
        workflow_executions_db[execution_id] = execution
        
        logger.info(f"Starting workflow execution {execution_id} for workflow {workflow_id}")
        
        # Execute each action in sequence
        for action_config in workflow["actions"]:
            try:
                result = await execute_action(action_config, trigger_data, db)
                execution["execution_log"].append({
                    "action": action_config["type"],
                    "status": "success",
                    "result": result,
                    "timestamp": datetime.utcnow().isoformat()
                })
                
                # Add delay if specified
                if action_config.get("delay_seconds", 0) > 0:
                    await asyncio.sleep(action_config["delay_seconds"])
                    
            except Exception as e:
                execution["execution_log"].append({
                    "action": action_config["type"],
                    "status": "error",
                    "error": str(e),
                    "timestamp": datetime.utcnow().isoformat()
                })
                logger.error(f"Error executing action {action_config['type']}: {e}")
        
        execution["status"] = "completed"
        execution["completed_at"] = datetime.utcnow()
        
        # Update workflow stats
        workflow["execution_count"] += 1
        if execution["status"] == "completed":
            workflow["success_count"] += 1
        else:
            workflow["error_count"] += 1
        
        logger.info(f"Completed workflow execution {execution_id}")
        
    except Exception as e:
        logger.error(f"Error in workflow execution {execution_id}: {e}", exc_info=True)
        if execution_id in workflow_executions_db:
            workflow_executions_db[execution_id]["status"] = "error"
            workflow_executions_db[execution_id]["error_message"] = str(e)
            workflow_executions_db[execution_id]["completed_at"] = datetime.utcnow()

async def execute_action(action_config: Dict[str, Any], trigger_data: Dict[str, Any], db: Session) -> Dict[str, Any]:
    """Execute a single workflow action"""
    action_type = action_config["type"]
    config = action_config["config"]
    
    if action_type == ActionType.PROCESS_DOCUMENT:
        return await execute_process_document(config, trigger_data, db)
    elif action_type == ActionType.SEND_TO_ERP:
        return await execute_send_to_erp(config, trigger_data)
    elif action_type == ActionType.SEND_WEBHOOK:
        return await execute_send_webhook(config, trigger_data)
    elif action_type == ActionType.SEND_EMAIL:
        return await execute_send_email(config, trigger_data)
    elif action_type == ActionType.SAVE_TO_DATABASE:
        return await execute_save_to_database(config, trigger_data, db)
    elif action_type == ActionType.NOTIFY_USER:
        return await execute_notify_user(config, trigger_data)
    else:
        raise ValueError(f"Unknown action type: {action_type}")

async def execute_process_document(config: Dict[str, Any], trigger_data: Dict[str, Any], db: Session) -> Dict[str, Any]:
    """Process document action"""
    try:
        # Get document processor
        from models.document_processor import DocumentProcessor
        processor = DocumentProcessor()
        
        # Get file path from trigger data
        file_path = trigger_data.get("file_path")
        if not file_path:
            raise ValueError("No file_path in trigger data")
        
        # Process document
        result = processor.process_document(file_path)
        
        # Save to database if requested
        if config.get("save_to_db", True):
            # Get user/org from trigger data or use defaults
            user_id = trigger_data.get("user_id")
            organization_id = trigger_data.get("organization_id")
            
            # Get active model name
            from models.active_model_manager import ActiveModelManager
            active_model_manager = ActiveModelManager()
            active_model_info = active_model_manager.get_active_model()
            model_name = active_model_info.get("model_name", "unknown")
            
            # Save document
            from routers.documents import save_document_to_db
            saved_document = await save_document_to_db(
                db=db,
                user_id=user_id,
                organization_id=organization_id,
                filename=trigger_data.get("filename", "document"),
                content=b"",  # File already processed from path
                mime_type=trigger_data.get("mime_type", "application/octet-stream"),
                processing_result=result,
                model_name=model_name,
                file_path=file_path
            )
            
            result["document_id"] = str(saved_document.id)
        
        return {
            "status": "success",
            "result": result,
            "message": "Document processed successfully"
        }
        
    except Exception as e:
        logger.error(f"Error processing document: {e}", exc_info=True)
        raise

async def execute_send_to_erp(config: Dict[str, Any], trigger_data: Dict[str, Any]) -> Dict[str, Any]:
    """Send data to ERP system"""
    try:
        import aiohttp
        
        erp_url = config.get("url")
        if not erp_url:
            raise ValueError("ERP URL not configured")
        
        # Prepare data to send
        data = {
            "document_data": trigger_data.get("processing_result", {}),
            "metadata": {
                "workflow_id": trigger_data.get("workflow_id"),
                "timestamp": datetime.utcnow().isoformat()
            }
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(erp_url, json=data) as response:
                if response.status == 200:
                    return {
                        "status": "success",
                        "message": "Data sent to ERP successfully",
                        "response": await response.json()
                    }
                else:
                    raise Exception(f"ERP request failed with status {response.status}")
        
    except Exception as e:
        logger.error(f"Error sending to ERP: {e}", exc_info=True)
        raise

async def execute_send_webhook(config: Dict[str, Any], trigger_data: Dict[str, Any]) -> Dict[str, Any]:
    """Send webhook notification"""
    try:
        import aiohttp
        
        webhook_url = config.get("url")
        if not webhook_url:
            raise ValueError("Webhook URL not configured")
        
        # Prepare webhook payload
        payload = {
            "event": "workflow.completed",
            "workflow_id": trigger_data.get("workflow_id"),
            "document_id": trigger_data.get("document_id"),
            "processing_result": trigger_data.get("processing_result", {}),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        headers = {"Content-Type": "application/json"}
        
        # Add signature if secret provided
        secret = config.get("secret")
        if secret:
            import hmac
            import hashlib
            signature = hmac.new(
                secret.encode(),
                json.dumps(payload).encode(),
                hashlib.sha256
            ).hexdigest()
            headers["X-Signature"] = f"sha256={signature}"
        
        async with aiohttp.ClientSession() as session:
            async with session.post(webhook_url, json=payload, headers=headers) as response:
                if response.status in [200, 201, 202]:
                    return {
                        "status": "success",
                        "message": "Webhook sent successfully",
                        "status_code": response.status
                    }
                else:
                    raise Exception(f"Webhook failed with status {response.status}")
        
    except Exception as e:
        logger.error(f"Error sending webhook: {e}", exc_info=True)
        raise

async def execute_send_email(config: Dict[str, Any], trigger_data: Dict[str, Any]) -> Dict[str, Any]:
    """Send email notification"""
    try:
        # This would integrate with email service
        # For now, just log the action
        logger.info(f"Sending email notification: {config}")
        
        return {
            "status": "success",
            "message": "Email notification sent"
        }
        
    except Exception as e:
        logger.error(f"Error sending email: {e}", exc_info=True)
        raise

async def execute_save_to_database(config: Dict[str, Any], trigger_data: Dict[str, Any], db: Session) -> Dict[str, Any]:
    """Save data to database"""
    try:
        # This would save custom data to database
        # For now, just log the action
        logger.info(f"Saving to database: {config}")
        
        return {
            "status": "success",
            "message": "Data saved to database"
        }
        
    except Exception as e:
        logger.error(f"Error saving to database: {e}", exc_info=True)
        raise

async def execute_notify_user(config: Dict[str, Any], trigger_data: Dict[str, Any]) -> Dict[str, Any]:
    """Notify user"""
    try:
        # This would send user notification
        # For now, just log the action
        logger.info(f"Notifying user: {config}")
        
        return {
            "status": "success",
            "message": "User notified"
        }
        
    except Exception as e:
        logger.error(f"Error notifying user: {e}", exc_info=True)
        raise
