"""
Folder Monitoring Router - Real-time file system watcher for auto-processing
Similar to Nanonets folder monitoring capabilities
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
import asyncio
import logging
from pathlib import Path
import time
import uuid
from datetime import datetime
import json
import hashlib
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from pydantic import BaseModel

from config.database import get_db
from models.database import Document, DocumentExtraction
from routers.documents import save_document_to_db
from routers.inference import get_document_processor

router = APIRouter()
logger = logging.getLogger(__name__)

# Folder Monitoring Models
class FolderConfig(BaseModel):
    """Folder monitoring configuration"""
    folder_path: str
    recursive: bool = True
    file_patterns: List[str] = [".pdf", ".jpg", ".jpeg", ".png", ".tiff", ".bmp", ".doc", ".docx"]
    exclude_patterns: List[str] = [".tmp", ".temp", "~"]
    processing_delay_seconds: int = 5  # Wait for file to be fully written
    move_processed: bool = False
    processed_folder: Optional[str] = None
    webhook_url: Optional[str] = None

class FolderIntegration(BaseModel):
    """Folder integration settings"""
    name: str
    config: FolderConfig
    enabled: bool = True
    user_id: str
    organization_id: str
    created_at: datetime = datetime.utcnow()

# Global folder watchers
folder_watchers: Dict[str, Dict[str, Any]] = {}

class DocumentFileHandler(FileSystemEventHandler):
    """File system event handler for document processing"""
    
    def __init__(self, integration_id: str, config: FolderConfig, user_id: str, org_id: str):
        self.integration_id = integration_id
        self.config = config
        self.user_id = user_id
        self.org_id = org_id
        self.processed_files = set()  # Track processed files to avoid duplicates
        
    def on_created(self, event):
        """Handle file creation events"""
        if not event.is_directory:
            self.schedule_file_processing(event.src_path)
    
    def on_moved(self, event):
        """Handle file move events"""
        if not event.is_directory:
            self.schedule_file_processing(event.dest_path)
    
    def schedule_file_processing(self, file_path: str):
        """Schedule file for processing after delay"""
        try:
            file_path = Path(file_path)
            
            # Check if file matches patterns
            if not self.should_process_file(file_path):
                return
            
            # Check if already processed
            file_hash = self.get_file_hash(file_path)
            if file_hash in self.processed_files:
                return
            
            # Schedule processing
            asyncio.create_task(self.process_file_delayed(file_path, file_hash))
            
        except Exception as e:
            logger.error(f"Error scheduling file processing: {str(e)}")
    
    def should_process_file(self, file_path: Path) -> bool:
        """Check if file should be processed based on patterns"""
        try:
            # Check file extension
            if file_path.suffix.lower() not in self.config.file_patterns:
                return False
            
            # Check exclude patterns
            for exclude_pattern in self.config.exclude_patterns:
                if exclude_pattern in file_path.name.lower():
                    return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error checking file patterns: {str(e)}")
            return False
    
    def get_file_hash(self, file_path: Path) -> str:
        """Get file hash for deduplication"""
        try:
            return hashlib.md5(str(file_path).encode()).hexdigest()
        except Exception:
            return str(file_path)
    
    async def process_file_delayed(self, file_path: Path, file_hash: str):
        """Process file after delay to ensure it's fully written"""
        try:
            # Wait for file to be fully written
            await asyncio.sleep(self.config.processing_delay_seconds)
            
            # Check if file still exists and is readable
            if not file_path.exists() or not file_path.is_file():
                return
            
            # Try to open file to ensure it's not locked
            try:
                with open(file_path, 'rb') as f:
                    f.read(1)  # Read one byte to test
            except (IOError, OSError):
                logger.info(f"File {file_path} is locked, skipping")
                return
            
            # Process the file
            await self.process_file(file_path, file_hash)
            
        except Exception as e:
            logger.error(f"Error in delayed file processing: {str(e)}")
    
    async def process_file(self, file_path: Path, file_hash: str):
        """Process a single file"""
        try:
            logger.info(f"Processing file: {file_path}")
            
            # Read file content
            with open(file_path, 'rb') as f:
                content = f.read()
            
            # Process document
            processor = get_document_processor()
            
            # Create temporary file for processing
            temp_dir = Path("temp/folder_monitoring")
            temp_dir.mkdir(exist_ok=True)
            temp_path = temp_dir / f"{uuid.uuid4()}_{file_path.name}"
            
            with open(temp_path, 'wb') as f:
                f.write(content)
            
            result = processor.process_document(str(temp_path))
            
            # Save to database
            db = next(get_db())
            try:
                saved_document = save_document_to_db(
                    db=db,
                    user_id=self.user_id,
                    organization_id=self.org_id,
                    filename=file_path.name,
                    content=content,
                    mime_type="application/octet-stream",
                    processing_result=result,
                    model_name="folder_monitoring"
                )
                
                # Add folder context to extraction
                extraction = db.query(DocumentExtraction).filter(
                    DocumentExtraction.document_id == saved_document.id
                ).order_by(DocumentExtraction.created_at.desc()).first()
                
                if extraction:
                    folder_context = {
                        "source_folder": str(file_path.parent),
                        "file_path": str(file_path),
                        "integration_id": self.integration_id,
                        "processed_at": datetime.utcnow().isoformat()
                    }
                    
                    current_fields = extraction.fields_json or {}
                    current_fields["folder_context"] = folder_context
                    extraction.fields_json = current_fields
                    db.commit()
                
                # Move file if configured
                if self.config.move_processed and self.config.processed_folder:
                    await self.move_processed_file(file_path)
                
                # Send webhook notification
                if self.config.webhook_url:
                    await self.send_webhook_notification(saved_document, result)
                
                # Mark as processed
                self.processed_files.add(file_hash)
                
                logger.info(f"Processed file {file_path.name}, saved as document {saved_document.id}")
                
            finally:
                db.close()
            
            # Cleanup temp file
            temp_path.unlink()
            
        except Exception as e:
            logger.error(f"Error processing file {file_path}: {str(e)}")
    
    async def move_processed_file(self, file_path: Path):
        """Move processed file to processed folder"""
        try:
            processed_folder = Path(self.config.processed_folder)
            processed_folder.mkdir(parents=True, exist_ok=True)
            
            # Create unique filename to avoid conflicts
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            new_name = f"{timestamp}_{file_path.name}"
            new_path = processed_folder / new_name
            
            file_path.rename(new_path)
            logger.info(f"Moved processed file to: {new_path}")
            
        except Exception as e:
            logger.error(f"Error moving processed file: {str(e)}")
    
    async def send_webhook_notification(self, document: Document, result: Dict[str, Any]):
        """Send webhook notification about processed document"""
        try:
            import aiohttp
            
            webhook_data = {
                "event": "document.processed",
                "document_id": str(document.id),
                "filename": document.name,
                "file_size": document.file_size,
                "processing_result": result,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.config.webhook_url,
                    json=webhook_data,
                    timeout=10
                ) as response:
                    if response.status == 200:
                        logger.info(f"Webhook notification sent successfully")
                    else:
                        logger.warning(f"Webhook notification failed: {response.status}")
                        
        except Exception as e:
            logger.error(f"Error sending webhook notification: {str(e)}")

class FolderWatcher:
    """Folder watcher for automatic document processing"""
    
    def __init__(self, integration_id: str, config: FolderConfig, user_id: str, org_id: str):
        self.integration_id = integration_id
        self.config = config
        self.user_id = user_id
        self.org_id = org_id
        self.observer = None
        self.handler = None
        self.running = False
    
    def start_watching(self):
        """Start folder monitoring"""
        try:
            folder_path = Path(self.config.folder_path)
            if not folder_path.exists():
                raise ValueError(f"Folder path does not exist: {folder_path}")
            
            # Create event handler
            self.handler = DocumentFileHandler(
                self.integration_id, self.config, self.user_id, self.org_id
            )
            
            # Create observer
            self.observer = Observer()
            self.observer.schedule(
                self.handler,
                str(folder_path),
                recursive=self.config.recursive
            )
            
            # Start watching
            self.observer.start()
            self.running = True
            
            logger.info(f"Started folder monitoring: {folder_path}")
            
        except Exception as e:
            logger.error(f"Error starting folder watcher: {str(e)}")
            raise
    
    def stop_watching(self):
        """Stop folder monitoring"""
        try:
            if self.observer and self.running:
                self.observer.stop()
                self.observer.join()
                self.running = False
                logger.info(f"Stopped folder monitoring: {self.config.folder_path}")
                
        except Exception as e:
            logger.error(f"Error stopping folder watcher: {str(e)}")

# API Endpoints
@router.post("/folder-integrations")
async def create_folder_integration(
    integration: FolderIntegration,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Create new folder integration"""
    try:
        integration_id = str(uuid.uuid4())
        
        # Create and start folder watcher
        watcher = FolderWatcher(
            integration_id=integration_id,
            config=integration.config,
            user_id=integration.user_id,
            organization_id=integration.organization_id
        )
        
        watcher.start_watching()
        
        # Store watcher reference
        folder_watchers[integration_id] = {
            "watcher": watcher,
            "config": integration.config,
            "user_id": integration.user_id,
            "organization_id": integration.organization_id,
            "created_at": datetime.utcnow()
        }
        
        return {
            "integration_id": integration_id,
            "status": "created",
            "message": f"Folder integration created and started monitoring: {integration.config.folder_path}"
        }
        
    except Exception as e:
        logger.error(f"Error creating folder integration: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create folder integration: {str(e)}"
        )

@router.get("/folder-integrations")
async def list_folder_integrations(
    user_id: str,
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """List user's folder integrations"""
    try:
        integrations = []
        for integration_id, watcher_info in folder_watchers.items():
            if watcher_info["user_id"] == user_id:
                integrations.append({
                    "integration_id": integration_id,
                    "folder_path": watcher_info["config"].folder_path,
                    "status": "running" if watcher_info["watcher"].running else "stopped",
                    "created_at": watcher_info["created_at"].isoformat()
                })
        
        return integrations
        
    except Exception as e:
        logger.error(f"Error listing folder integrations: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list folder integrations: {str(e)}"
        )

@router.post("/folder-integrations/{integration_id}/stop")
async def stop_folder_integration(
    integration_id: str
) -> Dict[str, Any]:
    """Stop folder integration"""
    try:
        if integration_id in folder_watchers:
            watcher_info = folder_watchers[integration_id]
            watcher_info["watcher"].stop_watching()
            del folder_watchers[integration_id]
            
            return {
                "status": "stopped",
                "message": f"Folder integration {integration_id} stopped"
            }
        else:
            raise HTTPException(
                status_code=404,
                detail="Folder integration not found"
            )
            
    except Exception as e:
        logger.error(f"Error stopping folder integration: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to stop folder integration: {str(e)}"
        )

@router.post("/folder-integrations/{integration_id}/test")
async def test_folder_integration(
    integration_id: str,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Test folder integration"""
    try:
        if integration_id not in folder_watchers:
            raise HTTPException(
                status_code=404,
                detail="Folder integration not found"
            )
        
        watcher_info = folder_watchers[integration_id]
        folder_path = Path(watcher_info["config"].folder_path)
        
        if not folder_path.exists():
            return {
                "status": "error",
                "message": f"Folder path does not exist: {folder_path}"
            }
        
        if not folder_path.is_dir():
            return {
                "status": "error",
                "message": f"Path is not a directory: {folder_path}"
            }
        
        return {
            "status": "success",
            "message": f"Folder integration test successful: {folder_path}",
            "files_count": len(list(folder_path.rglob("*")))
        }
        
    except Exception as e:
        logger.error(f"Error testing folder integration: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Folder integration test failed: {str(e)}"
        )
