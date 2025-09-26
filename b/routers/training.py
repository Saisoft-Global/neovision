from fastapi import APIRouter, HTTPException, File, UploadFile, Form
from typing import Dict, Any, List
import json
from PIL import Image
import io
import os
import fitz  # PyMuPDF
from models.training_manager import TrainingManager
from models.active_model_manager import ActiveModelManager

router = APIRouter()
training_manager = TrainingManager()
active_model_manager = ActiveModelManager()

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
        
        # Process uploaded files (support images and PDFs)
        processed_data = []
        for i, file in enumerate(files):
            content = await file.read()
            filename = (file.filename or "").lower()

            try:
                if filename.endswith('.pdf'):
                    # Render first page of PDF to image
                    with fitz.open(stream=content, filetype='pdf') as doc:
                        if doc.page_count == 0:
                            raise ValueError("Empty PDF")
                        page = doc.load_page(0)
                        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))  # 2x for clarity
                        image = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                else:
                    # Assume standard image
                    image = Image.open(io.BytesIO(content)).convert('RGB')
            except Exception as open_err:
                raise HTTPException(status_code=400, detail=f"Unsupported or corrupted file '{file.filename}': {open_err}")

            # Get annotations for this file
            file_annotations = training_data[i] if i < len(training_data) else {"labels": []}
            
            # Create training data entry
            processed_data.append({
                "image": image,
                "labels": file_annotations.get("labels", []),
                "filename": filename
            })
        
        # Train model
        model_path = training_manager.train_model(
            training_data=processed_data,
            model_name=model_name,
            num_epochs=num_epochs,
            batch_size=batch_size
        )
        
        # Auto-set the newly trained model as active
        auto_set_result = active_model_manager.set_active_model(model_name)
        
        return {
            "status": "success",
            "message": "Model training completed successfully",
            "model_path": model_path,
            "num_documents": len(processed_data),
            "total_annotations": sum(len(item["labels"]) for item in processed_data),
            "auto_set_active": auto_set_result["success"],
            "active_model_message": auto_set_result.get("message", "")
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error training model: {str(e)}"
        )

@router.get("/training-status/{model_name}")
async def get_training_status(model_name: str) -> Dict[str, Any]:
    """Get training status for a model"""
    try:
        status = training_manager.get_training_status(model_name)
        return status
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error getting training status: {str(e)}"
        )

@router.get("/models")
async def list_models() -> Dict[str, Any]:
    """List all trained models"""
    try:
        models = training_manager.list_trained_models()
        return {
            "status": "success",
            "models": models,
            "count": len(models)
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error listing models: {str(e)}"
        )

@router.get("/active-model")
async def get_active_model() -> Dict[str, Any]:
    """Get the currently active model"""
    try:
        active_info = active_model_manager.get_active_model()
        return {
            "status": "success",
            **active_info
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error getting active model: {str(e)}"
        )

@router.post("/set-active")
async def set_active_model(model_name: str = Form(...)) -> Dict[str, Any]:
    """Set the active model"""
    try:
        result = active_model_manager.set_active_model(model_name)
        if result["success"]:
            return {
                "status": "success",
                **result
            }
        else:
            raise HTTPException(
                status_code=400,
                detail=result["error"]
            )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error setting active model: {str(e)}"
        )

@router.post("/auto-set-latest")
async def auto_set_latest_model() -> Dict[str, Any]:
    """Automatically set the latest trained model as active"""
    try:
        result = active_model_manager.auto_set_latest_model()
        if result["success"]:
            return {
                "status": "success",
                **result
            }
        else:
            raise HTTPException(
                status_code=400,
                detail=result["error"]
            )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error auto-setting latest model: {str(e)}"
        )

@router.delete("/clear-active")
async def clear_active_model() -> Dict[str, Any]:
    """Clear the active model"""
    try:
        result = active_model_manager.clear_active_model()
        return {
            "status": "success",
            **result
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error clearing active model: {str(e)}"
        )