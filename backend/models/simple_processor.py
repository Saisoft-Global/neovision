import logging
from typing import Dict, Any, List
import fitz  # PyMuPDF
from PIL import Image
import io
import os
import os as _os
import numpy as np

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
                # For images, use OCR-based extraction if available
                try:
                    return self._process_image_with_ocr(file_path)
                except Exception as e:
                    logger.error(f"Image OCR failed: {e}")
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
            bounding_boxes: List[Dict[str, Any]] = []
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
            
            # If no text was extracted (likely scanned PDF), fallback to OCR
            if not bounding_boxes:
                try:
                    logger.info("No text spans found in PDF; falling back to OCR on rendered image")
                    # Render first page to image
                    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))  # 2x scale for better OCR
                    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                    ocr_result = self._image_to_boxes_with_ocr(img)
                    doc.close()
                    return {
                        "extracted_text": ocr_result.get("extracted_text", "").strip(),
                        "document_type": "pdf",
                        "confidence": 0.8,
                        "bounding_boxes": ocr_result.get("bounding_boxes", [])
                    }
                except Exception as e:
                    logger.error(f"OCR fallback failed: {e}")
            
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

    def _process_image_with_ocr(self, file_path: str) -> Dict[str, Any]:
        """Process an image using OCR (pytesseract) to produce word boxes in quad format."""
        try:
            img = Image.open(file_path).convert("RGB")
            return self._image_to_boxes_with_ocr(img)
        except Exception as e:
            logger.error(f"Image OCR error: {e}")
            return {
                "extracted_text": "",
                "document_type": "image",
                "confidence": 0.0,
                "bounding_boxes": []
            }

    def _image_to_boxes_with_ocr(self, img: Image.Image) -> Dict[str, Any]:
        try:
            # Prefer PaddleOCR if available
            lang_env = (_os.getenv("OCR_LANG", "en").strip() or "en").lower()
            paddle_lang = "en" if lang_env.startswith("en") else lang_env
            try:
                from paddleocr import PaddleOCR
                ocr = PaddleOCR(use_angle_cls=True, lang=paddle_lang, show_log=False)
                result = ocr.ocr(np.array(img), cls=True)
                boxes: List[Dict[str, Any]] = []
                texts: List[str] = []
                # result is list per page; each item is list of [box, (text, conf)]
                for page in result:
                    if not isinstance(page, list):
                        continue
                    for line in page:
                        try:
                            box_pts = line[0]
                            text = (line[1][0] or "").strip()
                            conf = float(line[1][1] or 0.0)
                            if not text:
                                continue
                            # Ensure quad as [[x1,y1],...]
                            quad = [[float(p[0]), float(p[1])] for p in box_pts]
                            if len(quad) == 4:
                                boxes.append({"text": text, "box": quad, "confidence": conf})
                                texts.append(text)
                        except Exception:
                            continue
                return {"extracted_text": " ".join(texts), "bounding_boxes": boxes}
            except Exception as e:
                logger.info(f"PaddleOCR not available or failed ({e}); falling back to Tesseract if present")
                try:
                    import pytesseract
                    data = pytesseract.image_to_data(img, lang=("eng" if paddle_lang == "en" else paddle_lang), output_type=pytesseract.Output.DICT)
                    n = len(data.get("text", []))
                    boxes: List[Dict[str, Any]] = []
                    texts: List[str] = []
                    for i in range(n):
                        text = (data["text"][i] or "").strip()
                        if not text:
                            continue
                        x = int(data.get("left", [0])[i])
                        y = int(data.get("top", [0])[i])
                        w = int(data.get("width", [0])[i])
                        h = int(data.get("height", [0])[i])
                        quad = [
                            [x, y],
                            [x + w, y],
                            [x + w, y + h],
                            [x, y + h]
                        ]
                        boxes.append({"text": text, "box": quad, "confidence": float(data.get("conf", [0])[i] or 0) / 100.0})
                        texts.append(text)
                    return {"extracted_text": " ".join(texts), "bounding_boxes": boxes}
                except Exception:
                    return {"extracted_text": "", "bounding_boxes": []}
        except Exception as e:
            logger.error(f"pytesseract OCR failed: {e}")
            return {"extracted_text": "", "bounding_boxes": []}

