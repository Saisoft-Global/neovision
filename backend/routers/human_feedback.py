"""
Human-in-the-Loop API Router
Provides endpoints for interactive feedback, validation, and learning
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
import logging
from datetime import datetime
import uuid

from models.human_in_loop import HumanInLoopManager, FeedbackType, DocumentStatus
from models.document_processor import DocumentProcessor

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize managers
human_loop_manager = HumanInLoopManager()
document_processor = DocumentProcessor()

# Request/Response Models
class FeedbackRequest(BaseModel):
    session_id: str
    field_name: str
    feedback_type: str  # "correction", "validation", "rejection", "approval"
    corrected_value: Optional[str] = None
    feedback_notes: Optional[str] = None
    user_id: Optional[str] = None

class SessionApprovalRequest(BaseModel):
    session_id: str
    user_id: Optional[str] = None

class SessionRejectionRequest(BaseModel):
    session_id: str
    reason: str
    user_id: Optional[str] = None

class DocumentProcessingRequest(BaseModel):
    document_id: str
    document_type: Optional[str] = None
    extracted_fields: Dict[str, Any]
    confidence_scores: Dict[str, float]
    user_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class LearningInsightsResponse(BaseModel):
    total_feedback_items: int
    common_corrections: Dict[str, List[Dict[str, Any]]]
    low_confidence_fields: Dict[str, int]
    document_type_patterns: Dict[str, Any]
    improvement_suggestions: List[str]

# API Endpoints

@router.post("/create-session")
async def create_document_session(request: DocumentProcessingRequest):
    """Create a new document processing session for human review"""
    try:
        logger.info(f"Creating document session for document {request.document_id}")
        
        # Create session
        session = human_loop_manager.create_document_session(
            document_id=request.document_id,
            document_type=request.document_type or "unknown",
            extracted_fields=request.extracted_fields,
            confidence_scores=request.confidence_scores,
            user_id=request.user_id
        )
        
        # Get session status
        status = human_loop_manager.get_session_status(session.session_id)
        
        return {
            "success": True,
            "session_id": session.session_id,
            "status": status,
            "message": "Document session created successfully"
        }
        
    except Exception as e:
        logger.error(f"Error creating document session: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create session: {str(e)}")

@router.get("/session/{session_id}")
async def get_session_status(session_id: str):
    """Get current status of a document session"""
    try:
        status = human_loop_manager.get_session_status(session_id)
        
        if not status:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return {
            "success": True,
            "session": status
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting session status: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get session status: {str(e)}")

@router.post("/add-feedback")
async def add_feedback(request: FeedbackRequest):
    """Add human feedback to a document session"""
    try:
        logger.info(f"Adding feedback for session {request.session_id}")
        
        # Convert string feedback type to enum
        try:
            feedback_type = FeedbackType(request.feedback_type)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid feedback type: {request.feedback_type}")
        
        # Add feedback
        success = human_loop_manager.add_feedback(
            session_id=request.session_id,
            field_name=request.field_name,
            feedback_type=feedback_type,
            corrected_value=request.corrected_value,
            feedback_notes=request.feedback_notes,
            user_id=request.user_id
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Get updated session status
        status = human_loop_manager.get_session_status(request.session_id)
        
        return {
            "success": True,
            "session": status,
            "message": "Feedback added successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding feedback: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to add feedback: {str(e)}")

@router.post("/approve-session")
async def approve_session(request: SessionApprovalRequest):
    """Approve a document session"""
    try:
        logger.info(f"Approving session {request.session_id}")
        
        success = human_loop_manager.approve_session(
            session_id=request.session_id,
            user_id=request.user_id
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return {
            "success": True,
            "message": "Session approved successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error approving session: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to approve session: {str(e)}")

@router.post("/reject-session")
async def reject_session(request: SessionRejectionRequest):
    """Reject a document session"""
    try:
        logger.info(f"Rejecting session {request.session_id}")
        
        success = human_loop_manager.reject_session(
            session_id=request.session_id,
            reason=request.reason,
            user_id=request.user_id
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return {
            "success": True,
            "message": "Session rejected successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rejecting session: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to reject session: {str(e)}")

@router.get("/learning-insights")
async def get_learning_insights():
    """Get insights from human feedback for model improvement"""
    try:
        insights = human_loop_manager.get_learning_insights()
        
        return {
            "success": True,
            "insights": insights
        }
        
    except Exception as e:
        logger.error(f"Error getting learning insights: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get learning insights: {str(e)}")

@router.get("/pending-sessions")
async def get_pending_sessions(user_id: Optional[str] = None):
    """Get all pending sessions that require human review"""
    try:
        # Get all active sessions
        pending_sessions = []
        
        for session_id, session in human_loop_manager.active_sessions.items():
            if session.status in [DocumentStatus.PENDING_REVIEW, DocumentStatus.NEEDS_CORRECTION]:
                if user_id is None or session.user_id == user_id:
                    status = human_loop_manager.get_session_status(session_id)
                    pending_sessions.append(status)
        
        return {
            "success": True,
            "pending_sessions": pending_sessions,
            "count": len(pending_sessions)
        }
        
    except Exception as e:
        logger.error(f"Error getting pending sessions: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get pending sessions: {str(e)}")

@router.post("/process-with-human-review")
async def process_document_with_human_review(
    background_tasks: BackgroundTasks,
    document_id: str,
    document_type: Optional[str] = None,
    user_id: Optional[str] = None
):
    """Process a document and create a session for human review"""
    try:
        logger.info(f"Processing document {document_id} with human review")
        
        # This would typically involve:
        # 1. Processing the document with the DocumentProcessor
        # 2. Creating a human-in-the-loop session
        # 3. Returning session information
        
        # Create a real human review session
        session_id = str(uuid.uuid4())
        
        # Store session in database or cache
        session_data = {
            "session_id": session_id,
            "document_id": document_id,
            "user_id": user_id,
            "document_type": document_type,
            "status": "pending_review",
            "created_at": datetime.utcnow().isoformat()
        }
        
        # In a real implementation, you'd save this to a database
        # For now, we'll use a simple in-memory store
        if not hasattr(process_document_with_human_review, 'sessions'):
            process_document_with_human_review.sessions = {}
        process_document_with_human_review.sessions[session_id] = session_data
        
        return {
            "success": True,
            "message": "Document processing initiated with human review",
            "document_id": document_id,
            "session_id": session_id,
            "status": "pending_review",
            "review_url": f"/human-review/{session_id}"
        }
        
    except Exception as e:
        logger.error(f"Error processing document with human review: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")

@router.get("/feedback-types")
async def get_feedback_types():
    """Get available feedback types"""
    return {
        "success": True,
        "feedback_types": [
            {"value": "correction", "label": "Correction", "description": "Correct an extracted value"},
            {"value": "validation", "label": "Validation", "description": "Validate an extracted value"},
            {"value": "rejection", "label": "Rejection", "description": "Reject an extracted value"},
            {"value": "approval", "label": "Approval", "description": "Approve an extracted value"},
            {"value": "uncertainty", "label": "Uncertainty", "description": "Mark value as uncertain"}
        ]
    }

@router.get("/document-status-types")
async def get_document_status_types():
    """Get available document status types"""
    return {
        "success": True,
        "status_types": [
            {"value": "processing", "label": "Processing", "description": "Document is being processed"},
            {"value": "pending_review", "label": "Pending Review", "description": "Document needs human review"},
            {"value": "approved", "label": "Approved", "description": "Document has been approved"},
            {"value": "needs_correction", "label": "Needs Correction", "description": "Document needs corrections"},
            {"value": "rejected", "label": "Rejected", "description": "Document has been rejected"},
            {"value": "completed", "label": "Completed", "description": "Document processing completed"}
        ]
    }

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "active_sessions": len(human_loop_manager.active_sessions),
        "total_feedback_items": len(human_loop_manager.learning_history)
    }
