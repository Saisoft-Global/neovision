from typing import Dict, Any
import torch
from transformers import AutoFeatureExtractor, AutoModelForImageClassification
from PIL import Image

class DocumentClassifier:
    """Classifies document type using a fine-tuned vision transformer"""
    
    def __init__(self):
        self.model_name = "microsoft/dit-base-finetuned-rvlcdip"
        self.feature_extractor = AutoFeatureExtractor.from_pretrained(self.model_name)
        self.model = AutoModelForImageClassification.from_pretrained(self.model_name)
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model.to(self.device)
        
        self.document_types = [
            "invoice",
            "receipt",
            "purchase_order",
            "contract",
            "form",
            "letter",
            "resume",
            "scientific_publication",
            "specification",
            "handwritten",
            "other"
        ]

    def classify(self, image: Image.Image) -> Dict[str, Any]:
        """Classify document type with confidence score"""
        inputs = self.feature_extractor(images=image, return_tensors="pt")
        inputs = {k: v.to(self.device) for k, v in inputs.items()}
        
        with torch.no_grad():
            outputs = self.model(**inputs)
            probs = outputs.logits.softmax(-1)[0]
            
        predicted_idx = probs.argmax().item()
        confidence = probs[predicted_idx].item()
        
        return {
            "document_type": self.document_types[predicted_idx],
            "confidence": confidence,
            "predictions": [
                {
                    "label": label,
                    "confidence": probs[idx].item()
                }
                for idx, label in enumerate(self.document_types)
            ]
        }