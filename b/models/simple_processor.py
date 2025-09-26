import logging
from typing import Dict, Any, List
import fitz  # PyMuPDF
from PIL import Image
import io
import os

logger = logging.getLogger(__name__)

class SimpleDocumentProcessor:
    """Simple document processor for bbox extraction without heavy ML dependencies"""
    
    def __init__(self):
        logger.info("Initializing SimpleDocumentProcessor")
    
    def process_document(self, file_path: str) -> Dict[str, Any]:
        """Process document and extract bounding boxes using PyMuPDF"""
        try:
            logger.info(f"Processing document with SimpleDocumentProcessor: {file_path}")
            
            # Get file extension
            file_ext = os.path.splitext(file_path)[1].lower()
            
            if file_ext == '.pdf':
                return self._process_pdf(file_path)
            else:
                # For images, we'll return empty bounding boxes for now
                # In a real implementation, you'd use OCR here
                return {
                    "extracted_text": "",
                    "document_type": "image",
                    "confidence": 0.0,
                    "bounding_boxes": []
                }
                
        except Exception as e:
            logger.error(f"Error in SimpleDocumentProcessor: {e}")
            return {
                "extracted_text": "",
                "document_type": "unknown",
                "confidence": 0.0,
                "bounding_boxes": []
            }
    
    def _process_pdf(self, file_path: str) -> Dict[str, Any]:
        """Process PDF using PyMuPDF"""
        try:
            doc = fitz.open(file_path)
            if doc.page_count == 0:
                return {
                    "extracted_text": "",
                    "document_type": "pdf",
                    "confidence": 0.0,
                    "bounding_boxes": []
                }
            
            # Process first page
            page = doc.load_page(0)
            
            # Extract text blocks with bounding boxes
            blocks = page.get_text("dict")
            bounding_boxes = []
            extracted_text = ""
            
            for block in blocks.get("blocks", []):
                if "lines" in block:
                    for line in block["lines"]:
                        for span in line["spans"]:
                            text = span["text"].strip()
                            if text:
                                # Get bounding box
                                bbox = span["bbox"]  # [x0, y0, x1, y1]
                                
                                # Convert to quad format expected by the system
                                quad = [
                                    [bbox[0], bbox[1]],  # top-left
                                    [bbox[2], bbox[1]],  # top-right
                                    [bbox[2], bbox[3]],  # bottom-right
                                    [bbox[0], bbox[3]]   # bottom-left
                                ]
                                
                                bounding_boxes.append({
                                    "text": text,
                                    "box": quad,
                                    "confidence": 0.9  # PyMuPDF doesn't provide confidence, use default
                                })
                                
                                extracted_text += text + " "
            
            doc.close()
            
            return {
                "extracted_text": extracted_text.strip(),
                "document_type": "pdf",
                "confidence": 0.9,
                "bounding_boxes": bounding_boxes
            }
            
        except Exception as e:
            logger.error(f"Error processing PDF: {e}")
            return {
                "extracted_text": "",
                "document_type": "pdf",
                "confidence": 0.0,
                "bounding_boxes": []
            }

