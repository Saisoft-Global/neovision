import pytesseract
from PIL import Image
import numpy as np
import cv2
from typing import Dict, Any, List, Optional
import re

class DocumentProcessor:
    def __init__(self):
        self.confidence_threshold = 0.6

    def process_image(self, image: Image.Image) -> Dict[str, Any]:
        """Process document image and extract information"""
        # Convert PIL Image to numpy array for OpenCV
        img_array = np.array(image)
        if len(img_array.shape) == 2:  # Grayscale
            img_array = cv2.cvtColor(img_array, cv2.COLOR_GRAY2BGR)
        elif img_array.shape[2] == 4:  # RGBA
            img_array = cv2.cvtColor(img_array, cv2.COLOR_RGBA2BGR)

        # Preprocess image
        processed = self._preprocess_image(img_array)
        
        # Perform OCR
        ocr_data = pytesseract.image_to_data(processed, output_type=pytesseract.Output.DICT)
        
        # Extract fields
        fields = self._extract_fields(ocr_data)
        
        # Classify document type
        doc_type = self._classify_document_type(fields)
        
        return {
            "fields": fields,
            "documentType": doc_type,
            "confidence": self._calculate_confidence(fields)
        }

    def _preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """Preprocess image for better OCR results"""
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Apply thresholding
        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # Denoise
        denoised = cv2.fastNlMeansDenoising(binary)
        
        return denoised

    def _extract_fields(self, ocr_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract fields from OCR data"""
        fields = []
        n_boxes = len(ocr_data['text'])
        
        for i in range(n_boxes):
            text = ocr_data['text'][i].strip()
            conf = int(ocr_data['conf'][i])
            
            if not text or conf < 0:  # Skip empty or low confidence text
                continue
                
            confidence = conf / 100.0
            if confidence < self.confidence_threshold:
                continue
            
            # Get bounding box
            bbox = [
                ocr_data['left'][i],
                ocr_data['top'][i],
                ocr_data['left'][i] + ocr_data['width'][i],
                ocr_data['top'][i] + ocr_data['height'][i]
            ]
            
            # Detect field type
            field_type = self._detect_field_type(text)
            if field_type:
                fields.append({
                    "id": f"{field_type}_{len(fields)}",
                    "label": field_type.replace("_", " ").title(),
                    "value": text,
                    "confidence": confidence,
                    "bbox": bbox
                })
        
        return fields

    def _detect_field_type(self, text: str) -> Optional[str]:
        """Detect field type based on content patterns"""
        text_lower = text.lower()
        
        # Invoice number patterns
        if re.search(r'inv[oice]*[\s#:]+\d+', text_lower) or re.search(r'invoice number', text_lower):
            return "invoice_number"
            
        # Date patterns
        if re.search(r'\d{1,2}[-/]\d{1,2}[-/]\d{2,4}', text) or re.search(r'date[d:]*', text_lower):
            return "date"
            
        # Amount patterns
        if re.search(r'\$?\s*\d+,?\d*\.\d{2}', text):
            if 'total' in text_lower:
                return "total_amount"
            elif 'tax' in text_lower:
                return "tax_amount"
            return "amount"
            
        # Contact information
        if any(word in text_lower for word in ['tel', 'phone', 'fax', 'email', '@']):
            return "contact_info"
            
        # Address patterns
        if re.search(r'\d+\s+[a-zA-Z0-9\s,]+(?:street|st|avenue|ave|road|rd|boulevard|blvd)', text_lower):
            return "address"
            
        # Line item patterns
        if any(word in text_lower for word in ['qty', 'quantity', 'description', 'price', 'amount']):
            return "line_item"
            
        return None

    def _classify_document_type(self, fields: List[Dict[str, Any]]) -> str:
        """Classify document type based on extracted fields"""
        text = " ".join(f"{field['label']} {field['value']}" for field in fields).lower()
        
        if any(word in text for word in ["invoice", "bill to"]):
            return "invoice"
        elif any(word in text for word in ["purchase order", "po number"]):
            return "purchase_order"
        elif any(word in text for word in ["receipt", "merchant"]):
            return "receipt"
        else:
            return "unknown"

    def _calculate_confidence(self, fields: List[Dict[str, Any]]) -> float:
        """Calculate overall confidence score"""
        if not fields:
            return 0.0
        return sum(field["confidence"] for field in fields) / len(fields)