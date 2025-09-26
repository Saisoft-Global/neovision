from typing import List, Dict, Any
import re
from log import logger
import torch
from transformers import DonutProcessor, VisionEncoderDecoderModel
import cv2
import numpy as np
from PIL import Image
import os
from concurrent.futures import ThreadPoolExecutor
import threading
import json
from pathlib import Path
import io
import fitz
from pdf2image import convert_from_path
import time
import dateutil.parser

class DonutDocumentProcessor:
    def __init__(self):
        """Initialize the Donut document processor."""
        try:
            # Set device
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
            logger.info(f"Using device: {self.device}")
            
            # Initialize model and processor
            self.model_name = "naver-clova-ix/donut-base-finetuned-rvlcdip"
            logger.info(f"Loading model: {self.model_name}")
            
            self.processor = DonutProcessor.from_pretrained(self.model_name)
            self.model = VisionEncoderDecoderModel.from_pretrained(self.model_name)
            self.model.to(self.device)
            
            # Configure model parameters
            self.max_length = 512
            self.min_length = 1
            self.num_beams = 4
            
            # Initialize processing time tracking
            self.start_time = time.time()
            
            # Set up thread pool for concurrent processing
            self.thread_pool = ThreadPoolExecutor(max_workers=4)
            self._model_lock = threading.Lock()
            
            # Initialize cache
            self.cache = {}
            self.max_cache_size = 100
            
            # Set supported file extensions
            self.supported_extensions = ['.pdf', '.jpg', '.jpeg', '.png', '.tiff', '.bmp']
            
            logger.info("DonutDocumentProcessor initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing DonutDocumentProcessor: {str(e)}")
            raise

    def _parse_sequence(self, sequence: str) -> str:
        """Parse the model output sequence."""
        try:
            # Remove special tokens and clean up
            sequence = sequence.replace("<s>", "").replace("</s>", "")
            sequence = sequence.replace("<s_doc>", "").replace("</s_doc>", "")
            sequence = sequence.replace("<s_doc-qa>", "").replace("</s_doc-qa>", "")
            sequence = sequence.replace("<s_question>", "").replace("</s_question>", "")
            sequence = sequence.replace("<s_answer>", "").replace("</s_answer>", "")
            
            # Clean up whitespace
            sequence = " ".join(sequence.split())
            return sequence
            
        except Exception as e:
            logger.error(f"Error parsing sequence: {str(e)}")
            return ""

    def _detect_document_type(self, text: str) -> str:
        """Detect document type based on content."""
        try:
            text_lower = text.lower()
            
            # Document type patterns
            patterns = {
                "invoice": [
                    r"invoice\s*number",
                    r"tax\s*invoice",
                    r"bill\s*to",
                    r"amount\s*due",
                    r"payment\s*terms"
                ],
                "receipt": [
                    r"receipt",
                    r"merchant",
                    r"store",
                    r"transaction\s*date",
                    r"payment\s*method"
                ],
                "bank_statement": [
                    r"account\s*number",
                    r"statement\s*period",
                    r"opening\s*balance",
                    r"closing\s*balance",
                    r"transaction\s*history"
                ]
            }
            
            # Count matches for each document type
            matches = {}
            for doc_type, doc_patterns in patterns.items():
                matches[doc_type] = sum(1 for pattern in doc_patterns if re.search(pattern, text_lower))
            
            # Return the document type with most matches
            if matches:
                return max(matches.items(), key=lambda x: x[1])[0]
            return "unknown"
            
        except Exception as e:
            logger.error(f"Error detecting document type: {str(e)}")
            return "unknown"

    def _calculate_doc_type_confidence(self, doc_type: str, text: str) -> float:
        """Calculate confidence score for document type detection."""
        try:
            if doc_type == "unknown":
                return 0.0
                
            # Get patterns for the detected document type
            patterns = {
                "invoice": [
                    r"invoice\s*number",
                    r"tax\s*invoice",
                    r"bill\s*to",
                    r"amount\s*due",
                    r"payment\s*terms"
                ],
                "receipt": [
                    r"receipt",
                    r"merchant",
                    r"store",
                    r"transaction\s*date",
                    r"payment\s*method"
                ],
                "bank_statement": [
                    r"account\s*number",
                    r"statement\s*period",
                    r"opening\s*balance",
                    r"closing\s*balance",
                    r"transaction\s*history"
                ]
            }
            
            if doc_type not in patterns:
                return 0.0
                
            # Count matches
            text_lower = text.lower()
            matches = sum(1 for pattern in patterns[doc_type] if re.search(pattern, text_lower))
            
            # Calculate confidence based on number of matches
            confidence = min(matches / len(patterns[doc_type]), 1.0)
            return round(confidence, 3)
            
        except Exception as e:
            logger.error(f"Error calculating document type confidence: {str(e)}")
            return 0.0

    def _extract_page_data(self, lines: List[str]) -> Dict[str, Any]:
        """Extract page-wise data from lines of text."""
        try:
            # Look for page indicators
            page_indicators = [
                r'page\s*\d+',
                r'pg\s*\d+',
                r'p\s*\d+',
                r'page\s*\d+\s*of\s*\d+',
                r'pg\s*\d+\s*of\s*\d+',
                r'p\s*\d+\s*of\s*\d+'
            ]
            
            page_data = {}
            current_page = 1
            
            for i, line in enumerate(lines):
                line_lower = line.lower()
                for indicator in page_indicators:
                    match = re.search(indicator, line_lower)
                    if match:
                        # Extract page number
                        page_num_match = re.search(r'\d+', match.group(0))
                        if page_num_match:
                            current_page = int(page_num_match.group(0))
                            break
                
                # Group lines by page
                if current_page not in page_data:
                    page_data[current_page] = []
                
                page_data[current_page].append(line)
            
            # Convert page data to structured format
            structured_page_data = []
            for page_num, page_lines in page_data.items():
                structured_page_data.append({
                    "page_number": page_num,
                    "content": page_lines,
                    "confidence": 0.9
                })
            
            return {
                "pages": structured_page_data,
                "total_pages": len(page_data),
                "confidence": 0.9
            }
            
        except Exception as e:
            logger.error(f"Error extracting page data: {str(e)}")
            return {
                "pages": [],
                "total_pages": 0,
                "confidence": 0.0
            } 

    def process_document(self, file_path: str) -> Dict[str, Any]:
        """Process a document and extract structured information."""
        try:
            # Reset processing time
            self.start_time = time.time()
            
            # Load and preprocess the image
            image = self._load_document(file_path)
            if image is None:
                raise ValueError("Failed to load document")
            
            # Convert image to tensor
            try:
                pixel_values = self._preprocess_image(image)
                if pixel_values is None:
                    raise ValueError("Failed to preprocess image")
            except Exception as e:
                logger.error(f"Error preprocessing image: {str(e)}")
                raise ValueError("Failed to preprocess image")
            
            # First pass: General document understanding
            try:
                task_prompt = "Please analyze this document and extract all relevant information."
                outputs = self.model.generate(
                    pixel_values,
                    max_length=self.max_length,
                    min_length=self.min_length,
                    num_beams=self.num_beams,
                    early_stopping=True,
                    no_repeat_ngram_size=3,
                    decoder_start_token_id=self.processor.tokenizer.bos_token_id,
                    pad_token_id=self.processor.tokenizer.pad_token_id,
                    eos_token_id=self.processor.tokenizer.eos_token_id,
                )
                
                # Decode the first pass
                sequence = self.processor.batch_decode(outputs)[0]
                general_info = self._parse_sequence(sequence)
                
            except Exception as e:
                logger.error(f"Error in first pass processing: {str(e)}")
                raise ValueError("Failed to process document content")
            
            # Determine document type
            doc_type = self._detect_document_type(general_info)
            
            # Extract fields using regex patterns
            extracted_fields = {}
            
            # Define regex patterns for each field type
            patterns = {
                "invoice": {
                    "invoice_number": r"(?i)invoice\s*(?:number|no\.?|#)?\s*[:#]?\s*([A-Z0-9-]+)",
                    "date": r"(?i)(?:invoice|date)\s*date\s*[:#]?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})",
                    "total_amount": r"(?i)(?:total|amount|sum)\s*(?:due|payable)?\s*[:#]?\s*([$€£¥]?\s*\d+(?:,\d{3})*(?:\.\d{2})?)",
                    "vendor_name": r"(?i)(?:vendor|supplier|from|company)\s*name\s*[:#]?\s*([A-Za-z0-9\s&.,]+)",
                    "due_date": r"(?i)(?:due|payment)\s*date\s*[:#]?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})",
                    "tax_amount": r"(?i)(?:tax|vat|gst)\s*(?:amount|total)?\s*[:#]?\s*([$€£¥]?\s*\d+(?:,\d{3})*(?:\.\d{2})?)"
                },
                "receipt": {
                    "merchant": r"(?i)(?:merchant|store|business)\s*name\s*[:#]?\s*([A-Za-z0-9\s&.,]+)",
                    "date": r"(?i)(?:date|transaction)\s*date\s*[:#]?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})",
                    "total": r"(?i)(?:total|amount|sum)\s*[:#]?\s*([$€£¥]?\s*\d+(?:,\d{3})*(?:\.\d{2})?)",
                    "items": r"(?i)(?:items|products|purchases)\s*[:#]?\s*([A-Za-z0-9\s&.,]+(?:\n[A-Za-z0-9\s&.,]+)*)",
                    "payment_method": r"(?i)(?:payment|paid)\s*(?:method|type)?\s*[:#]?\s*([A-Za-z0-9\s&.,]+)"
                },
                "bank_statement": {
                    "account_number": r"(?i)(?:account|acct)\s*(?:number|no\.?|#)?\s*[:#]?\s*([A-Z0-9-]+)",
                    "statement_period": r"(?i)(?:statement|period)\s*(?:date|range)?\s*[:#]?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\s*(?:to|-)\s*\d{1,2}[-/]\d{1,2}[-/]\d{2,4})",
                    "opening_balance": r"(?i)(?:opening|beginning)\s*balance\s*[:#]?\s*([$€£¥]?\s*\d+(?:,\d{3})*(?:\.\d{2})?)",
                    "closing_balance": r"(?i)(?:closing|ending)\s*balance\s*[:#]?\s*([$€£¥]?\s*\d+(?:,\d{3})*(?:\.\d{2})?)",
                    "transactions": r"(?i)(?:transactions|entries)\s*[:#]?\s*([A-Za-z0-9\s&.,]+(?:\n[A-Za-z0-9\s&.,]+)*)"
                }
            }
            
            # Extract fields using patterns
            if doc_type in patterns:
                for field, pattern in patterns[doc_type].items():
                    try:
                        match = re.search(pattern, general_info)
                        if match:
                            value = match.group(1).strip()
                            # Clean and validate the value
                            cleaned_value = self._clean_field_value(value, field)
                            if cleaned_value:
                                # Calculate confidence based on match quality
                                confidence = min(len(cleaned_value) / 50, 1.0)
                                extracted_fields[field] = {
                                    "value": cleaned_value,
                                    "confidence": round(confidence, 3)
                                }
                    except Exception as e:
                        logger.warning(f"Error extracting field {field}: {str(e)}")
                        continue
            
            # Calculate processing time
            processing_time = time.time() - self.start_time
            
            return {
                "document_type": doc_type,
                "confidence": self._calculate_doc_type_confidence(doc_type, general_info),
                "fields": extracted_fields,
                "raw_text": general_info,
                "file_path": file_path,
                "processing_time": processing_time
            }
            
        except Exception as e:
            logger.error(f"Error processing document: {str(e)}")
            raise ValueError(f"Failed to process document: {str(e)}")

    def _get_field_queries(self, doc_type: str) -> Dict[str, str]:
        """Get specific field extraction queries based on document type."""
        queries = {
            "invoice": {
                "invoice_number": "What is the invoice number?",
                "date": "What is the invoice date?",
                "total_amount": "What is the total amount?",
                "vendor_name": "Who is the vendor or supplier?",
                "due_date": "What is the payment due date?",
                "tax_amount": "What is the tax amount?"
            },
            "receipt": {
                "merchant": "What is the merchant or store name?",
                "date": "What is the transaction date?",
                "total": "What is the total amount?",
                "items": "List the purchased items and their prices",
                "payment_method": "What was the payment method used?"
            },
            "bank_statement": {
                "account_number": "What is the account number?",
                "statement_period": "What is the statement period?",
                "opening_balance": "What is the opening balance?",
                "closing_balance": "What is the closing balance?",
                "transactions": "List the transactions with dates and amounts"
            }
        }
        return queries.get(doc_type, {})

    def _clean_field_value(self, value: str, field_type: str) -> str:
        """Clean and validate extracted field values."""
        if not value:
            return ""
            
        # Remove special tokens and clean up whitespace
        value = value.replace("<s_answer>", "").replace("</s_answer>", "")
        value = value.replace("<s>", "").replace("</s>", "")
        value = value.replace("<s_doc>", "").replace("</s_doc>", "")
        value = value.replace("<s_doc-qa>", "").replace("</s_doc-qa>", "")
        value = value.replace("<s_question>", "").replace("</s_question>", "")
        value = " ".join(value.split())
        
        # Field-specific cleaning
        if "amount" in field_type.lower() or "total" in field_type.lower():
            # Extract numeric values and currency symbols
            amount_match = re.search(r'[\$€£¥]?\s*\d+(?:,\d{3})*(?:\.\d{2})?', value)
            if amount_match:
                return amount_match.group(0)
                
        elif "date" in field_type.lower():
            # Try to parse and standardize date format
            try:
                parsed_date = dateutil.parser.parse(value)
                return parsed_date.strftime("%Y-%m-%d")
            except:
                pass
                
        elif "number" in field_type.lower():
            # Extract alphanumeric values
            number_match = re.search(r'[A-Za-z0-9-]+', value)
            if number_match:
                return number_match.group(0)
                
        return value.strip()

    def _load_document(self, file_path: str) -> Image.Image:
        """Load and preprocess the document."""
        try:
            # Check if file exists
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"File not found: {file_path}")
            
            # Get file extension
            file_ext = os.path.splitext(file_path)[1].lower()
            if file_ext not in self.supported_extensions:
                raise ValueError(f"Unsupported file type: {file_ext}")
            
            try:
                if file_ext == '.pdf':
                    # Try multiple PDF processing methods
                    image = None
                    errors = []
                    
                    # 1. Try PyMuPDF first (more reliable)
                    try:
                        logger.info("Attempting PDF conversion with PyMuPDF...")
                        doc = fitz.open(file_path)
                        page = doc[0]
                        # Increase resolution significantly for better quality
                        zoom = 4.0  # Increased zoom for better quality
                        mat = fitz.Matrix(zoom, zoom)
                        pix = page.get_pixmap(matrix=mat, alpha=False)  # Disable alpha for better OCR
                        img_data = pix.tobytes("png")
                        image = Image.open(io.BytesIO(img_data))
                        doc.close()
                        logger.info("Successfully converted PDF using PyMuPDF")
                    except Exception as e:
                        errors.append(f"PyMuPDF failed: {str(e)}")
                    
                    # 2. Try pdf2image as fallback
                    if image is None:
                        try:
                            logger.info("Attempting PDF conversion with pdf2image...")
                            from pdf2image import convert_from_path
                            # Try different Poppler paths
                            poppler_paths = [
                                r"C:\Program Files\poppler\bin",
                                r"C:\Program Files\poppler\Library\bin",
                                r"C:\Program Files (x86)\poppler\bin",
                                r"C:\Program Files (x86)\poppler\Library\bin",
                                r"C:\poppler\bin",
                                r"C:\poppler\Library\bin"
                            ]
                            
                            for poppler_path in poppler_paths:
                                try:
                                    if os.path.exists(poppler_path):
                                        logger.info(f"Found Poppler at: {poppler_path}")
                                        images = convert_from_path(
                                            file_path,
                                            poppler_path=poppler_path,
                                            first_page=1,
                                            last_page=1,
                                            dpi=400  # Increased DPI for better quality
                                        )
                                        if images:
                                            image = images[0]
                                            logger.info("Successfully converted PDF using pdf2image")
                                            break
                                except Exception as e:
                                    errors.append(f"pdf2image with {poppler_path} failed: {str(e)}")
                        
                        except Exception as e:
                            errors.append(f"pdf2image import/setup failed: {str(e)}")
                    
                    # If both methods failed, raise error
                    if image is None:
                        raise ValueError(f"Failed to process PDF. Errors: {'; '.join(errors)}")
                
                else:
                    # Open image file directly
                    image = Image.open(file_path)
                
                # Convert to RGB if needed
                if image.mode != "RGB":
                    image = image.convert("RGB")
                
                return image
                
            except Exception as e:
                logger.error(f"Error processing file {file_path}: {str(e)}")
                raise
            
        except Exception as e:
            logger.error(f"Error processing document: {str(e)}")
            return None

    def _preprocess_image(self, image: Image.Image) -> torch.Tensor:
        """Preprocess image for the model with enhanced OCR quality."""
        try:
            # Convert to RGB if needed
            if image.mode != "RGB":
                image = image.convert("RGB")
            
            # Convert to numpy array
            image_np = np.array(image)
            
            try:
                # Convert to grayscale
                gray = cv2.cvtColor(image_np, cv2.COLOR_RGB2GRAY)
                
                # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
                clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
                enhanced = clahe.apply(gray)
                
                # Apply Otsu's binarization
                _, binary = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
                
                # Denoise
                denoised = cv2.fastNlMeansDenoising(binary)
                
                # Convert back to RGB
                processed = cv2.cvtColor(denoised, cv2.COLOR_GRAY2RGB)
                
                # Convert back to PIL Image
                image = Image.fromarray(processed)
                
            except Exception as e:
                logger.warning(f"Advanced preprocessing failed, falling back to basic processing: {str(e)}")
                # Fall back to basic processing if advanced methods fail
                pass
            
            # Process with the model's processor
            inputs = self.processor(
                image,
                return_tensors="pt",
                random_padding=False
            )
            
            pixel_values = inputs.pixel_values.to(self.device)
            return pixel_values
            
        except Exception as e:
            logger.error(f"Error preprocessing image: {str(e)}")
            return None

    def _extract_structured_info(self, text: str) -> Dict[str, Any]:
        """Extract structured information from text."""
        try:
            # Initialize result dictionary
            result = {
                "document_type": self._classify_document_type(text),
                "extracted_text": text,
                "fields": {},
                "tables": [],
                "key_value_pairs": []
            }
            
            # Extract invoice-specific fields if it's an invoice
            if result["document_type"] == "invoice":
                result["fields"] = self._extract_invoice_fields(text)
            
            # Extract tables
            result["tables"] = self._extract_tables(text)
            
            # Extract key-value pairs
            result["key_value_pairs"] = self._extract_key_value_pairs(text)
            
            return result
            
        except Exception as e:
            logger.error(f"Error extracting structured info: {str(e)}")
            return {
                "document_type": "unknown",
                "extracted_text": text,
                "fields": {},
                "tables": [],
                "key_value_pairs": []
            }

    def _classify_document_type(self, text: str) -> str:
        """Classify document type based on content."""
        text_lower = text.lower()
        
        if "invoice" in text_lower or "tax invoice" in text_lower:
            return "invoice"
        elif "receipt" in text_lower:
            return "receipt"
        elif "purchase order" in text_lower or "p.o." in text_lower:
            return "purchase_order"
        elif "delivery note" in text_lower or "delivery order" in text_lower:
            return "delivery_note"
        else:
            return "unknown"

    def _extract_invoice_fields(self, text: str) -> Dict[str, Dict[str, Any]]:
        """Extract invoice-specific fields."""
        fields = {}
        text_lower = text.lower()
        
        # Extract invoice number with more specific patterns
        invoice_patterns = [
            r'inv[-]?(?:\s+)?(\d{6})',
            r'invoice\s*(?:no\.?|number|#)?\s*[:.]?\s*([A-Z0-9-]+)',
            r'tax\s+invoice\s*#?\s*([A-Z0-9-]+)',
            r'inv[.-]?\s*([A-Z0-9-]+)'
        ]
        for pattern in invoice_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                fields["invoice_number"] = {
                    "value": match.group(1).strip(),
                    "confidence": 0.9
                }
                break
        
        # Extract date with more formats
        date_patterns = [
            r'(?:invoice\s+)?date\s*[:.]?\s*(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})',
            r'dated?\s*[:.]?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})',
            r'(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})'
        ]
        for pattern in date_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                fields["date"] = {
                    "value": match.group(1).strip(),
                    "confidence": 0.9
                }
                break
        
        # Extract amount with currency
        amount_patterns = [
            r'(?:total|amount|balance)\s*(?:due)?\s*[:.]?\s*(?:AED|USD|EUR)?\s*([\d,]+\.?\d*)',
            r'(?:AED|USD|EUR)\s*([\d,]+\.?\d*)',
            r'(?:grand|net)\s+total\s*[:.]?\s*(?:AED|USD|EUR)?\s*([\d,]+\.?\d*)',
            r'balance\s+due\s*[:.]?\s*(?:AED|USD|EUR)?\s*([\d,]+\.?\d*)'
        ]
        for pattern in amount_patterns:
            match = re.search(pattern, text_lower)
            if match:
                amount = match.group(1).replace(',', '').strip()
                if amount:
                    fields["amount"] = {
                        "value": f"AED {amount}",
                        "confidence": 0.9
                    }
                    break
        
        # Extract TRN/VAT number with more specific patterns
        vat_patterns = [
            r'trn\s*(?:no\.?|number|#)?\s*[:.]?\s*(\d{15})',
            r'vat\s*(?:no\.?|number|#)?\s*[:.]?\s*([A-Z0-9-]+)',
            r'tax\s*(?:no\.?|number|#)?\s*[:.]?\s*([A-Z0-9-]+)',
            r'trn\s*(?:no\.?|number|#)?\s*[:.]?\s*([A-Z0-9-]+)'
        ]
        for pattern in vat_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                fields["vat_number"] = {
                    "value": match.group(1).strip(),
                    "confidence": 0.9
                }
                break
        
        # Extract company details
        company_patterns = [
            r'(SAISOFT\s+INFORMATION\s+TECHNOLOGY[^\.]*)',
            r'License\s+No\.\s*([A-Z0-9-]+)',
            r'Building\s+No\.\s*([^,\n]+)',
            r'(?:Address|Location)\s*:?\s*([^,\n]+)'
        ]
        for pattern in company_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                key = pattern.split('\\s+')[0].lower().strip('()')
                fields[key] = {
                    "value": match.group(1).strip(),
                    "confidence": 0.9
                }
        
        return fields

    def _calculate_confidence(self, result: Dict[str, Any]) -> float:
        """Calculate overall confidence score."""
        try:
            confidence_scores = []
            
            # Add confidence for document type
            if result["document_type"] != "unknown":
                confidence_scores.append(0.9)
            
            # Add confidence for fields
            for field in result.get("fields", {}).values():
                if isinstance(field, dict) and "confidence" in field:
                    confidence_scores.append(field["confidence"])
            
            # Calculate average confidence
            if confidence_scores:
                return sum(confidence_scores) / len(confidence_scores)
            else:
                return 0.5
                
        except Exception as e:
            logger.error(f"Error calculating confidence: {str(e)}")
            return 0.0 

    def _extract_tables(self, text: str) -> List[Dict[str, Any]]:
        """Extract tables from text."""
        try:
            tables = []
            lines = text.split('\n')
            table_start = -1
            current_table = None
            
            # Common table headers
            table_headers = [
                r'item|description|qty|amount|price|total',
                r'product|service|quantity|rate|amount',
                r'no\.|particulars|quantity|rate|amount'
            ]
            
            for i, line in enumerate(lines):
                line_lower = line.lower()
                
                # Check for table header
                if any(re.search(pattern, line_lower) for pattern in table_headers):
                    if current_table:
                        tables.append(current_table)
                    table_start = i
                    current_table = {
                        "header": line.strip(),
                        "rows": [],
                        "confidence": 0.8
                    }
                    continue
                
                # If we're in a table, try to extract row data
                if current_table and i > table_start:
                    # Check if line contains numbers (likely a data row)
                    if re.search(r'\d', line):
                        current_table["rows"].append({
                            "content": line.strip(),
                            "confidence": 0.7
                        })
                    # Empty line might indicate end of table
                    elif not line.strip() and current_table["rows"]:
                        tables.append(current_table)
                        current_table = None
            
            # Add last table if exists
            if current_table and current_table["rows"]:
                tables.append(current_table)
            
            return tables
            
        except Exception as e:
            logger.error(f"Error extracting tables: {str(e)}")
            return []

    def _extract_key_value_pairs(self, text: str) -> List[Dict[str, Any]]:
        """Extract key-value pairs from text."""
        try:
            pairs = []
            lines = text.split('\n')
            
            for line in lines:
                # Look for lines with key-value separator
                if ':' in line or '=' in line:
                    parts = re.split(r'[:=]', line, maxsplit=1)
                    if len(parts) == 2:
                        key = parts[0].strip()
                        value = parts[1].strip()
                        if key and value:  # Only add if both key and value are non-empty
                            pairs.append({
                                "key": key,
                                "value": value,
                                "confidence": 0.8
                            })
            
            return pairs
            
        except Exception as e:
            logger.error(f"Error extracting key-value pairs: {str(e)}")
            return [] 