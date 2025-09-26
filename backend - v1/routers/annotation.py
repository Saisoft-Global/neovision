from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
from models.annotation_manager import AnnotationManager

router = APIRouter()
annotation_manager = AnnotationManager()

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