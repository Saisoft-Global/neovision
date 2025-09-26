from typing import Dict, Any, List
from PIL import Image
import numpy as np
from paddleocr import PaddleOCR
import torch

class OCREngine:
    """Advanced OCR engine using PaddleOCR with post-processing"""
    
    def __init__(self):
        self.ocr = PaddleOCR(
            use_angle_cls=True,
            lang='en',
            use_gpu=torch.cuda.is_available(),
            show_log=False
        )
        
        self.confidence_threshold = 0.6
        self.text_cleaning_patterns = [
            (r'\s+', ' '),  # Normalize whitespace
            (r'[^\x00-\x7F]+', ''),  # Remove non-ASCII characters
            (r'^\W+|\W+$', '')  # Remove leading/trailing non-word characters
        ]

    def extract_text(self, image: Image.Image) -> List[Dict[str, Any]]:
        """Extract text from image with advanced post-processing"""
        # Convert PIL Image to numpy array
        img_array = np.array(image)
        
        # Perform OCR
        ocr_result = self.ocr.ocr(img_array)
        
        # Extract and process text blocks
        text_blocks = []
        for block in ocr_result:
            for line in block:
                bbox = line[0]
                text = line[1][0]
                confidence = line[1][1]
                
                if confidence < self.confidence_threshold:
                    continue
                
                # Clean and normalize text
                cleaned_text = self._clean_text(text)
                if not cleaned_text:
                    continue
                
                # Calculate normalized bounding box
                normalized_bbox = self._normalize_bbox(bbox, image.size)
                
                text_blocks.append({
                    "text": cleaned_text,
                    "bbox": normalized_bbox,
                    "confidence": confidence,
                    "orientation": self._detect_text_orientation(bbox)
                })
        
        return text_blocks

    def _clean_text(self, text: str) -> str:
        """Clean and normalize extracted text"""
        import re
        
        cleaned = text.strip()
        for pattern, replacement in self.text_cleaning_patterns:
            cleaned = re.sub(pattern, replacement, cleaned)
        
        return cleaned.strip()

    def _normalize_bbox(self, bbox: List[List[int]], image_size: tuple) -> List[int]:
        """Normalize bounding box coordinates"""
        width, height = image_size
        
        # Convert points to [x1, y1, x2, y2] format
        x_coords = [point[0] for point in bbox]
        y_coords = [point[1] for point in bbox]
        
        return [
            min(x_coords),
            min(y_coords),
            max(x_coords),
            max(y_coords)
        ]

    def _detect_text_orientation(self, bbox: List[List[int]]) -> float:
        """Detect text orientation in degrees"""
        import math
        
        # Calculate angle between first two points
        x1, y1 = bbox[0]
        x2, y2 = bbox[1]
        
        angle = math.degrees(math.atan2(y2 - y1, x2 - x1))
        return angle