"""
Interactive Annotation API Router
Provides endpoints for user annotation and quick model training with minimal samples
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, File, UploadFile
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
import logging
from datetime import datetime
import uuid
import asyncio
from pathlib import Path

from models.interactive_annotation import (
    InteractiveAnnotationSystem,
    AnnotationMode,
    AnnotationStatus
)

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize the interactive annotation system
annotation_system = InteractiveAnnotationSystem()

# Request/Response Models
class CreateAnnotationSessionRequest(BaseModel):
    document_id: str
    document_type: str
    image_path: str
    user_id: Optional[str] = None

class AddFieldAnnotationRequest(BaseModel):
    session_id: str
    field_name: str
    field_value: str
    bounding_box: List[int]  # [x1, y1, x2, y2]
    confidence: float = 1.0
    user_id: Optional[str] = None

class CompleteAnnotationRequest(BaseModel):
    session_id: str
    user_id: Optional[str] = None

class TrainQuickModelRequest(BaseModel):
    document_type: str
    model_name: Optional[str] = None
    user_id: Optional[str] = None

class DefineFieldsRequest(BaseModel):
    document_type: str
    field_definitions: List[Dict[str, Any]]

# API Endpoints

@router.post("/create-session")
async def create_annotation_session(request: CreateAnnotationSessionRequest):
    """Create a new annotation session"""
    try:
        logger.info(f"Creating annotation session for document: {request.document_id}")
        
        session_id = annotation_system.create_annotation_session(
            document_id=request.document_id,
            document_type=request.document_type,
            image_path=request.image_path,
            user_id=request.user_id
        )
        
        return {
            "success": True,
            "session_id": session_id,
            "message": "Annotation session created successfully"
        }
        
    except Exception as e:
        logger.error(f"Error creating annotation session: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create annotation session: {str(e)}")

@router.post("/add-field-annotation")
async def add_field_annotation(request: AddFieldAnnotationRequest):
    """Add a field annotation to a session"""
    try:
        logger.info(f"Adding field annotation for session: {request.session_id}")
        
        success = annotation_system.add_field_annotation(
            session_id=request.session_id,
            field_name=request.field_name,
            field_value=request.field_value,
            bounding_box=request.bounding_box,
            confidence=request.confidence,
            user_id=request.user_id
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Annotation session not found")
        
        return {
            "success": True,
            "message": f"Field annotation added for '{request.field_name}'"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding field annotation: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to add field annotation: {str(e)}")

@router.get("/session/{session_id}")
async def get_annotation_session(session_id: str):
    """Get annotation session data"""
    try:
        session_data = annotation_system.get_annotation_session(session_id)
        
        if not session_data:
            raise HTTPException(status_code=404, detail="Annotation session not found")
        
        return {
            "success": True,
            "session": session_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting annotation session: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get annotation session: {str(e)}")

@router.post("/complete-session")
async def complete_annotation_session(request: CompleteAnnotationRequest):
    """Complete an annotation session"""
    try:
        logger.info(f"Completing annotation session: {request.session_id}")
        
        success = annotation_system.complete_annotation_session(
            session_id=request.session_id,
            user_id=request.user_id
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Annotation session not found")
        
        return {
            "success": True,
            "message": "Annotation session completed successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error completing annotation session: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to complete annotation session: {str(e)}")

@router.post("/train-quick-model")
async def train_quick_model(request: TrainQuickModelRequest):
    """Train a quick model from annotated sessions (5-10 samples)"""
    try:
        logger.info(f"Training quick model for document type: {request.document_type}")
        
        job_id = annotation_system.train_quick_model(
            document_type=request.document_type,
            model_name=request.model_name,
            user_id=request.user_id
        )
        
        return {
            "success": True,
            "job_id": job_id,
            "message": "Quick model training started successfully"
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error training quick model: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to train quick model: {str(e)}")

@router.get("/training-progress/{job_id}")
async def get_training_progress(job_id: str):
    """Get training progress for a job"""
    try:
        progress = annotation_system.get_training_progress(job_id)
        
        if "error" in progress:
            raise HTTPException(status_code=404, detail=progress["error"])
        
        return {
            "success": True,
            "progress": progress
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting training progress: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get training progress: {str(e)}")

@router.post("/deploy-model/{model_name}")
async def deploy_quick_model(model_name: str):
    """Deploy a quick-trained model for immediate use"""
    try:
        logger.info(f"Deploying quick model: {model_name}")
        
        success = annotation_system.deploy_quick_model(model_name)
        
        if not success:
            raise HTTPException(status_code=404, detail="Model not found")
        
        return {
            "success": True,
            "message": f"Model '{model_name}' deployed successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deploying model: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to deploy model: {str(e)}")

@router.get("/annotation-statistics")
async def get_annotation_statistics():
    """Get annotation statistics"""
    try:
        stats = annotation_system.get_annotation_statistics()
        
        return {
            "success": True,
            "statistics": stats
        }
        
    except Exception as e:
        logger.error(f"Error getting annotation statistics: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get annotation statistics: {str(e)}")

@router.post("/define-document-fields")
async def define_document_fields(request: DefineFieldsRequest):
    """Define fields for a document type"""
    try:
        logger.info(f"Defining fields for document type: {request.document_type}")
        
        success = annotation_system.define_document_fields(
            document_type=request.document_type,
            field_definitions=request.field_definitions
        )
        
        if not success:
            raise HTTPException(status_code=400, detail="Failed to define document fields")
        
        return {
            "success": True,
            "message": f"Defined {len(request.field_definitions)} fields for {request.document_type}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error defining document fields: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to define document fields: {str(e)}")

@router.get("/document-field-templates")
async def get_document_field_templates():
    """Get predefined field templates for common document types"""
    try:
        templates = annotation_system.get_document_field_templates()
        
        return {
            "success": True,
            "templates": templates
        }
        
    except Exception as e:
        logger.error(f"Error getting document field templates: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get document field templates: {str(e)}")

@router.get("/sessions")
async def list_annotation_sessions(
    document_type: Optional[str] = None,
    status: Optional[str] = None,
    training_ready: Optional[bool] = None,
    limit: int = 50
):
    """List annotation sessions with optional filters"""
    try:
        sessions = []
        
        for session_id, session in annotation_system.annotation_sessions.items():
            # Apply filters
            if document_type and session.document_type != document_type:
                continue
            
            if status and session.status.value != status:
                continue
            
            if training_ready is not None and session.training_ready != training_ready:
                continue
            
            session_data = {
                "session_id": session.session_id,
                "document_id": session.document_id,
                "document_type": session.document_type,
                "status": session.status.value,
                "training_ready": session.training_ready,
                "created_at": session.created_at.isoformat(),
                "updated_at": session.updated_at.isoformat(),
                "annotation_count": len(session.annotations),
                "progress": annotation_system._calculate_annotation_progress(session)
            }
            
            sessions.append(session_data)
            
            if len(sessions) >= limit:
                break
        
        # Sort by creation time (newest first)
        sessions.sort(key=lambda x: x["created_at"], reverse=True)
        
        return {
            "success": True,
            "sessions": sessions,
            "total": len(sessions)
        }
        
    except Exception as e:
        logger.error(f"Error listing annotation sessions: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to list annotation sessions: {str(e)}")

@router.post("/upload-and-annotate")
async def upload_and_annotate(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    document_type: str = "invoice",
    user_id: Optional[str] = None
):
    """Upload a document and create annotation session"""
    try:
        # Save uploaded file
        temp_dir = Path("temp/annotation_uploads")
        temp_dir.mkdir(parents=True, exist_ok=True)
        
        file_path = temp_dir / file.filename
        with file_path.open("wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Create annotation session
        document_id = f"upload_{int(time.time())}_{file.filename}"
        
        session_id = annotation_system.create_annotation_session(
            document_id=document_id,
            document_type=document_type,
            image_path=str(file_path),
            user_id=user_id
        )
        
        return {
            "success": True,
            "session_id": session_id,
            "document_id": document_id,
            "message": "Document uploaded and annotation session created"
        }
        
    except Exception as e:
        logger.error(f"Error uploading and annotating document: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to upload and annotate document: {str(e)}")

@router.get("/quick-training-status/{document_type}")
async def get_quick_training_status(document_type: str):
    """Get quick training status for a document type"""
    try:
        # Count completed sessions for this document type
        completed_sessions = [
            session for session in annotation_system.annotation_sessions.values()
            if session.document_type == document_type and 
               session.status == AnnotationStatus.COMPLETED and
               session.training_ready
        ]
        
        # Check if we have enough sessions for training
        min_sessions = 5
        can_train = len(completed_sessions) >= min_sessions
        
        return {
            "success": True,
            "document_type": document_type,
            "completed_sessions": len(completed_sessions),
            "can_train": can_train,
            "min_sessions_required": min_sessions,
            "training_ready": can_train
        }
        
    except Exception as e:
        logger.error(f"Error getting quick training status: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get quick training status: {str(e)}")

@router.get("/annotation-guide/{document_type}")
async def get_annotation_guide(document_type: str):
    """Get annotation guide for a document type"""
    try:
        # Get field definitions
        field_definitions = annotation_system._get_field_definitions(document_type)
        
        # Get templates
        templates = annotation_system.get_document_field_templates()
        
        guide = {
            "document_type": document_type,
            "field_definitions": field_definitions,
            "annotation_steps": [
                "1. Upload or select a document",
                "2. Review the field definitions",
                "3. Click on text regions to annotate fields",
                "4. Enter the correct field values",
                "5. Draw bounding boxes around the text",
                "6. Complete the annotation session",
                "7. Train the model when you have 5+ samples"
            ],
            "tips": [
                "Be precise with bounding boxes",
                "Use consistent field values",
                "Annotate all required fields",
                "Review annotations before completing"
            ],
            "example_templates": templates.get(document_type, [])
        }
        
        return {
            "success": True,
            "guide": guide
        }
        
    except Exception as e:
        logger.error(f"Error getting annotation guide: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get annotation guide: {str(e)}")

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        stats = annotation_system.get_annotation_statistics()
        
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "total_sessions": stats["total_sessions"],
            "completed_sessions": stats["completed_sessions"],
            "quick_models": stats["quick_models_created"]
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}", exc_info=True)
        return {
            "status": "unhealthy",
            "timestamp": datetime.now().isoformat(),
            "error": str(e)
        }

# Import time for upload function
import time
