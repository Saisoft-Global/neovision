from fastapi import APIRouter, HTTPException, File, UploadFile, Form
from typing import Dict, Any, List
import json
from PIL import Image
import io
from models.training_manager import TrainingManager

router = APIRouter()
training_manager = TrainingManager()

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