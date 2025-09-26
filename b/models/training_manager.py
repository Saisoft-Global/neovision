from typing import Dict, Any, List, Optional
import torch
from torch.utils.data import Dataset, DataLoader
from transformers import (
    LayoutLMv3ForTokenClassification,
    LayoutLMv3Processor,
    Trainer,
    TrainingArguments
)
from PIL import Image
import json
from pathlib import Path
import logging
from datetime import datetime
import tempfile
import os

logger = logging.getLogger(__name__)

class DocumentDataset(Dataset):
    def __init__(self, annotations: List[Dict[str, Any]], processor: LayoutLMv3Processor):
        self.annotations = annotations
        self.processor = processor

    def __len__(self):
        return len(self.annotations)

    def __getitem__(self, idx):
        item = self.annotations[idx]
        
        # Handle both image_path and direct image object
        if "image" in item:
            image = item["image"]
        elif "image_path" in item:
            image = Image.open(item["image_path"])
        else:
            raise ValueError("No image or image_path found in annotation item")
        
        # Get annotations (labels array)
        annotations = item.get("labels", [])
        if not annotations:
            # Fallback to old format
            annotations = item.get("annotations", [])
        
        # Process image and annotations
        encoding = self.processor(
            image,
            text=[ann["text"] for ann in annotations],
            boxes=[ann["bbox"] for ann in annotations],
            word_labels=[ann["label_id"] for ann in annotations],
            return_tensors="pt",
            truncation=True,
            padding="max_length"
        )
        
        return {
            "input_ids": encoding["input_ids"].squeeze(),
            "attention_mask": encoding["attention_mask"].squeeze(),
            "bbox": encoding["bbox"].squeeze(),
            "pixel_values": encoding["pixel_values"].squeeze(),
            "labels": encoding["labels"].squeeze()
        }

class TrainingManager:
    def __init__(self, model_dir: str = "models/trained"):
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(parents=True, exist_ok=True)
        
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.processor = LayoutLMv3Processor.from_pretrained("microsoft/layoutlmv3-base", apply_ocr=False)
        self.training_status = {}
        
    def train_model(
        self,
        training_data: List[Dict[str, Any]],
        model_name: str,
        num_epochs: int = 3,
        batch_size: int = 4
    ) -> str:
        """Train model on annotated documents"""
        logger.info(f"Starting training for model: {model_name}")
        
        # Initialize training status
        self.training_status[model_name] = {
            "status": "initializing",
            "progress": 0,
            "message": "Preparing training data...",
            "start_time": datetime.utcnow().isoformat()
        }
        
        try:
            # Validate training data
            if not training_data:
                raise ValueError("No training data provided")
            
            # Count total annotations
            total_annotations = sum(len(item.get("labels", [])) for item in training_data)
            if total_annotations == 0:
                raise ValueError("No annotations found in training data")
            
            self.training_status[model_name]["message"] = f"Processing {len(training_data)} documents with {total_annotations} annotations..."
            self.training_status[model_name]["progress"] = 10
            
            # Prepare dataset
            dataset = DocumentDataset(training_data, self.processor)
            self.training_status[model_name]["message"] = "Initializing model..."
            self.training_status[model_name]["progress"] = 20
            
            # Initialize model
            model = LayoutLMv3ForTokenClassification.from_pretrained(
                "microsoft/layoutlmv3-base",
                num_labels=len(self._get_label_map())
            ).to(self.device)
            
            self.training_status[model_name]["message"] = "Configuring training parameters..."
            self.training_status[model_name]["progress"] = 30
            
            # Training arguments
            training_args = TrainingArguments(
                output_dir=str(self.model_dir / model_name),
                num_train_epochs=num_epochs,
                per_device_train_batch_size=batch_size,
                logging_dir="logs",
                logging_steps=10,
                save_strategy="epoch",
                learning_rate=2e-5,
                weight_decay=0.01,
                warmup_steps=500,
                report_to=None,  # Disable wandb/tensorboard
                disable_tqdm=False
            )
            
            # Initialize trainer
            trainer = Trainer(
                model=model,
                args=training_args,
                train_dataset=dataset
            )
            
            self.training_status[model_name]["message"] = "Starting model training..."
            self.training_status[model_name]["progress"] = 40
            self.training_status[model_name]["status"] = "training"
            
            # Train model
            trainer.train()
            
            self.training_status[model_name]["message"] = "Saving trained model..."
            self.training_status[model_name]["progress"] = 80
            
            # Save model and processor
            output_dir = self.model_dir / model_name
            model.save_pretrained(output_dir)
            self.processor.save_pretrained(output_dir)
            
            # Save training metadata
            self._save_training_metadata(model_name, training_data)
            
            self.training_status[model_name]["status"] = "completed"
            self.training_status[model_name]["progress"] = 100
            self.training_status[model_name]["message"] = "Training completed successfully!"
            self.training_status[model_name]["end_time"] = datetime.utcnow().isoformat()
            
            logger.info(f"Training completed. Model saved to: {output_dir}")
            return str(output_dir)
            
        except Exception as e:
            self.training_status[model_name]["status"] = "failed"
            self.training_status[model_name]["message"] = f"Training failed: {str(e)}"
            self.training_status[model_name]["end_time"] = datetime.utcnow().isoformat()
            logger.error(f"Training failed for model {model_name}: {str(e)}")
            raise
    
    def _get_label_map(self) -> Dict[str, int]:
        """Get mapping of field labels to IDs"""
        return {
            "O": 0,
            "B-invoice_number": 1,
            "B-date": 2,
            "B-total_amount": 3,
            "B-tax_amount": 4,
            "B-vendor_name": 5,
            "B-customer_name": 6,
            "B-line_item": 7,
            "B-quantity": 8,
            "B-unit_price": 9,
            "B-description": 10
        }
    
    def _save_training_metadata(self, model_name: str, training_data: List[Dict[str, Any]]):
        """Save training metadata"""
        metadata = {
            "model_name": model_name,
            "timestamp": datetime.utcnow().isoformat(),
            "num_documents": len(training_data),
            "label_map": self._get_label_map()
        }
        
        metadata_file = self.model_dir / model_name / "metadata.json"
        with metadata_file.open('w') as f:
            json.dump(metadata, f, indent=2)
    
    def get_training_status(self, model_name: str) -> Dict[str, Any]:
        """Get training status for a model"""
        return self.training_status.get(model_name, {
            "status": "not_found",
            "message": "No training session found for this model"
        })
    
    def list_trained_models(self) -> List[Dict[str, Any]]:
        """List all trained models"""
        models = []
        for model_dir in self.model_dir.iterdir():
            if model_dir.is_dir():
                metadata_file = model_dir / "metadata.json"
                if metadata_file.exists():
                    with metadata_file.open('r') as f:
                        metadata = json.load(f)
                    models.append({
                        "model_name": model_dir.name,
                        "path": str(model_dir),
                        "metadata": metadata
                    })
        return models