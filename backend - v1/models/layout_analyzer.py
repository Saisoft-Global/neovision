from typing import Dict, Any, List
import torch
from transformers import LayoutLMv3Processor, LayoutLMv3ForTokenClassification
from PIL import Image
import numpy as np

class LayoutAnalyzer:
    """Analyzes document layout and structure using LayoutLMv3"""
    
    def __init__(self):
        self.model_name = "microsoft/layoutlmv3-base"
        self.processor = LayoutLMv3Processor.from_pretrained(self.model_name)
        self.model = LayoutLMv3ForTokenClassification.from_pretrained(self.model_name)
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model.to(self.device)
        
        self.label2id = {
            "O": 0,
            "B-header": 1,
            "I-header": 2,
            "B-question": 3,
            "I-question": 4,
            "B-answer": 5,
            "I-answer": 6,
            "B-table": 7,
            "I-table": 8
        }
        self.id2label = {v: k for k, v in self.label2id.items()}

    def analyze(self, image: Image.Image, text_blocks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Analyze document layout and identify structural elements"""
        encoding = self.processor(
            image,
            text=[block["text"] for block in text_blocks],
            boxes=[block["bbox"] for block in text_blocks],
            return_tensors="pt"
        )
        
        encoding = {k: v.to(self.device) for k, v in encoding.items()}
        
        with torch.no_grad():
            outputs = self.model(**encoding)
            predictions = outputs.logits.argmax(-1).squeeze().cpu().numpy()
        
        layout_blocks = []
        current_block = None
        
        for idx, (pred, block) in enumerate(zip(predictions, text_blocks)):
            label = self.id2label[pred]
            confidence = float(outputs.logits.softmax(-1)[0, idx, pred].cpu().numpy())
            
            if label.startswith("B-"):
                if current_block:
                    layout_blocks.append(current_block)
                
                block_type = label[2:]
                current_block = {
                    "type": block_type,
                    "text": block["text"],
                    "bbox": block["bbox"],
                    "confidence": confidence
                }
            elif label.startswith("I-") and current_block:
                current_block["text"] += " " + block["text"]
                current_block["bbox"] = self._merge_bboxes(
                    current_block["bbox"], 
                    block["bbox"]
                )
                current_block["confidence"] = (current_block["confidence"] + confidence) / 2
        
        if current_block:
            layout_blocks.append(current_block)
            
        return layout_blocks

    def _merge_bboxes(self, bbox1: List[float], bbox2: List[float]) -> List[float]:
        return [
            min(bbox1[0], bbox2[0]),
            min(bbox1[1], bbox2[1]),
            max(bbox1[2], bbox2[2]),
            max(bbox1[3], bbox2[3])
        ]