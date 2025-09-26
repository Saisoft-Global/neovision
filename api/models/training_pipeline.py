from typing import Dict, Any, List
import torch
from transformers import (
    LayoutLMv3ForTokenClassification,
    LayoutLMv3Processor,
    Trainer,
    TrainingArguments
)
from PIL import Image
import numpy as np
from dataclasses import dataclass
from torch.utils.data import Dataset
import os

@dataclass
class TrainingExample:
    image: Image.Image
    labels: List[Dict[str, Any]]
    document_type: str

class DocumentDataset(Dataset):
    def __init__(self, examples: List[TrainingExample], processor: LayoutLMv3Processor):
        self.examples = examples
        self.processor = processor

    def __len__(self):
        return len(self.examples)

    def __getitem__(self, idx):
        example = self.examples[idx]
        
        # Process image and text
        encoding = self.processor(
            example.image,
            text=[label["text"] for label in example.labels],
            boxes=[label["bbox"] for label in example.labels],
            return_tensors="pt",
            truncation=True,
            padding="max_length"
        )
        
        # Create label tensor
        labels = torch.tensor([label["label_id"] for label in example.labels])
        
        return {
            "input_ids": encoding["input_ids"].squeeze(),
            "attention_mask": encoding["attention_mask"].squeeze(),
            "bbox": encoding["bbox"].squeeze(),
            "pixel_values": encoding["pixel_values"].squeeze(),
            "labels": labels
        }

class ModelTrainer:
    def __init__(self, model_dir: str = "models"):
        self.model_dir = model_dir
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
        # Initialize processor and model
        self.processor = LayoutLMv3Processor.from_pretrained("microsoft/layoutlmv3-base")
        self.model = LayoutLMv3ForTokenClassification.from_pretrained(
            "microsoft/layoutlmv3-base",
            num_labels=len(self.get_label_map())
        ).to(self.device)

    def train(self, training_data: List[TrainingExample], model_name: str) -> str:
        """Train model on annotated documents"""
        # Create dataset
        dataset = DocumentDataset(training_data, self.processor)
        
        # Set up training arguments
        training_args = TrainingArguments(
            output_dir=f"{self.model_dir}/{model_name}",
            num_train_epochs=3,
            per_device_train_batch_size=4,
            per_device_eval_batch_size=4,
            warmup_steps=500,
            weight_decay=0.01,
            logging_dir="./logs",
            save_strategy="epoch"
        )
        
        # Initialize trainer
        trainer = Trainer(
            model=self.model,
            args=training_args,
            train_dataset=dataset
        )
        
        # Train model
        trainer.train()
        
        # Save model and processor
        output_dir = f"{self.model_dir}/{model_name}"
        os.makedirs(output_dir, exist_ok=True)
        
        self.model.save_pretrained(output_dir)
        self.processor.save_pretrained(output_dir)
        
        return output_dir

    @staticmethod
    def get_label_map() -> Dict[str, int]:
        """Get mapping of field labels to IDs"""
        return {
            "O": 0,
            "B-invoice_number": 1,
            "B-date": 2,
            "B-total_amount": 3,
            "B-vendor_name": 4,
            "B-customer_name": 5,
            "B-line_item": 6,
            "I-invoice_number": 7,
            "I-date": 8,
            "I-total_amount": 9,
            "I-vendor_name": 10,
            "I-customer_name": 11,
            "I-line_item": 12
        }