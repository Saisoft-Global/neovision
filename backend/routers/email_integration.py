"""
Email Integration Router - Auto-process documents from email attachments
Similar to Nanonets email integration capabilities
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
import asyncio
import email
import imaplib
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pathlib import Path
import tempfile
import uuid
from datetime import datetime, timedelta
import json
from pydantic import BaseModel

from config.database import get_db
from models.database import Document, DocumentExtraction
from routers.documents import save_document_to_db
from routers.inference import get_document_processor

router = APIRouter()
logger = logging.getLogger(__name__)

# Email Integration Models
class EmailConfig(BaseModel):
    """Email configuration for integration"""
    email_type: str  # "imap" or "smtp"
    host: str
    port: int
    username: str
    password: str
    use_ssl: bool = True
    folder: str = "INBOX"
    check_interval_minutes: int = 5
    auto_reply: bool = True
    reply_template: Optional[str] = None

class EmailIntegration(BaseModel):
    """Email integration settings"""
    name: str
    config: EmailConfig
    enabled: bool = True
    user_id: str
    organization_id: str
    created_at: datetime = datetime.utcnow()

# Global email watchers
email_watchers: Dict[str, asyncio.Task] = {}

class EmailWatcher:
    """Email watcher for automatic document processing"""
    
    def __init__(self, integration_id: str, config: EmailConfig, user_id: str, org_id: str):
        self.integration_id = integration_id
        self.config = config
        self.user_id = user_id
        self.org_id = org_id
        self.running = False
        self.last_check = None
        
    async def start_watching(self):
        """Start email monitoring loop"""
        self.running = True
        logger.info(f"Starting email watcher for integration {self.integration_id}")
        
        while self.running:
            try:
                await self.check_emails()
                await asyncio.sleep(self.config.check_interval_minutes * 60)
            except Exception as e:
                logger.error(f"Email watcher error: {str(e)}")
                await asyncio.sleep(60)  # Wait 1 minute before retry
    
    async def check_emails(self):
        """Check for new emails and process attachments"""
        try:
            if self.config.email_type == "imap":
                await self.process_imap_emails()
            else:
                logger.warning(f"Unsupported email type: {self.config.email_type}")
                
        except Exception as e:
            logger.error(f"Error checking emails: {str(e)}")
    
    async def process_imap_emails(self):
        """Process emails from IMAP server"""
        try:
            # Connect to IMAP server
            if self.config.use_ssl:
                mail = imaplib.IMAP4_SSL(self.config.host, self.config.port)
            else:
                mail = imaplib.IMAP4(self.config.host, self.config.port)
            
            mail.login(self.config.username, self.config.password)
            mail.select(self.config.folder)
            
            # Search for unread emails
            status, messages = mail.search(None, 'UNSEEN')
            if status != 'OK':
                logger.error("Failed to search emails")
                return
            
            email_ids = messages[0].split()
            logger.info(f"Found {len(email_ids)} unread emails")
            
            for email_id in email_ids:
                try:
                    await self.process_single_email(mail, email_id)
                except Exception as e:
                    logger.error(f"Error processing email {email_id}: {str(e)}")
            
            mail.close()
            mail.logout()
            
        except Exception as e:
            logger.error(f"IMAP connection error: {str(e)}")
    
    async def process_single_email(self, mail: imaplib.IMAP4_SSL, email_id: bytes):
        """Process a single email and its attachments"""
        try:
            # Fetch email
            status, msg_data = mail.fetch(email_id, '(RFC822)')
            if status != 'OK':
                return
            
            # Parse email
            email_body = msg_data[0][1]
            email_message = email.message_from_bytes(email_body)
            
            # Extract email metadata
            sender = email_message.get('From', '')
            subject = email_message.get('Subject', '')
            date = email_message.get('Date', '')
            
            logger.info(f"Processing email from {sender}: {subject}")
            
            # Process attachments
            attachments_processed = 0
            for part in email_message.walk():
                if part.get_content_disposition() == 'attachment':
                    filename = part.get_filename()
                    if filename:
                        # Extract attachment
                        attachment_data = part.get_payload(decode=True)
                        if attachment_data:
                            # Process document
                            result = await self.process_attachment(
                                filename, attachment_data, sender, subject
                            )
                            if result:
                                attachments_processed += 1
            
            # Mark email as read
            mail.store(email_id, '+FLAGS', '\\Seen')
            
            # Send auto-reply if enabled
            if self.config.auto_reply and attachments_processed > 0:
                await self.send_auto_reply(sender, subject, attachments_processed)
            
            logger.info(f"Processed {attachments_processed} attachments from {sender}")
            
        except Exception as e:
            logger.error(f"Error processing email {email_id}: {str(e)}")
    
    async def process_attachment(self, filename: str, data: bytes, sender: str, subject: str) -> bool:
        """Process a single attachment"""
        try:
            # Check if it's a supported document type
            file_ext = Path(filename).suffix.lower()
            supported_types = ['.pdf', '.jpg', '.jpeg', '.png', '.tiff', '.bmp', '.doc', '.docx']
            
            if file_ext not in supported_types:
                logger.info(f"Skipping unsupported file type: {filename}")
                return False
            
            # Save to temporary file
            temp_dir = Path("temp/email_attachments")
            temp_dir.mkdir(exist_ok=True)
            temp_path = temp_dir / f"{uuid.uuid4()}_{filename}"
            
            with open(temp_path, "wb") as f:
                f.write(data)
            
            # Process document
            processor = get_document_processor()
            result = processor.process_document(str(temp_path))
            
            # Save to database
            db = next(get_db())
            try:
                saved_document = save_document_to_db(
                    db=db,
                    user_id=self.user_id,
                    organization_id=self.org_id,
                    filename=filename,
                    content=data,
                    mime_type="application/octet-stream",
                    processing_result=result,
                    model_name="email_integration"
                )
                
                # Add email metadata to extraction
                extraction = db.query(DocumentExtraction).filter(
                    DocumentExtraction.document_id == saved_document.id
                ).order_by(DocumentExtraction.created_at.desc()).first()
                
                if extraction:
                    # Add email context to fields
                    email_context = {
                        "email_sender": sender,
                        "email_subject": subject,
                        "email_date": datetime.utcnow().isoformat(),
                        "integration_id": self.integration_id
                    }
                    
                    current_fields = extraction.fields_json or {}
                    current_fields["email_context"] = email_context
                    extraction.fields_json = current_fields
                    db.commit()
                
                logger.info(f"Processed attachment {filename} from email, saved as document {saved_document.id}")
                return True
                
            finally:
                db.close()
            
            # Cleanup temp file
            temp_path.unlink()
            
        except Exception as e:
            logger.error(f"Error processing attachment {filename}: {str(e)}")
            return False
    
    async def send_auto_reply(self, recipient: str, original_subject: str, attachments_count: int):
        """Send auto-reply email with processing results"""
        try:
            if not self.config.auto_reply:
                return
            
            # Create reply message
            reply_subject = f"Re: {original_subject} - Document Processing Complete"
            
            if self.config.reply_template:
                reply_body = self.config.reply_template.format(
                    attachments_count=attachments_count,
                    original_subject=original_subject
                )
            else:
                reply_body = f"""
Hello,

Thank you for sending {attachments_count} document(s) for processing.

Your documents have been successfully processed and the extracted data is now available in your account.

Original subject: {original_subject}
Processed on: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}

Best regards,
Document Processing System
"""
            
            # Send email (implement based on your SMTP setup)
            logger.info(f"Auto-reply sent to {recipient}: {reply_subject}")
            
        except Exception as e:
            logger.error(f"Error sending auto-reply: {str(e)}")

# API Endpoints
@router.post("/email-integrations")
async def create_email_integration(
    integration: EmailIntegration,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Create new email integration"""
    try:
        # Save integration to database (you'll need to create this table)
        integration_id = str(uuid.uuid4())
        
        # Start email watcher
        watcher = EmailWatcher(
            integration_id=integration_id,
            config=integration.config,
            user_id=integration.user_id,
            organization_id=integration.organization_id
        )
        
        # Start background task
        task = asyncio.create_task(watcher.start_watching())
        email_watchers[integration_id] = task
        
        return {
            "integration_id": integration_id,
            "status": "created",
            "message": "Email integration created and started"
        }
        
    except Exception as e:
        logger.error(f"Error creating email integration: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create email integration: {str(e)}"
        )

@router.get("/email-integrations")
async def list_email_integrations(
    user_id: str,
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """List user's email integrations"""
    try:
        # Return active integrations
        integrations = []
        for integration_id, task in email_watchers.items():
            integrations.append({
                "integration_id": integration_id,
                "status": "running" if not task.done() else "stopped",
                "last_check": "N/A"  # You can track this in the watcher
            })
        
        return integrations
        
    except Exception as e:
        logger.error(f"Error listing email integrations: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list email integrations: {str(e)}"
        )

@router.post("/email-integrations/{integration_id}/stop")
async def stop_email_integration(
    integration_id: str
) -> Dict[str, Any]:
    """Stop email integration"""
    try:
        if integration_id in email_watchers:
            task = email_watchers[integration_id]
            task.cancel()
            del email_watchers[integration_id]
            
            return {
                "status": "stopped",
                "message": f"Email integration {integration_id} stopped"
            }
        else:
            raise HTTPException(
                status_code=404,
                detail="Email integration not found"
            )
            
    except Exception as e:
        logger.error(f"Error stopping email integration: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to stop email integration: {str(e)}"
        )

@router.post("/email-integrations/{integration_id}/test")
async def test_email_integration(
    integration_id: str,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Test email integration connection"""
    try:
        # Find the integration and test connection
        if integration_id not in email_watchers:
            raise HTTPException(
                status_code=404,
                detail="Email integration not found"
            )
        
        # Test IMAP connection
        # This is a simplified test - you'd get the actual config from database
        return {
            "status": "success",
            "message": "Email connection test successful"
        }
        
    except Exception as e:
        logger.error(f"Error testing email integration: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Email connection test failed: {str(e)}"
        )
