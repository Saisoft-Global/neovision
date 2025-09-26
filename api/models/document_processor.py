from typing import Dict, Any, List, Optional
import torch
from PIL import Image
import numpy as np
from paddleocr import PaddleOCR
from transformers import (
    DonutProcessor, 
    VisionEncoderDecoderModel,
    LayoutLMv3Processor,
    LayoutLMv3ForTokenClassification
)
import cv2
import re
from .table_detector import TableDetector

class DocumentProcessor:
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
        # Initialize OCR
        self.ocr = PaddleOCR(
            use_angle_cls=True,
            lang='en',
            use_gpu=torch.cuda.is_available(),
            show_log=False
        )
        
        # Initialize LayoutLMv3
        layout_model_name = "microsoft/layoutlmv3-base"
        self.layout_processor = LayoutLMv3Processor.from_pretrained(layout_model_name)
        self.layout_model = LayoutLMv3ForTokenClassification.from_pretrained(
            layout_model_name,
            num_labels=len(self.label2id)
        ).to(self.device)
        
        # Initialize Donut model
        donut_model_name = "naver-clova-ix/donut-base-finetuned-cord-v2"
        self.donut_processor = DonutProcessor.from_pretrained(donut_model_name)
        self.donut_model = VisionEncoderDecoderModel.from_pretrained(donut_model_name).to(self.device)
        
        # Initialize table detector
        self.table_detector = TableDetector()

        # Label mappings for LayoutLMv3
        self.label2id = {
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
            "B-description": 10,
            "I-invoice_number": 11,
            "I-date": 12,
            "I-total_amount": 13,
            "I-tax_amount": 14,
            "I-vendor_name": 15,
            "I-customer_name": 16,
            "I-line_item": 17,
            "I-quantity": 18,
            "I-unit_price": 19,
            "I-description": 20
        }
        self.id2label = {v: k for k, v in self.label2id.items()}

    def process_image(self, image: Image.Image) -> Dict[str, Any]:
        """Process document image and extract information"""
        # Convert PIL Image to numpy array for OpenCV
        img_array = np.array(image)
        if len(img_array.shape) == 2:  # Grayscale
            img_array = cv2.cvtColor(img_array, cv2.COLOR_GRAY2BGR)
        elif img_array.shape[2] == 4:  # RGBA
            img_array = cv2.cvtColor(img_array, cv2.COLOR_RGBA2BGR)

        # Perform OCR
        ocr_result = self.ocr.ocr(img_array)
        text_blocks = self._extract_text_blocks(ocr_result)
        
        # Process with LayoutLMv3
        layout_fields = self._process_with_layout(image, text_blocks)
        
        # Detect tables
        table_bboxes = self.table_detector.detect_tables(img_array)
        tables = []
        for bbox in table_bboxes:
            table = self.table_detector.process_table(img_array, bbox)
            if self._is_line_items_table(table.header_row):
                tables.append(table)
        
        # Extract line items from tables
        line_items = []
        for table in tables:
            items = self._extract_line_items_from_table(table)
            line_items.extend(items)
        
        # Combine all fields
        fields = self._combine_fields(layout_fields, line_items)
        
        # Determine document type
        doc_type = self._classify_document_type(fields)
        
        return {
            "fields": fields,
            "documentType": doc_type,
            "confidence": self._calculate_confidence(fields)
        }

    def _process_with_layout(self, image: Image.Image, text_blocks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Process image with LayoutLMv3"""
        # Prepare input features
        encoding = self.layout_processor(
            image,
            text=[block["text"] for block in text_blocks],
            boxes=[block["bbox"] for block in text_blocks],
            return_tensors="pt"
        )
        
        # Move to device
        encoding = {k: v.to(self.device) for k, v in encoding.items()}
        
        # Get predictions
        outputs = self.layout_model(**encoding)
        predictions = outputs.logits.argmax(-1).squeeze().cpu().numpy()
        
        # Convert predictions to fields
        fields = []
        current_field = None
        
        for idx, (pred, block) in enumerate(zip(predictions, text_blocks)):
            label = self.id2label[pred]
            
            if label.startswith("B-"):
                if current_field:
                    fields.append(current_field)
                
                field_type = label[2:]
                current_field = {
                    "id": f"{field_type}_{len(fields)}",
                    "label": field_type.replace("_", " ").title(),
                    "value": block["text"],
                    "confidence": float(outputs.logits.softmax(-1)[0, idx, pred].cpu().numpy()),
                    "bbox": block["bbox"]
                }
            elif label.startswith("I-") and current_field:
                current_field["value"] += " " + block["text"]
                current_field["bbox"] = self._merge_bboxes(current_field["bbox"], block["bbox"])
        
        if current_field:
            fields.append(current_field)
        
        return fields

    def _extract_text_blocks(self, ocr_result) -> List[Dict[str, Any]]:
        """Extract text blocks from OCR result"""
        text_blocks = []
        for block in ocr_result:
            for line in block:
                bbox = line[0]
                text = line[1][0]
                confidence = line[1][1]
                
                text_blocks.append({
                    "text": text,
                    "bbox": [
                        min(p[0] for p in bbox),  # x1
                        min(p[1] for p in bbox),  # y1
                        max(p[0] for p in bbox),  # x2
                        max(p[1] for p in bbox)   # y2
                    ],
                    "confidence": confidence
                })
        return text_blocks

    def _merge_bboxes(self, bbox1: List[float], bbox2: List[float]) -> List[float]:
        """Merge two bounding boxes"""
        return [
            min(bbox1[0], bbox2[0]),  # x1
            min(bbox1[1], bbox2[1]),  # y1
            max(bbox1[2], bbox2[2]),  # x2
            max(bbox1[3], bbox2[3])   # y2
        ]

    def _is_line_items_table(self, headers: List[str]) -> bool:
        """Check if table contains line items"""
        header_keywords = {
            "item", "description", "quantity", "qty", "price", 
            "amount", "total", "unit", "sku", "part"
        }
        return any(
            any(keyword in header.lower() for keyword in header_keywords)
            for header in headers if header
        )

    def _extract_line_items_from_table(self, table: Any) -> List[Dict[str, Any]]:
        """Extract line items from table"""
        line_items = []
        header_map = self._map_headers(table.header_row)
        
        # Skip header row
        for row_idx, row in enumerate(table.cells[1:], 1):
            item = {
                "id": f"line_item_{row_idx}",
                "description": "",
                "quantity": None,
                "unit_price": None,
                "total": None,
                "bbox": None
            }
            
            for col_idx, cell in enumerate(row):
                if not cell or not cell.text:
                    continue
                
                header_type = header_map.get(col_idx)
                if header_type:
                    value = cell.text.strip()
                    if header_type == "description":
                        item["description"] = value
                    elif header_type == "quantity":
                        item["quantity"] = self._extract_number(value)
                    elif header_type == "unit_price":
                        item["unit_price"] = self._extract_amount(value)
                    elif header_type == "total":
                        item["total"] = self._extract_amount(value)
                
                if cell.bbox:
                    item["bbox"] = cell.bbox if not item["bbox"] else self._merge_bboxes(item["bbox"], cell.bbox)
            
            if item["description"] or item["quantity"] or item["unit_price"]:
                line_items.append(item)
        
        return line_items

    def _map_headers(self, headers: List[str]) -> Dict[int, str]:
        """Map table headers to field types"""
        header_map = {}
        for col, header in enumerate(headers):
            if not header:
                continue
            
            header_lower = header.lower()
            if any(keyword in header_lower for keyword in ["description", "item", "product"]):
                header_map[col] = "description"
            elif any(keyword in header_lower for keyword in ["quantity", "qty"]):
                header_map[col] = "quantity"
            elif any(keyword in header_lower for keyword in ["unit price", "price", "rate"]):
                header_map[col] = "unit_price"
            elif any(keyword in header_lower for keyword in ["amount", "total"]):
                header_map[col] = "total"
        
        return header_map

    def _extract_number(self, text: str) -> Optional[float]:
        """Extract number from text"""
        match = re.search(r'\d+\.?\d*', text)
        return float(match.group()) if match else None

    def _extract_amount(self, text: str) -> Optional[float]:
        """Extract amount from text"""
        match = re.search(r'\$?\s*(\d+(?:,\d{3})*\.?\d*)', text)
        return float(match.group(1).replace(',', '')) if match else None

    def _combine_fields(self, layout_fields: List[Dict[str, Any]], line_items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Combine all extracted fields"""
        fields = layout_fields.copy()
        
        # Add line items
        for item in line_items:
            base_id = item["id"]
            base_confidence = 0.9
            
            if item["description"]:
                fields.append({
                    "id": f"{base_id}_description",
                    "label": "Description",
                    "value": item["description"],
                    "confidence": base_confidence,
                    "bbox": item["bbox"]
                })
            
            if item["quantity"]:
                fields.append({
                    "id": f"{base_id}_quantity",
                    "label": "Quantity",
                    "value": str(item["quantity"]),
                    "confidence": base_confidence,
                    "bbox": item["bbox"]
                })
            
            if item["unit_price"]:
                fields.append({
                    "id": f"{base_id}_price",
                    "label": "Unit Price",
                    "value": f"${item['unit_price']:.2f}",
                    "confidence": base_confidence,
                    "bbox": item["bbox"]
                })
            
            if item["total"]:
                fields.append({
                    "id": f"{base_id}_total",
                    "label": "Total",
                    "value": f"${item['total']:.2f}",
                    "confidence": base_confidence,
                    "bbox": item["bbox"]
                })
        
        return fields

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