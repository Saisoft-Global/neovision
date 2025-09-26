import logging
from typing import Dict, Any, List, Optional, Tuple
import torch
from PIL import Image
import numpy as np
from paddleocr import PaddleOCR
import spacy
from transformers import LayoutLMv3Processor, LayoutLMv3ForTokenClassification
import re
from fastapi import HTTPException
import fitz  # PyMuPDF
import io
import os

# Configure logger
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

class DocumentProcessor:
    def __init__(self):
        # Label mappings
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
            "B-description": 10
        }
        self.id2label = {v: k for k, v in self.label2id.items()}

        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"Using device: {self.device}")
        
        # Initialize OCR
        self.ocr = PaddleOCR(
            use_angle_cls=True,
            lang='en',
            use_gpu=torch.cuda.is_available(),
            show_log=False
        )
        
        # Initialize spaCy
        self.nlp = spacy.load('en_core_web_sm')
        
        # Initialize LayoutLMv3 for template-free document understanding
        layout_model_name = "microsoft/layoutlmv3-base"
        logger.info("Initializing LayoutLMv3 for template-free processing...")
        self.layout_processor = LayoutLMv3Processor.from_pretrained(
            layout_model_name,
            apply_ocr=False  # Important: Set to False since we use PaddleOCR
        )
        
        # Use the base model without custom classification head for template-free processing
        self.layout_model = LayoutLMv3ForTokenClassification.from_pretrained(
            layout_model_name,
            num_labels=2  # Simple binary classification: text vs non-text
        ).to(self.device)
        
        logger.info("LayoutLMv3 initialized for template-free processing")

        # Document type patterns
        self.doc_type_patterns = {
            'invoice': [
                r'invoice\s*#?\s*[\w-]+',
                r'bill\s*to',
                r'ship\s*to',
                r'total\s*amount',
                r'\$\s*\d+\.?\d*',
                r'payment\s*terms',
                r'due\s*date'
            ],
            'technical_doc': [
                r'revision\s*[A-Z0-9]+',
                r'document\s*number',
                r'technical\s*specification',
                r'engineering\s*drawing',
                r'TEC-[A-Z0-9-]+',
                r'IBU-[A-Z0-9-]+',
                r'TEC-MOS-\d{2}-\d{2}-\d{2}-\d{4}',
                r'Rev-[A-Z]',
                r'technical\s*data',
                r'specification\s*sheet'
            ],
            'engineering_doc': [
                r'drawing\s*number',
                r'scale',
                r'project\s*number',
                r'engineering\s*notes',
                r'IBU-\d{3}',
                r'revision\s*history',
                r'4669-IBU-\d{3}-\w{3}-\w{3}-\w{2}-\d{6}',
                r'Rev\s*\d{2}',
                r'engineering\s*drawing',
                r'design\s*specification'
            ]
        }
        
        # Field patterns for different document types
        self.field_patterns = {
            'invoice': {
                'invoice_number': [r'invoice\s*#?\s*([\w-]+)', r'inv[.-]?\s*#?\s*([\w-]+)'],
                'date': [r'date:?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})', r'dated:?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})'],
                'due_date': [r'due\s*date:?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})', r'payment\s*due:?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})'],
                'total_amount': [r'total:?\s*[\$€£]?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)', r'amount\s*due:?\s*[\$€£]?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)'],
                'subtotal': [r'subtotal:?\s*[\$€£]?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)'],
                'tax': [r'tax:?\s*[\$€£]?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)', r'vat:?\s*[\$€£]?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)'],
                'vendor_name': [r'from:?\s*([^\n]+)', r'vendor:?\s*([^\n]+)', r'supplier:?\s*([^\n]+)'],
                'customer_name': [r'to:?\s*([^\n]+)', r'bill\s*to:?\s*([^\n]+)', r'customer:?\s*([^\n]+)']
            },
            'technical_doc': {
                'doc_number': [r'document\s*number:?\s*([A-Z0-9-]+)', r'doc[.-]?\s*#?\s*([A-Z0-9-]+)', r'TEC-MOS-\d{2}-\d{2}-\d{2}-\d{4}'],
                'revision': [r'revision:?\s*([A-Z0-9]+)', r'rev[.-]?\s*#?\s*([A-Z0-9]+)', r'Rev-[A-Z]'],
                'date': [r'date:?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})', r'dated:?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})'],
                'title': [r'title:?\s*([^\n]+)', r'subject:?\s*([^\n]+)', r'description:?\s*([^\n]+)'],
                'author': [r'author:?\s*([^\n]+)', r'prepared\s*by:?\s*([^\n]+)', r'created\s*by:?\s*([^\n]+)'],
                'department': [r'department:?\s*([^\n]+)', r'division:?\s*([^\n]+)'],
                'specification': [r'specification:?\s*([^\n]+)', r'technical\s*data:?\s*([^\n]+)'],
                'part_number': [r'part\s*number:?\s*([A-Z0-9-]+)', r'part\s*#:?\s*([A-Z0-9-]+)']
            },
            'engineering_doc': {
                'drawing_number': [r'drawing\s*number:?\s*([A-Z0-9-]+)', r'dwg[.-]?\s*#?\s*([A-Z0-9-]+)', r'4669-IBU-\d{3}-\w{3}-\w{3}-\w{2}-\d{6}'],
                'revision': [r'revision:?\s*([A-Z0-9]+)', r'rev[.-]?\s*#?\s*([A-Z0-9]+)', r'Rev\s*\d{2}'],
                'scale': [r'scale:?\s*([^\n]+)', r'drawn\s*scale:?\s*([^\n]+)'],
                'project_number': [r'project\s*number:?\s*([A-Z0-9-]+)', r'proj[.-]?\s*#?\s*([A-Z0-9-]+)'],
                'date': [r'date:?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})', r'dated:?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})'],
                'engineer': [r'engineer:?\s*([^\n]+)', r'designed\s*by:?\s*([^\n]+)', r'drawn\s*by:?\s*([^\n]+)'],
                'design_spec': [r'design\s*specification:?\s*([^\n]+)', r'engineering\s*notes:?\s*([^\n]+)'],
                'material': [r'material:?\s*([^\n]+)', r'construction:?\s*([^\n]+)']
            }
        }

    def process_document(self, file_path: str) -> Dict[str, Any]:
        """
        Process a document file (PDF or image) and extract information.
        
        Args:
            file_path: Path to the document file
            
        Returns:
            Dictionary containing extracted information
        """
        try:
            logger.info(f"Processing document: {file_path}")
            
            # Determine file type
            file_type = self._get_file_type(file_path)
            
            if file_type == "application/pdf":
                return self._process_pdf(file_path)
            else:
                return self._process_image(file_path)
                
        except Exception as e:
            logger.error(f"Error processing document: {str(e)}")
            raise

    def _process_pdf(self, file_path: str) -> Dict[str, Any]:
        """Process a PDF document."""
        try:
            # Open PDF
            doc = fitz.open(file_path)
            
            # Extract text from all pages
            full_text = ""
            for page in doc:
                full_text += page.get_text()
            
            # Convert each page to image for OCR
            images = []
            for page in doc:
                pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))  # 2x zoom for better quality
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                images.append(img)
            
            # Process each page
            all_results = []
            for img in images:
                result = self.process_image(img)
                all_results.append(result)
            
            # Combine results
            combined_result = self._combine_results(all_results)
            
            # Add full text
            combined_result["extracted_text"] = full_text
            
            # Determine document type
            doc_type = self._classify_document_type(full_text)
            combined_result["document_type"] = doc_type
            
            # Extract fields based on document type
            fields = self._extract_fields(full_text, doc_type)
            combined_result["extracted_fields"] = fields
            
            # Calculate confidence
            confidence = self._calculate_confidence(fields, doc_type)
            combined_result["confidence"] = confidence
            
            # Add file information
            combined_result["file_type"] = "application/pdf"
            combined_result["file_name"] = os.path.basename(file_path)
            
            # Extract tables if present
            tables = self._extract_tables(doc)
            combined_result["tables"] = tables
            
            # Extract headers and footers
            headers, footers = self._extract_headers_footers(doc)
            combined_result["headers"] = headers
            combined_result["footers"] = footers
            
            doc.close()
            return combined_result
            
        except Exception as e:
            logger.error(f"Error processing PDF: {str(e)}")
            raise

    def _process_image(self, file_path: str) -> Dict[str, Any]:
        """Process a single image and extract information."""
        try:
            # Open image
            image = Image.open(file_path)
            
            # Process the image
            result = self.process_image(image)
            
            # Add file information
            result["file_type"] = self._get_file_type(file_path)
            result["file_name"] = os.path.basename(file_path)
            
            return result
            
        except Exception as e:
            logger.error(f"Error processing image: {str(e)}")
            raise

    def process_image(self, image: Image.Image) -> Dict[str, Any]:
        """Process a single image and extract information."""
        logger.info("=== Starting process_image ===")
        try:
            # Convert image to RGB if needed
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Convert PIL Image to numpy array for OCR
            img_array = np.array(image)
            
            # Perform OCR
            logger.info("Starting OCR processing")
            logger.info(f"Image array shape: {img_array.shape}, dtype: {img_array.dtype}")
            try:
                ocr_result = self.ocr.ocr(img_array, cls=True)
                logger.info(f"OCR result type: {type(ocr_result)}")
                logger.info(f"OCR result length: {len(ocr_result) if isinstance(ocr_result, list) else 'not a list'}")
            except Exception as e:
                logger.error(f"OCR processing failed: {str(e)}", exc_info=True)
                return {
                    "extracted_text": "",
                    "document_type": "unknown",
                    "confidence": 0.0,
                    "bounding_boxes": []
                }
            
            # Extract text and bounding boxes
            extracted_text = ""
            bounding_boxes = []
            
            # Handle different OCR result structures
            if ocr_result is None:
                logger.warning("OCR result is None")
                return {
                    "extracted_text": "",
                    "document_type": "unknown",
                    "confidence": 0.0,
                    "bounding_boxes": []
                }
            
            # Process OCR result based on its structure
            if isinstance(ocr_result, list):
                # Handle the case where ocr_result is a list of pages
                for page_idx, page in enumerate(ocr_result):
                    if not isinstance(page, list):
                        logger.warning(f"Page {page_idx} is not a list: {type(page)}")
                        continue
                        
                    for line_idx, line in enumerate(page):
                        try:
                            if not isinstance(line, list) or len(line) < 2:
                                logger.warning(f"Line {line_idx} in page {page_idx} is invalid: {line}")
                                continue
                                
                            # Extract text and confidence
                            text = line[1][0] if isinstance(line[1], list) and len(line[1]) > 0 else ""
                            confidence = line[1][1] if isinstance(line[1], list) and len(line[1]) > 1 else 0.0
                            
                            # Extract bounding box
                            box = line[0] if isinstance(line[0], list) else []
                            
                            if text:
                                extracted_text += text + "\n"
                                bounding_boxes.append({
                                    'text': text,
                                    'confidence': float(confidence),
                                    'box': box
                                })
                        except (IndexError, TypeError, ValueError) as e:
                            logger.warning(f"Error processing OCR line {line_idx} in page {page_idx}: {str(e)}")
                            continue
            
            logger.info(f"Extracted {len(bounding_boxes)} text blocks")
            
            # If no text was extracted, return early
            if not extracted_text.strip():
                logger.warning("No text extracted from image")
                return {
                    "extracted_text": "",
                    "document_type": "unknown",
                    "confidence": 0.0,
                    "bounding_boxes": []
                }
            
            # Use LayoutLM for template-free document understanding
            logger.info("Using LayoutLM for template-free field extraction")
            extracted_fields = self._extract_fields_template_free(image, extracted_text, bounding_boxes)
            
            # Calculate confidence based on extracted fields
            confidence = self._calculate_confidence(extracted_fields)
            
            # Clean up extracted text
            extracted_text = extracted_text.strip()
            
            # Determine document type
            doc_type = self._classify_document_type(extracted_text)
            
            logger.info(f"Document processing complete. Type: {doc_type}, Confidence: {confidence}")
            
            return {
                "extracted_text": extracted_text,
                "document_type": doc_type,
                "confidence": confidence,
                "bounding_boxes": bounding_boxes,
                "extracted_fields": extracted_fields
            }
            
        except Exception as e:
            logger.error(f"=== CRITICAL ERROR in process_image: {str(e)} ===", exc_info=True)
            logger.error(f"Exception type: {type(e)}")
            logger.error(f"Exception args: {e.args}")
            raise HTTPException(
                status_code=400,
                detail=f"Error processing image: {str(e)}"
            )

    def _extract_fields_template_free(self, image: Image.Image, text: str, bounding_boxes: List[Dict]) -> Dict[str, str]:
        """Extract fields using LayoutLM for template-free document understanding."""
        fields = {}
        try:
            logger.info("Starting template-free field extraction with LayoutLM")
            
            # Prepare input for LayoutLM
            logger.info("Preparing LayoutLM input...")
            encoding = self.layout_processor(
                image,
                text,
                return_tensors="pt",
                truncation=True,
                max_length=512
            )
            logger.info("LayoutLM encoding successful")
            
            # Get model predictions for text classification
            logger.info("Getting LayoutLM predictions...")
            with torch.no_grad():
                outputs = self.layout_model(**encoding)
                predictions = outputs.logits.argmax(-1).squeeze().tolist()
                
            logger.info(f"Got {len(predictions)} predictions from LayoutLM")
            
            # Extract tokens
            if "input_ids" in encoding and len(encoding["input_ids"]) > 0:
                tokens = self.layout_processor.tokenizer.convert_ids_to_tokens(encoding["input_ids"][0])
                logger.info(f"Extracted {len(tokens)} tokens")
                
                # Ensure predictions and tokens have the same length
                if len(tokens) != len(predictions):
                    min_len = min(len(tokens), len(predictions))
                    tokens = tokens[:min_len]
                    predictions = predictions[:min_len]
                    logger.info(f"Aligned to {min_len} tokens")
                
                # Use LayoutLM embeddings for intelligent field extraction
                fields = self._extract_fields_from_layout_analysis(tokens, predictions, bounding_boxes, text)
            
            logger.info(f"Template-free extraction found {len(fields)} fields")
            
        except Exception as e:
            logger.error(f"Error in template-free extraction: {str(e)}", exc_info=True)
            # Fallback to basic field extraction
            fields = self._extract_basic_fields(text)
        
        return fields
    
    def _extract_fields_from_layout_analysis(self, tokens: List[str], predictions: List[int], 
                                           bounding_boxes: List[Dict], text: str) -> Dict[str, str]:
        """Extract fields using LayoutLM layout analysis."""
        fields = {}
        try:
            # Group tokens by spatial proximity using bounding boxes
            token_groups = self._group_tokens_by_layout(tokens, predictions, bounding_boxes)
            
            # Extract different types of information based on layout analysis
            fields.update(self._extract_numeric_fields(token_groups, text))
            fields.update(self._extract_date_fields(token_groups, text))
            fields.update(self._extract_identifier_fields(token_groups, text))
            fields.update(self._extract_text_fields(token_groups, text))
            
            logger.info(f"Layout analysis extracted: {list(fields.keys())}")
            
        except Exception as e:
            logger.error(f"Error in layout analysis: {str(e)}")
            
        return fields
    
    def _group_tokens_by_layout(self, tokens: List[str], predictions: List[int], 
                               bounding_boxes: List[Dict]) -> List[Dict]:
        """Group tokens by their spatial layout."""
        groups = []
        current_group = []
        
        for i, (token, pred) in enumerate(zip(tokens, predictions)):
            if token.startswith("##"):
                continue
                
            # Simple grouping based on prediction confidence
            if pred == 1:  # Assuming 1 means "important text"
                if current_group:
                    groups.append({
                        "tokens": current_group,
                        "text": " ".join(current_group)
                    })
                    current_group = []
                current_group.append(token)
            else:
                if current_group:
                    groups.append({
                        "tokens": current_group,
                        "text": " ".join(current_group)
                    })
                    current_group = []
        
        if current_group:
            groups.append({
                "tokens": current_group,
                "text": " ".join(current_group)
            })
            
        return groups
    
    def _extract_numeric_fields(self, token_groups: List[Dict], text: str) -> Dict[str, str]:
        """Extract numeric fields like amounts, quantities, etc."""
        fields = {}
        try:
            # Look for currency amounts
            amount_pattern = r'[\$€£¥]\s*\d+(?:,\d{3})*(?:\.\d{2})?|\d+(?:,\d{3})*(?:\.\d{2})?\s*(?:USD|EUR|GBP|JPY)'
            amounts = re.findall(amount_pattern, text)
            if amounts:
                fields['total_amount'] = amounts[0]
                if len(amounts) > 1:
                    fields['subtotal'] = amounts[1]
            
            # Look for quantities
            quantity_pattern = r'\b\d+\s*(?:pcs?|pieces?|units?|items?)\b'
            quantities = re.findall(quantity_pattern, text, re.IGNORECASE)
            if quantities:
                fields['quantity'] = quantities[0]
                
        except Exception as e:
            logger.error(f"Error extracting numeric fields: {str(e)}")
            
        return fields
    
    def _extract_date_fields(self, token_groups: List[Dict], text: str) -> Dict[str, str]:
        """Extract date fields."""
        fields = {}
        try:
            # Various date patterns
            date_patterns = [
                r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b',
                r'\b\d{4}[/-]\d{1,2}[/-]\d{1,2}\b',
                r'\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b'
            ]
            
            for pattern in date_patterns:
                dates = re.findall(pattern, text, re.IGNORECASE)
                if dates:
                    if 'date' not in fields:
                        fields['date'] = dates[0]
                    if len(dates) > 1 and 'due_date' not in fields:
                        fields['due_date'] = dates[1]
                        
        except Exception as e:
            logger.error(f"Error extracting date fields: {str(e)}")
            
        return fields
    
    def _extract_identifier_fields(self, token_groups: List[Dict], text: str) -> Dict[str, str]:
        """Extract identifier fields like invoice numbers, document numbers, etc."""
        fields = {}
        try:
            # Invoice/Document number patterns
            id_patterns = [
                r'(?:invoice|inv|doc|document|bill|receipt)[\s#-]*(\w+[-]?\w+)',
                r'(?:#|no\.?|number)[\s:]*(\w+[-]?\w+)',
                r'(\w{2,}-?\d{2,}-?\w*)'  # Generic ID pattern
            ]
            
            for pattern in id_patterns:
                matches = re.findall(pattern, text, re.IGNORECASE)
                if matches:
                    if 'invoice_number' not in fields:
                        fields['invoice_number'] = matches[0]
                    elif 'document_number' not in fields:
                        fields['document_number'] = matches[0]
                        
        except Exception as e:
            logger.error(f"Error extracting identifier fields: {str(e)}")
            
        return fields
    
    def _extract_text_fields(self, token_groups: List[Dict], text: str) -> Dict[str, str]:
        """Extract text fields like names, addresses, descriptions."""
        fields = {}
        try:
            # Look for names (Title Case words)
            name_pattern = r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b'
            names = re.findall(name_pattern, text)
            if names:
                fields['vendor_name'] = names[0]
                if len(names) > 1:
                    fields['customer_name'] = names[1]
            
            # Look for email addresses
            email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
            emails = re.findall(email_pattern, text)
            if emails:
                fields['email'] = emails[0]
                
        except Exception as e:
            logger.error(f"Error extracting text fields: {str(e)}")
            
        return fields
    
    def _extract_basic_fields(self, text: str) -> Dict[str, str]:
        """Fallback basic field extraction."""
        fields = {}
        try:
            # Basic patterns for any document type
            patterns = {
                'date': r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b',
                'amount': r'[\$€£¥]\s*\d+(?:,\d{3})*(?:\.\d{2})?',
                'number': r'(?:#|no\.?)[\s:]*(\w+)',
                'email': r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
            }
            
            for field, pattern in patterns.items():
                matches = re.findall(pattern, text)
                if matches:
                    fields[field] = matches[0]
                    
        except Exception as e:
            logger.error(f"Error in basic field extraction: {str(e)}")
            
        return fields

    def _extract_tables(self, doc: fitz.Document) -> List[Dict[str, Any]]:
        """Extract tables from PDF document."""
        tables = []
        try:
            for page in doc:
                # Get tables using PyMuPDF's table extraction
                table_list = page.get_tables()
                
                for table in table_list:
                    # Process table data
                    processed_table = {
                        "page": page.number + 1,
                        "data": [],
                        "bbox": table.bbox,
                        "headers": [],
                        "rows": []
                    }
                    
                    # Extract headers (first row)
                    if table.rows and table.rows[0]:
                        processed_table["headers"] = [cell.text.strip() for cell in table.rows[0]]
                    
                    # Extract data rows
                    for row in table.rows[1:]:
                        row_data = [cell.text.strip() for cell in row]
                        processed_table["rows"].append(row_data)
                    
                    # Add table type detection
                    table_type = self._detect_table_type(processed_table["headers"])
                    processed_table["type"] = table_type
                    
                    tables.append(processed_table)
                    
        except Exception as e:
            logger.error(f"Error extracting tables: {str(e)}")
        return tables
        
    def _detect_table_type(self, headers: List[str]) -> str:
        """Detect the type of table based on its headers."""
        header_text = " ".join(headers).lower()
        
        # Technical document table types
        if any(term in header_text for term in ["part", "component", "specification", "parameter"]):
            return "technical_specs"
        if any(term in header_text for term in ["revision", "history", "change", "date"]):
            return "revision_history"
        if any(term in header_text for term in ["material", "construction", "composition"]):
            return "material_specs"
            
        # Engineering document table types
        if any(term in header_text for term in ["dimension", "size", "measurement", "tolerance"]):
            return "dimensions"
        if any(term in header_text for term in ["note", "reference", "detail"]):
            return "notes"
        if any(term in header_text for term in ["assembly", "component", "part"]):
            return "assembly"
            
        return "unknown"

    def _extract_headers_footers(self, doc: fitz.Document) -> Tuple[List[str], List[str]]:
        """Extract headers and footers from PDF document."""
        headers = []
        footers = []
        try:
            for page in doc:
                # Get text blocks
                blocks = page.get_text("blocks")
                if blocks:
                    # Process header (first block)
                    header_text = blocks[0][4]
                    header_info = self._process_header_footer(header_text, "header")
                    headers.append(header_info)
                    
                    # Process footer (last block)
                    footer_text = blocks[-1][4]
                    footer_info = self._process_header_footer(footer_text, "footer")
                    footers.append(footer_info)
                    
        except Exception as e:
            logger.error(f"Error extracting headers/footers: {str(e)}")
        return headers, footers
        
    def _process_header_footer(self, text: str, type: str) -> Dict[str, Any]:
        """Process header or footer text to extract structured information."""
        result = {
            "text": text,
            "type": type,
            "fields": {}
        }
        
        try:
            # Common fields in headers/footers
            patterns = {
                "document_number": [
                    r'doc[.-]?\s*#?\s*([A-Z0-9-]+)',
                    r'document\s*number:?\s*([A-Z0-9-]+)',
                    r'TEC-MOS-\d{2}-\d{2}-\d{2}-\d{4}',
                    r'4669-IBU-\d{3}-\w{3}-\w{3}-\w{2}-\d{6}'
                ],
                "revision": [
                    r'rev[.-]?\s*#?\s*([A-Z0-9]+)',
                    r'revision:?\s*([A-Z0-9]+)',
                    r'Rev-[A-Z]',
                    r'Rev\s*\d{2}'
                ],
                "page": [
                    r'page\s*(\d+)',
                    r'pg[.-]?\s*(\d+)'
                ],
                "date": [
                    r'date:?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})',
                    r'dated:?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})'
                ],
                "title": [
                    r'title:?\s*([^\n]+)',
                    r'subject:?\s*([^\n]+)'
                ]
            }
            
            # Extract fields using patterns
            for field, field_patterns in patterns.items():
                for pattern in field_patterns:
                    match = re.search(pattern, text, re.IGNORECASE)
                    if match:
                        result["fields"][field] = match.group(1).strip()
                        break
                        
        except Exception as e:
            logger.error(f"Error processing header/footer: {str(e)}")
            
        return result

    def _extract_fields(self, text: str, doc_type: str) -> Dict[str, str]:
        """Extract fields from text based on document type."""
        fields = {}
        try:
            if doc_type in self.field_patterns:
                for field, patterns in self.field_patterns[doc_type].items():
                    for pattern in patterns:
                        match = re.search(pattern, text, re.IGNORECASE)
                        if match:
                            fields[field] = match.group(1).strip()
                            break
        except Exception as e:
            logger.error(f"Error extracting fields: {str(e)}")
        return fields

    def _classify_document_type(self, text: str) -> str:
        """Classify document type based on content."""
        try:
            # Define patterns for different document types
            patterns = {
                'invoice': [
                    r'invoice\s*number',
                    r'total\s*amount',
                    r'tax\s*amount',
                    r'payment\s*terms',
                    r'due\s*date'
                ],
                'receipt': [
                    r'receipt',
                    r'payment\s*received',
                    r'amount\s*paid',
                    r'change',
                    r'cashier'
                ],
                'id_card': [
                    r'id\s*number',
                    r'date\s*of\s*birth',
                    r'address',
                    r'nationality',
                    r'expiry\s*date'
                ],
                'contract': [
                    r'contract',
                    r'agreement',
                    r'party',
                    r'effective\s*date',
                    r'termination'
                ],
                'engineering_doc': [
                    r'drawing\s*number',
                    r'revision',
                    r'scale',
                    r'project\s*number',
                    r'4669-IBU-\d{3}-\w{3}-\w{3}-\w{2}-\d{6}'
                ]
            }
            
            # Count matches for each document type
            max_matches = 0
            doc_type = "unknown"
            
            for dtype, type_patterns in patterns.items():
                matches = 0
                for pattern in type_patterns:
                    if re.search(pattern, text, re.IGNORECASE):
                        matches += 1
                
                if matches > max_matches:
                    max_matches = matches
                    doc_type = dtype
            
            # If no matches found, try to determine type from content
            if doc_type == "unknown":
                # Check for technical drawing patterns
                if re.search(r'\d{4}-\w{3}-\d{3}-\w{3}-\w{3}-\w{2}-\d{6}', text):
                    doc_type = "engineering_doc"
                # Check for invoice patterns
                elif re.search(r'\$\d+\.\d{2}|\d+\.\d{2}\s*USD', text):
                    doc_type = "invoice"
                # Check for ID card patterns
                elif re.search(r'\d{2}/\d{2}/\d{4}|\d{4}-\d{2}-\d{2}', text):
                    doc_type = "id_card"
            
            return doc_type
            
        except Exception as e:
            logger.error(f"Error classifying document type: {str(e)}")
            return "unknown"

    def _calculate_confidence(self, fields: Dict[str, str], doc_type: str) -> float:
        """Calculate confidence score based on extracted fields."""
        try:
            if not fields:
                return 0.0
            
            # Base confidence on number of fields extracted
            field_confidence = len(fields) / len(self.field_patterns.get(doc_type, {}))
            
            # Additional confidence factors
            field_quality = 0.0
            if doc_type == "invoice":
                # Check for important invoice fields
                important_fields = ["invoice_number", "date", "total_amount"]
                field_quality = sum(1 for field in important_fields if field in fields) / len(important_fields)
            elif doc_type == "technical_doc":
                # Check for important technical doc fields
                important_fields = ["doc_number", "revision", "date"]
                field_quality = sum(1 for field in important_fields if field in fields) / len(important_fields)
            elif doc_type == "engineering_doc":
                # Check for important engineering doc fields
                important_fields = ["drawing_number", "revision", "scale"]
                field_quality = sum(1 for field in important_fields if field in fields) / len(important_fields)
            
            # Calculate final confidence
            confidence = (field_confidence + field_quality) / 2
            return min(max(confidence, 0.0), 1.0)
            
        except Exception as e:
            logger.error(f"Error calculating confidence: {str(e)}")
            return 0.0

    def _get_file_type(self, file_path: str) -> str:
        """Determine file type from extension."""
        ext = file_path.lower().split('.')[-1]
        if ext in ['pdf']:
            return 'application/pdf'
        elif ext in ['jpg', 'jpeg']:
            return 'image/jpeg'
        elif ext in ['png']:
            return 'image/png'
        else:
            return 'application/octet-stream'

    def _combine_results(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Combine results from multiple pages."""
        combined = {
            "extracted_text": "",
            "document_type": "unknown",
            "confidence": 0.0,
            "bounding_boxes": [],
            "extracted_fields": {},
            "tables": [],
            "headers": [],
            "footers": []
        }
        
        try:
            # Combine text
            combined["extracted_text"] = "\n".join(r.get("extracted_text", "") for r in results)
            
            # Combine bounding boxes
            for r in results:
                combined["bounding_boxes"].extend(r.get("bounding_boxes", []))
            
            # Combine tables
            for r in results:
                combined["tables"].extend(r.get("tables", []))
            
            # Combine headers and footers
            for r in results:
                combined["headers"].extend(r.get("headers", []))
                combined["footers"].extend(r.get("footers", []))
            
            # Merge fields (taking the most confident value)
            all_fields = {}
            for r in results:
                for field, value in r.get("extracted_fields", {}).items():
                    if field not in all_fields or len(value) > len(all_fields[field]):
                        all_fields[field] = value
            combined["extracted_fields"] = all_fields
            
            # Calculate overall confidence
            confidences = [r.get("confidence", 0.0) for r in results]
            combined["confidence"] = sum(confidences) / len(confidences) if confidences else 0.0
            
            # Determine document type
            doc_types = [r.get("document_type", "unknown") for r in results]
            combined["document_type"] = max(set(doc_types), key=doc_types.count)
            
        except Exception as e:
            logger.error(f"Error combining results: {str(e)}")
        
        return combined