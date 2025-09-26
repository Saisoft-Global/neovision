from fastapi import APIRouter, HTTPException, File, UploadFile, Form, BackgroundTasks
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
import json
from PIL import Image
import io
import time
from models.training_manager import TrainingManager
from models.annotation_manager import AnnotationManager

router = APIRouter()
training_manager = TrainingManager()
annotation_manager = AnnotationManager()

# Request/Response Models
class QuickTrainingRequest(BaseModel):
    document_type: str
    model_name: Optional[str] = None
    min_samples: int = 5
    max_samples: int = 10
    user_id: Optional[str] = None

@router.post("/train")
async def train_model(
    files: List[UploadFile] = File(...),
    annotations: str = Form(...),
    model_name: str = Form(...),
    num_epochs: int = Form(3),
    batch_size: int = Form(4)
) -> Dict[str, Any]:
    """Train a model using annotated documents"""
    try:
        # Parse annotations
        training_data = json.loads(annotations)
        
        # Process uploaded files
        for file, annotation in zip(files, training_data):
            content = await file.read()
            image = Image.open(io.BytesIO(content))
            annotation["image"] = image
        
        # Train model
        model_path = training_manager.train_model(
            training_data=training_data,
            model_name=model_name,
            num_epochs=num_epochs,
            batch_size=batch_size
        )
        
        return {
            "status": "success",
            "message": "Model training completed successfully",
            "model_path": model_path
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error training model: {str(e)}"
        )

# ENHANCED TRAINING ENDPOINTS

@router.post("/quick-train")
async def quick_train_model(request: QuickTrainingRequest, background_tasks: BackgroundTasks):
    """Train a model quickly with 5-10 annotated samples"""
    try:
        # Check if we have enough samples
        training_status = annotation_manager.get_quick_training_status(request.document_type)
        
        if not training_status["can_train"]:
            raise HTTPException(
                status_code=400, 
                detail=f"Not enough training samples. Need {request.min_samples}, have {training_status['completed_sessions']}"
            )
        
        # Get completed annotation sessions
        completed_sessions = [
            session for session in annotation_manager.annotation_sessions.values()
            if session["document_type"] == request.document_type and 
               session["status"] == "completed" and
               session.get("training_ready", False)
        ]
        
        # Limit to max_samples
        training_sessions = completed_sessions[:request.max_samples]
        
        # Generate model name if not provided
        if not request.model_name:
            request.model_name = f"quick_model_{request.document_type}_{int(time.time())}"
        
        # Convert sessions to training data format
        training_data = []
        for session in training_sessions:
            # Convert session annotations to training format
            annotations = []
            for ann in session["annotations"]:
                annotations.append({
                    "text": ann["field_value"],
                    "label": f"B-{ann['field_name']}",
                    "label_id": 1,  # Simplified for quick training
                    "bbox": ann["bounding_box"],
                    "confidence": ann["confidence"]
                })
            
            training_item = {
                "image_path": session["image_path"],
                "annotations": annotations,
                "document_type": request.document_type,
                "quality_score": 1.0  # Manual annotations are high quality
            }
            training_data.append(training_item)
        
        # Start training in background
        background_tasks.add_task(
            _execute_quick_training,
            training_data,
            request.model_name,
            request.user_id
        )
        
        return {
            "status": "success",
            "message": f"Quick training started for {request.document_type}",
            "model_name": request.model_name,
            "training_samples": len(training_data),
            "estimated_time": "5-10 minutes"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error starting quick training: {str(e)}"
        )

@router.get("/quick-training-status/{document_type}")
async def get_quick_training_status(document_type: str):
    """Get quick training status for a document type"""
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

@router.get("/training-statistics")
async def get_training_statistics():
    """Get comprehensive training statistics"""
    try:
        # Get annotation statistics
        annotation_stats = annotation_manager.get_annotation_statistics()
        
        # Add training-specific statistics
        training_stats = {
            "annotation_statistics": annotation_stats,
            "quick_training_available": annotation_stats.get("quick_training_available", False),
            "document_types_ready": [
                doc_type for doc_type, count in annotation_stats.get("document_type_distribution", {}).items()
                if count >= 5
            ],
            "total_training_ready_sessions": annotation_stats.get("training_ready_sessions", 0)
        }
        
        return {
            "status": "success",
            "statistics": training_stats
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error getting training statistics: {str(e)}"
        )

# Background task for quick training
async def _execute_quick_training(training_data: List[Dict[str, Any]], model_name: str, user_id: Optional[str]):
    """Execute quick training in background"""
    try:
        # Train model with reduced epochs for quick training
        model_path = training_manager.train_model(
            training_data=training_data,
            model_name=model_name,
            num_epochs=2,  # Reduced for quick training
            batch_size=4
        )
        
        # Log completion
        print(f"Quick training completed for {model_name}: {model_path}")
        
    except Exception as e:
        print(f"Quick training failed for {model_name}: {str(e)}")
        raise