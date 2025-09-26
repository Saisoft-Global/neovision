from fastapi import APIRouter, HTTPException, File, UploadFile, BackgroundTasks
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from models.annotation_manager import AnnotationManager

router = APIRouter()
annotation_manager = AnnotationManager()

# Request/Response Models
class CreateSessionRequest(BaseModel):
    document_id: str
    document_type: str
    image_path: str
    user_id: Optional[str] = None

class AddFieldAnnotationRequest(BaseModel):
    session_id: str
    field_name: str
    field_value: str
    bounding_box: List[int]
    confidence: float = 1.0
    user_id: Optional[str] = None

class DefineFieldsRequest(BaseModel):
    document_type: str
    field_definitions: List[Dict[str, Any]]

@router.post("/save")
async def save_annotation(document_id: str, annotations: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Save document annotations"""
    try:
        file_path = annotation_manager.save_annotation(document_id, annotations)
        return {
            "status": "success",
            "message": "Annotations saved successfully",
            "file_path": file_path
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error saving annotations: {str(e)}"
        )

@router.get("/list")
async def list_annotations(status: str = None) -> List[Dict[str, Any]]:
    """List all annotations"""
    try:
        return annotation_manager.list_annotations(status)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error listing annotations: {str(e)}"
        )

@router.get("/{document_id}")
async def get_annotation(document_id: str) -> Dict[str, Any]:
    """Get annotations for a document"""
    try:
        annotation = annotation_manager.get_annotation(document_id)
        if not annotation:
            raise HTTPException(
                status_code=404,
                detail=f"No annotations found for document: {document_id}"
            )
        return annotation
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving annotations: {str(e)}"
        )

@router.put("/{document_id}")
async def update_annotation(document_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    """Update document annotations"""
    try:
        success = annotation_manager.update_annotation(document_id, updates)
        if not success:
            raise HTTPException(
                status_code=404,
                detail=f"No annotations found for document: {document_id}"
            )
        return {
            "status": "success",
            "message": "Annotations updated successfully"
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error updating annotations: {str(e)}"
        )

# ENHANCED ENDPOINTS - Adding interactive capabilities to existing system

@router.post("/create-session")
async def create_annotation_session(request: CreateSessionRequest):
    """Create a new annotation session for visual annotation"""
    try:
        session_id = annotation_manager.create_annotation_session(
            document_id=request.document_id,
            document_type=request.document_type,
            image_path=request.image_path,
            user_id=request.user_id
        )
        
        return {
            "status": "success",
            "session_id": session_id,
            "message": "Annotation session created successfully"
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error creating annotation session: {str(e)}"
        )

@router.post("/add-field-annotation")
async def add_field_annotation(request: AddFieldAnnotationRequest):
    """Add a field annotation to a session"""
    try:
        success = annotation_manager.add_field_annotation(
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
            "status": "success",
            "message": f"Field annotation added for '{request.field_name}'"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error adding field annotation: {str(e)}"
        )

@router.get("/session/{session_id}")
async def get_annotation_session(session_id: str):
    """Get annotation session data"""
    try:
        session_data = annotation_manager.get_annotation_session(session_id)
        
        if not session_data:
            raise HTTPException(status_code=404, detail="Annotation session not found")
        
        return {
            "status": "success",
            "session": session_data
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error getting annotation session: {str(e)}"
        )

@router.post("/complete-session")
async def complete_annotation_session(session_id: str, user_id: Optional[str] = None):
    """Complete an annotation session and save to main annotation system"""
    try:
        success = annotation_manager.complete_annotation_session(session_id, user_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Annotation session not found")
        
        return {
            "status": "success",
            "message": "Annotation session completed successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error completing annotation session: {str(e)}"
        )

@router.get("/document-templates")
async def get_document_templates():
    """Get predefined document templates"""
    try:
        templates = annotation_manager.get_document_templates()
        
        return {
            "status": "success",
            "templates": templates
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error getting document templates: {str(e)}"
        )

@router.post("/define-document-fields")
async def define_document_fields(request: DefineFieldsRequest):
    """Define custom fields for a document type"""
    try:
        success = annotation_manager.define_document_fields(
            document_type=request.document_type,
            field_definitions=request.field_definitions
        )
        
        if not success:
            raise HTTPException(status_code=400, detail="Failed to define document fields")
        
        return {
            "status": "success",
            "message": f"Defined {len(request.field_definitions)} fields for {request.document_type}"
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error defining document fields: {str(e)}"
        )

@router.get("/quick-training-status/{document_type}")
async def get_quick_training_status(document_type: str):
    """Check if we have enough annotations for quick training (5-10 samples)"""
    try:
        status = annotation_manager.get_quick_training_status(document_type)
        
        return {
            "status": "success",
            "training_status": status
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error getting quick training status: {str(e)}"
        )

@router.get("/annotation-statistics")
async def get_annotation_statistics():
    """Get enhanced annotation statistics"""
    try:
        stats = annotation_manager.get_annotation_statistics()
        
        return {
            "status": "success",
            "statistics": stats
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error getting annotation statistics: {str(e)}"
        )

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
        from pathlib import Path
        import time
        
        temp_dir = Path("temp/annotation_uploads")
        temp_dir.mkdir(parents=True, exist_ok=True)
        
        file_path = temp_dir / file.filename
        with file_path.open("wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Create annotation session
        document_id = f"upload_{int(time.time())}_{file.filename}"
        
        session_id = annotation_manager.create_annotation_session(
            document_id=document_id,
            document_type=document_type,
            image_path=str(file_path),
            user_id=user_id
        )
        
        return {
            "status": "success",
            "session_id": session_id,
            "document_id": document_id,
            "message": "Document uploaded and annotation session created"
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error uploading and annotating document: {str(e)}"
        )