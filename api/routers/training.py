from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from typing import Dict, Any, List
import json
from PIL import Image
import io
from models.training_pipeline import ModelTrainer, TrainingExample

router = APIRouter()
trainer = ModelTrainer()

@router.post("/train")
async def train_model(
    files: List[UploadFile] = File(...),
    annotations: str = Form(...),
    model_name: str = Form(...),
    document_type: str = Form(...)
) -> Dict[str, Any]:
    """Train a custom model using annotated documents"""
    try:
        # Parse annotations
        annotations_data = json.loads(annotations)
        
        # Process training examples
        training_examples = []
        for file, annotation in zip(files, annotations_data):
            # Read and convert image
            content = await file.read()
            image = Image.open(io.BytesIO(content))
            
            # Create training example
            example = TrainingExample(
                image=image,
                labels=annotation["labels"],
                document_type=document_type
            )
            training_examples.append(example)
        
        # Train model
        model_path = trainer.train(training_examples, model_name)
        
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

@router.get("/models")
async def list_models() -> List[Dict[str, Any]]:
    """List available trained models"""
    try:
        models = []
        for model_dir in os.listdir(trainer.model_dir):
            config_path = os.path.join(trainer.model_dir, model_dir, "config.json")
            if os.path.exists(config_path):
                with open(config_path, "r") as f:
                    config = json.load(f)
                models.append({
                    "name": model_dir,
                    "type": config.get("model_type", "unknown"),
                    "created_at": os.path.getctime(config_path)
                })
        return models
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error listing models: {str(e)}"
        )