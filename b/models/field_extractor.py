from typing import Dict, Any, List, Optional
import torch
from transformers import DonutProcessor, VisionEncoderDecoderModel
from PIL import Image
import re

class FieldExtractor:
    """Extracts fields from documents using Donut model"""
    
    def __init__(self):
        self.model_name = "naver-clova-ix/donut-base-finetuned-cord-v2"
        self.processor = DonutProcessor.from_pretrained(self.model_name)
        self.model = VisionEncoderDecoderModel.from_pretrained(self.model_name)
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model.to(self.device)
        
        self.field_patterns = {
            "invoice_number": r"(?i)inv[oice]*[\s#:]+([A-Z0-9-]+)",
            "date": r"(?i)date[d:\s]*([0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{2,4})",
            "total_amount": r"(?i)total[\s:]*[$€£¥]?\s*([0-9,]+\.?[0-9]*)",
            "email": r"[\w\.-]+@[\w\.-]+\.\w+",
            "phone": r"(?:\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}",
            "address": r"\d+\s+[A-Za-z0-9\s,]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr)\s+[A-Za-z\s]+,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?",
        }

    def extract_fields(self, image: Image.Image, document_type: str) -> List[Dict[str, Any]]:
        """Extract fields based on document type"""
        pixel_values = self.processor(image, return_tensors="pt").pixel_values
        pixel_values = pixel_values.to(self.device)
        
        with torch.no_grad():
            outputs = self.model.generate(
                pixel_values,
                max_length=512,
                num_beams=4,
                early_stopping=True
            )
        
        decoded_text = self.processor.batch_decode(outputs, skip_special_tokens=True)[0]
        fields = self._extract_fields_from_text(decoded_text, document_type)
        
        return fields

    def _extract_fields_from_text(self, text: str, document_type: str) -> List[Dict[str, Any]]:
        """Extract fields from decoded text using regex patterns"""
        fields = []
        
        for field_name, pattern in self.field_patterns.items():
            matches = re.finditer(pattern, text)
            for idx, match in enumerate(matches):
                try:
                    value = match.group(1) if match.groups() else match.group(0)
                    fields.append({
                        "id": f"{field_name}_{idx}",
                        "label": field_name.replace("_", " ").title(),
                        "value": value,
                        "confidence": 0.95,  # Base confidence for regex matches
                        "bbox": None  # Bounding box not available from regex
                    })
                except (IndexError, AttributeError):
                    continue
        
        # Add document-type specific field extraction
        if document_type == "invoice":
            fields.extend(self._extract_invoice_fields(text))
        elif document_type == "receipt":
            fields.extend(self._extract_receipt_fields(text))
        
        return fields

    def _extract_invoice_fields(self, text: str) -> List[Dict[str, Any]]:
        """Extract invoice-specific fields"""
        fields = []
        
        # Extract PO number
        po_match = re.search(r"(?i)PO[\s#:]+([A-Z0-9-]+)", text)
        if po_match:
            fields.append({
                "id": "po_number_0",
                "label": "PO Number",
                "value": po_match.group(1),
                "confidence": 0.95,
                "bbox": None
            })
        
        # Extract payment terms
        terms_match = re.search(r"(?i)terms?[\s:]+(.+?)(?:\n|$)", text)
        if terms_match:
            fields.append({
                "id": "payment_terms_0",
                "label": "Payment Terms",
                "value": terms_match.group(1).strip(),
                "confidence": 0.90,
                "bbox": None
            })
        
        return fields

    def _extract_receipt_fields(self, text: str) -> List[Dict[str, Any]]:
        """Extract receipt-specific fields"""
        fields = []
        
        # Extract merchant name
        merchant_match = re.search(r"(?i)^([A-Za-z0-9\s&]+)(?:\n|$)", text)
        if merchant_match:
            fields.append({
                "id": "merchant_name_0",
                "label": "Merchant Name",
                "value": merchant_match.group(1).strip(),
                "confidence": 0.90,
                "bbox": None
            })
        
        # Extract payment method
        payment_match = re.search(r"(?i)(?:paid|payment|method)[\s:]+(\w+)", text)
        if payment_match:
            fields.append({
                "id": "payment_method_0",
                "label": "Payment Method",
                "value": payment_match.group(1),
                "confidence": 0.85,
                "bbox": None
            })
        
        return fields