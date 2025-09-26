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

logger = logging.getLogger(__name__)

class DocumentDataset(Dataset):
    def __init__(self, annotations: List[Dict[str, Any]], processor: LayoutLMv3Processor):
        self.annotations = annotations
        self.processor = processor

    def __len__(self):
        return len(self.annotations)

    def __getitem__(self, idx):
        item = self.annotations[idx]
        image = Image.open(item["image_path"])
        
        # Process image and annotations
        encoding = self.processor(
            image,
            text=[ann["text"] for ann in item["annotations"]],
            boxes=[ann["bbox"] for ann in item["annotations"]],
            word_labels=[ann["label_id"] for ann in item["annotations"]],
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
        self.processor = LayoutLMv3Processor.from_pretrained("microsoft/layoutlmv3-base")
        
    def train_model(
        self,
        training_data: List[Dict[str, Any]],
        model_name: str,
        num_epochs: int = 3,
        batch_size: int = 4
    ) -> str:
        """Train model on annotated documents"""
        logger.info(f"Starting training for model: {model_name}")
        
        # Prepare dataset
        dataset = DocumentDataset(training_data, self.processor)
        
        # Initialize model
        model = LayoutLMv3ForTokenClassification.from_pretrained(
            "microsoft/layoutlmv3-base",
            num_labels=len(self._get_label_map())
        ).to(self.device)
        
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
            warmup_steps=500
        )
        
        # Initialize trainer
        trainer = Trainer(
            model=model,
            args=training_args,
            train_dataset=dataset
        )
        
        # Train model
        trainer.train()
        
        # Save model and processor
        output_dir = self.model_dir / model_name
        model.save_pretrained(output_dir)
        self.processor.save_pretrained(output_dir)
        
        # Save training metadata
        self._save_training_metadata(model_name, training_data)
        
        logger.info(f"Training completed. Model saved to: {output_dir}")
        return str(output_dir)
    
    def _get_label_map(self) -> Dict[str, int]:
        """Get mapping of field labels to IDs"""
        return {
            "O": 0,
            "B-field": 1,
            "I-field": 2,
            "B-value": 3,
            "I-value": 4
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