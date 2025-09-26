from typing import List, Dict, Any, Tuple, Optional
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
        """Initialize the document processor with the Donut model."""
        try:
            # Set device
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
            logger.info(f"Using device: {self.device}")
            
            # Load model and processor
            self.model_name = "naver-clova-ix/donut-base-finetuned-rvlcdip"
            logger.info(f"Loading model: {self.model_name}")
            
            # Initialize processor and model
            self.processor = DonutProcessor.from_pretrained(self.model_name)
            self.model = VisionEncoderDecoderModel.from_pretrained(self.model_name)
            
            # Configure model for generation
            self.model.config.decoder_start_token_id = 0  # Use default BOS token
            self.model.config.pad_token_id = 1  # Use default PAD token
            self.model.config.eos_token_id = 2  # Use default EOS token
            
            # Move model to device
            self.model.to(self.device)
            
            # Set generation parameters
            self.max_length = 256  # Reduced for faster processing
            self.min_length = 1
            self.no_repeat_ngram_size = 3
            
            # Enable gradient checkpointing for memory efficiency
            self.model.gradient_checkpointing_enable()
            
            # Set supported file extensions
            self.supported_extensions = ['.pdf', '.jpg', '.jpeg', '.png', '.tiff', '.bmp']
            
            # Initialize learning data
            self.learning_data = {
                "corrections": {},
                "annotations": {},
                "patterns": {},
                "confidence_history": {}
            }
            
            # Load existing learning data if available
            self._load_learning_data()
            
            logger.info("DonutDocumentProcessor initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing processor: {str(e)}")
            raise

    def _load_learning_data(self):
        """Load existing learning data from file."""
        try:
            learning_data_path = Path("learning_data.json")
            if learning_data_path.exists():
                with open(learning_data_path, 'r') as f:
                    self.learning_data = json.load(f)
                logger.info("Loaded existing learning data")
        except Exception as e:
            logger.error(f"Error loading learning data: {str(e)}")

    def _save_learning_data(self):
        """Save learning data to file."""
        try:
            learning_data_path = Path("learning_data.json")
            with open(learning_data_path, 'w') as f:
                json.dump(self.learning_data, f, indent=2)
            logger.info("Saved learning data")
        except Exception as e:
            logger.error(f"Error saving learning data: {str(e)}")

    def add_correction(self, doc_type: str, field: str, original_value: str, corrected_value: str, context: Dict[str, Any]):
        """Add a correction to the learning system."""
        try:
            if doc_type not in self.learning_data["corrections"]:
                self.learning_data["corrections"][doc_type] = {}
            
            if field not in self.learning_data["corrections"][doc_type]:
                self.learning_data["corrections"][doc_type][field] = []
            
            correction = {
                "original": original_value,
                "corrected": corrected_value,
                "context": context,
                "timestamp": time.time()
            }
            
            self.learning_data["corrections"][doc_type][field].append(correction)
            self._save_learning_data()
            
            # Update patterns based on the correction
            self._update_patterns(doc_type, field, correction)
            
            logger.info(f"Added correction for {doc_type}.{field}")
            
        except Exception as e:
            logger.error(f"Error adding correction: {str(e)}")

    def add_annotation(self, doc_id: str, annotation: Dict[str, Any]):
        """Add a user annotation to the learning system."""
        try:
            self.learning_data["annotations"][doc_id] = {
                **annotation,
                "timestamp": time.time()
            }
            self._save_learning_data()
            logger.info(f"Added annotation for document {doc_id}")
            
        except Exception as e:
            logger.error(f"Error adding annotation: {str(e)}")

    def _update_patterns(self, doc_type: str, field: str, correction: Dict[str, Any]):
        """Update learned patterns based on corrections."""
        try:
            if doc_type not in self.learning_data["patterns"]:
                self.learning_data["patterns"][doc_type] = {}
            
            if field not in self.learning_data["patterns"][doc_type]:
                self.learning_data["patterns"][doc_type][field] = []
            
            # Extract patterns from the correction context
            context = correction["context"]
            if "text" in context:
                # Look for patterns around the corrected value
                text = context["text"]
                original = correction["original"]
                corrected = correction["corrected"]
                
                # Find the position of the original value
                pos = text.find(original)
                if pos != -1:
                    # Extract surrounding text (50 characters before and after)
                    start = max(0, pos - 50)
                    end = min(len(text), pos + len(original) + 50)
                    pattern = text[start:end]
                    
                    # Add the pattern with the correction
                    self.learning_data["patterns"][doc_type][field].append({
                        "pattern": pattern,
                        "correction": corrected,
                        "confidence": 0.8
                    })
            
            self._save_learning_data()
            
        except Exception as e:
            logger.error(f"Error updating patterns: {str(e)}")

    def _apply_learned_patterns(self, doc_type: str, field: str, text: str) -> Tuple[str, float]:
        """Apply learned patterns to improve extraction."""
        try:
            if doc_type in self.learning_data["patterns"] and field in self.learning_data["patterns"][doc_type]:
                patterns = self.learning_data["patterns"][doc_type][field]
                
                for pattern_data in patterns:
                    pattern = pattern_data["pattern"]
                    correction = pattern_data["correction"]
                    confidence = pattern_data["confidence"]
                    
                    if pattern in text:
                        return correction, confidence
            
            return None, 0.0
            
        except Exception as e:
            logger.error(f"Error applying learned patterns: {str(e)}")
            return None, 0.0

    def _update_confidence_history(self, doc_type: str, field: str, confidence: float):
        """Update confidence history for a field."""
        try:
            if doc_type not in self.learning_data["confidence_history"]:
                self.learning_data["confidence_history"][doc_type] = {}
            
            if field not in self.learning_data["confidence_history"][doc_type]:
                self.learning_data["confidence_history"][doc_type][field] = []
            
            self.learning_data["confidence_history"][doc_type][field].append({
                "confidence": confidence,
                "timestamp": time.time()
            })
            
            # Keep only last 100 confidence scores
            if len(self.learning_data["confidence_history"][doc_type][field]) > 100:
                self.learning_data["confidence_history"][doc_type][field] = \
                    self.learning_data["confidence_history"][doc_type][field][-100:]
            
            self._save_learning_data()
            
        except Exception as e:
            logger.error(f"Error updating confidence history: {str(e)}")

    def get_learning_stats(self) -> Dict[str, Any]:
        """Get statistics about the learning system."""
        try:
            stats = {
                "total_corrections": sum(
                    len(field_corrections)
                    for doc_type in self.learning_data["corrections"].values()
                    for field_corrections in doc_type.values()
                ),
                "total_annotations": len(self.learning_data["annotations"]),
                "total_patterns": sum(
                    len(field_patterns)
                    for doc_type in self.learning_data["patterns"].values()
                    for field_patterns in doc_type.values()
                ),
                "confidence_trends": {}
            }
            
            # Calculate confidence trends
            for doc_type, fields in self.learning_data["confidence_history"].items():
                stats["confidence_trends"][doc_type] = {}
                for field, history in fields.items():
                    if history:
                        recent_confidences = [h["confidence"] for h in history[-10:]]
                        stats["confidence_trends"][doc_type][field] = {
                            "current": recent_confidences[-1] if recent_confidences else 0.0,
                            "average": sum(recent_confidences) / len(recent_confidences) if recent_confidences else 0.0,
                            "trend": "improving" if len(recent_confidences) > 1 and recent_confidences[-1] > recent_confidences[0] else "stable"
                        }
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting learning stats: {str(e)}")
            return {}

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
        """Process a document and extract structured information"""
        try:
            # Load and preprocess the document
            image = self._load_document(file_path)
            if image is None:
                raise ValueError("Failed to load document")
            
            # Preprocess image and prepare inputs
            try:
                pixel_values = self._preprocess_image(image)
                if not isinstance(pixel_values, torch.Tensor):
                    raise ValueError("Preprocessing did not return a tensor")
                
                # Ensure tensor is on the correct device
                pixel_values = pixel_values.to(self.device)
                
                # Log tensor shape for debugging
                logger.info(f"Input tensor shape: {pixel_values.shape}")
                
            except Exception as e:
                logger.error(f"Error during preprocessing: {str(e)}")
                raise
            
            # Prepare task prompt with more specific instructions
            task_prompt = "<s_docvqa>Please extract all text from this document, including invoice numbers, dates, amounts, and company names.</s_docvqa>"
            
            try:
                # Generate text with optimized parameters
                outputs = self.model.generate(
                    pixel_values,
                    max_length=512,
                    min_length=10,
                    num_beams=2,
                    temperature=1.0,
                    do_sample=True,
                    top_k=50,
                    top_p=0.95,
                    pad_token_id=self.processor.tokenizer.pad_token_id,
                    eos_token_id=self.processor.tokenizer.eos_token_id,
                    no_repeat_ngram_size=3,
                    return_dict_in_generate=True,
                    output_scores=True
                )
                
                # Get the first sequence
                if hasattr(outputs, 'sequences'):
                    sequence = outputs.sequences[0]
                else:
                    sequence = outputs[0] if isinstance(outputs, torch.Tensor) else outputs
                
                # Decode the sequence
                extracted_text = self.processor.tokenizer.decode(sequence, skip_special_tokens=True)
                extracted_text = extracted_text.replace(task_prompt, "").strip()
                
                if extracted_text:
                    logger.info(f"Successfully extracted text. Length: {len(extracted_text)}")
                else:
                    logger.warning("No text was extracted from the document")
                    return {
                        "document_type": "unknown",
                        "confidence": 0.0,
                        "fields": {},
                        "tables": [],
                        "raw_text": "",
                        "error": "No text could be extracted from the document"
                    }
                    
            except Exception as e:
                logger.error(f"Error during text generation: {str(e)}")
                return {
                    "document_type": "unknown",
                    "confidence": 0.0,
                    "fields": {},
                    "tables": [],
                    "raw_text": "",
                    "error": f"Error generating text: {str(e)}"
                }
            
            # Process the extracted text
            try:
                # Determine document type
                doc_type = self._detect_document_type(extracted_text)
                doc_type_confidence = self._calculate_doc_type_confidence(doc_type, extracted_text)
                
                # Extract entities and map to fields
                entities = self._extract_entities(extracted_text)
                fields = self._map_entities_to_fields(entities, doc_type)
                
                # Extract tables
                tables = self._extract_tables(extracted_text)
                
                # Calculate overall confidence
                confidence = self._calculate_confidence(doc_type_confidence, fields)
                
                return {
                    "document_type": doc_type,
                    "confidence": confidence,
                    "fields": fields,
                    "tables": tables,
                    "raw_text": extracted_text
                }
                
            except Exception as e:
                logger.error(f"Error processing extracted text: {str(e)}")
                return {
                    "document_type": "unknown",
                    "confidence": 0.0,
                    "fields": {},
                    "tables": [],
                    "raw_text": extracted_text,
                    "error": f"Error processing text: {str(e)}"
                }
            
        except Exception as e:
            logger.error(f"Error processing document: {str(e)}")
            return {
                "document_type": "unknown",
                "confidence": 0.0,
                "fields": {},
                "tables": [],
                "raw_text": "",
                "error": str(e)
            }

    def _extract_entities(self, text: str) -> Dict[str, List[str]]:
        """Extract entities from text using regex patterns."""
        entities = {
            "invoice_number": [],
            "date": [],
            "amount": [],
            "company_name": [],
            "tax_number": [],
            "line_items": []
        }
        
        try:
            # Extract invoice numbers (more flexible pattern)
            invoice_patterns = [
                r'(?i)invoice\s*(?:number|no|#|num)?\s*[:#]?\s*([A-Z0-9][-A-Z0-9]*)',
                r'(?i)inv\s*(?:number|no|#|num)?\s*[:#]?\s*([A-Z0-9][-A-Z0-9]*)',
                r'(?i)bill\s*(?:number|no|#|num)?\s*[:#]?\s*([A-Z0-9][-A-Z0-9]*)'
            ]
            for pattern in invoice_patterns:
                matches = re.finditer(pattern, text)
                entities["invoice_number"].extend(match.group(1).strip() for match in matches)
            
            # Extract dates (multiple formats)
            date_patterns = [
                r'(?i)(?:date|issued|due)\s*(?:date)?[:\s]\s*((?:\d{1,2}[-/]\d{1,2}[-/]\d{2,4})|(?:\d{4}[-/]\d{1,2}[-/]\d{1,2}))',
                r'(?i)(?:date|issued|due)[:\s]\s*(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})',
                r'(?i)(?:date|issued|due)[:\s]\s*(\d{4}-\d{2}-\d{2})'
            ]
            for pattern in date_patterns:
                matches = re.finditer(pattern, text)
                entities["date"].extend(match.group(1).strip() for match in matches)
            
            # Extract amounts (with currency symbols)
            amount_patterns = [
                r'(?i)(?:total|amount|sum|due)[:\s]\s*(?:USD|EUR|GBP|£|\$|€)?\s*([\d,]+\.?\d*)',
                r'(?i)(?:USD|EUR|GBP|£|\$|€)\s*([\d,]+\.?\d*)',
                r'(?i)(?:subtotal|tax|vat)[:\s]\s*(?:USD|EUR|GBP|£|\$|€)?\s*([\d,]+\.?\d*)'
            ]
            for pattern in amount_patterns:
                matches = re.finditer(pattern, text)
                entities["amount"].extend(match.group(1).strip() for match in matches)
            
            # Extract company names
            company_patterns = [
                r'(?i)(?:vendor|supplier|company|from)[:\s]\s*([A-Z][A-Za-z0-9\s,\.]+(?:Inc\.|Ltd\.|LLC|Corp\.)?)',
                r'(?i)(?:bill\s+to|ship\s+to)[:\s]\s*([A-Z][A-Za-z0-9\s,\.]+(?:Inc\.|Ltd\.|LLC|Corp\.)?)',
                r'(?i)(?:business|company)\s+name[:\s]\s*([A-Z][A-Za-z0-9\s,\.]+(?:Inc\.|Ltd\.|LLC|Corp\.)?)'
            ]
            for pattern in company_patterns:
                matches = re.finditer(pattern, text)
                entities["company_name"].extend(match.group(1).strip() for match in matches)
            
            # Remove duplicates while preserving order
            for key in entities:
                entities[key] = list(dict.fromkeys(entities[key]))
            
            return entities
            
        except Exception as e:
            logger.error(f"Error extracting entities: {str(e)}")
            return entities

    def _map_entities_to_fields(self, entities: Dict[str, List[str]], doc_type: str) -> Dict[str, Any]:
        """Map extracted entities to specific fields based on document type."""
        fields = {}
        
        try:
            if doc_type == "invoice":
                # Map invoice-specific fields
                fields["invoice_number"] = entities.get("invoice_number", [""])[0] if entities.get("invoice_number") else ""
                fields["date"] = entities.get("date", [""])[0] if entities.get("date") else ""
                fields["total_amount"] = entities.get("amount", [""])[0] if entities.get("amount") else ""
                fields["vendor_name"] = entities.get("company_name", [""])[0] if entities.get("company_name") else ""
                fields["tax_number"] = entities.get("tax_number", [""])[0] if entities.get("tax_number") else ""
                fields["line_items"] = entities.get("line_items", [])
                
            elif doc_type == "receipt":
                # Map receipt-specific fields
                fields["date"] = entities.get("date", [""])[0] if entities.get("date") else ""
                fields["total_amount"] = entities.get("amount", [""])[0] if entities.get("amount") else ""
                fields["merchant_name"] = entities.get("company_name", [""])[0] if entities.get("company_name") else ""
                fields["items"] = entities.get("line_items", [])
                
            elif doc_type == "bank_statement":
                # Map bank statement-specific fields
                fields["account_number"] = entities.get("account_number", [""])[0] if entities.get("account_number") else ""
                fields["date"] = entities.get("date", [""])[0] if entities.get("date") else ""
                fields["balance"] = entities.get("amount", [""])[0] if entities.get("amount") else ""
                fields["transactions"] = entities.get("line_items", [])
            
            # Clean and validate field values
            for key, value in fields.items():
                if isinstance(value, str):
                    fields[key] = self._clean_field_value(key, value)
                elif isinstance(value, list):
                    fields[key] = [self._clean_field_value(key, item) for item in value if item]
                
            return fields
            
        except Exception as e:
            logger.error(f"Error mapping entities to fields: {str(e)}")
            return {}

    def _extract_tables(self, text: str) -> List[Dict[str, Any]]:
        """Extract tables from text with improved line item handling."""
        try:
            tables = []
            lines = text.split('\n')
            
            # Common table headers for line items (expanded patterns)
            table_headers = [
                r'(?i)(description|item|service|particulars|product|goods)',  # Description column
                r'(?i)(qty|quantity|units|pcs|pieces|items)',               # Quantity column
                r'(?i)(price|rate|unit\s*price|cost|unit\s*cost)',         # Price column
                r'(?i)(amount|total|sub\s*total|value|sum|net\s*amount)'   # Amount column
            ]
            
            # Log the text being processed
            logger.info(f"Processing text for table extraction. Text length: {len(text)}")
            
            # First pass: identify potential table regions
            table_regions = []
            for i, line in enumerate(lines):
                line = line.strip()
                if not line:
                    continue
                    
                line_lower = line.lower()
                
                # Check for table header with more flexible matching
                header_matches = [re.search(pattern, line_lower) for pattern in table_headers]
                if any(header_matches):
                    logger.debug(f"Found potential table header at line {i}: {line}")
                    table_regions.append(i)
            
            logger.info(f"Found {len(table_regions)} potential table regions")
            
            # Process each potential table region
            for region_start in table_regions:
                # Look for table end (empty line or next table header)
                region_end = region_start + 1
                while region_end < len(lines):
                    if not lines[region_end].strip():
                        break
                    if any(re.search(pattern, lines[region_end].lower()) for pattern in table_headers) and region_end > region_start + 1:
                        break
                    region_end += 1
                
                # Process table in this region
                header_line = lines[region_start].strip()
                logger.debug(f"Processing table region from line {region_start} to {region_end}")
                
                # Create column mapping based on header with more flexible splitting
                columns = {}
                # Try different splitting methods
                parts = re.split(r'\s{2,}|\t', header_line)
                if len(parts) < 2:  # If not enough parts, try alternative splitting
                    parts = re.split(r'[,|]', header_line)
                
                for idx, part in enumerate(parts):
                    part_lower = part.lower().strip()
                    for header_idx, pattern in enumerate(table_headers):
                        if re.search(pattern, part_lower):
                            column_name = ['description', 'quantity', 'unit_price', 'amount'][header_idx]
                            columns[column_name] = idx
                            logger.debug(f"Found column '{column_name}' at index {idx}")
                
                # Create table structure
                current_table = {
                    "header": header_line,
                    "columns": columns,
                    "rows": [],
                    "confidence": 0.8,
                    "type": "line_items"
                }
                
                # Process rows with improved splitting
                for i in range(region_start + 1, region_end):
                    line = lines[i].strip()
                    if not line:
                        continue
                    
                    try:
                        # Try different splitting methods for rows
                        parts = re.split(r'\s{2,}|\t', line)
                        if len(parts) < 2:
                            parts = re.split(r'[,|]', line)
                        
                        # Skip if no numbers found (likely not a data row)
                        if not any(re.search(r'\d', part) for part in parts):
                            continue
                        
                        row_data = {"confidence": 0.7}
                        
                        # Extract data based on column mapping
                        if 'description' in columns and columns['description'] < len(parts):
                            row_data["description"] = parts[columns['description']].strip()
                        else:
                            # If no column mapping, assume first part is description
                            row_data["description"] = parts[0].strip()
                        
                        # Extract numeric values
                        for col in ['quantity', 'unit_price', 'amount']:
                            if col in columns and columns[col] < len(parts):
                                value = parts[columns[col]].strip()
                                # Clean numeric value
                                value = re.sub(r'[^\d.,]', '', value)
                                if value:
                                    row_data[col] = value
                        
                        # Only add row if it has at least description and one numeric value
                        if row_data.get("description") and any(col in row_data for col in ['quantity', 'unit_price', 'amount']):
                            current_table["rows"].append(row_data)
                            logger.debug(f"Added row: {row_data}")
                    
                    except Exception as e:
                        logger.warning(f"Error processing row {i}: {str(e)}")
                        continue
                
                # Only add table if it has rows
                if current_table["rows"]:
                    tables.append(current_table)
                    logger.info(f"Added table with {len(current_table['rows'])} rows")
            
            logger.info(f"Extracted {len(tables)} tables with {sum(len(t['rows']) for t in tables)} total rows")
            return tables
            
        except Exception as e:
            logger.error(f"Error extracting tables: {str(e)}")
            return []

    def _extract_key_value_pairs(self, text: str) -> List[Dict[str, Any]]:
        """Extract key-value pairs from text with optimized approach."""
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

    def _load_document(self, file_path: str) -> Optional[Image.Image]:
        """Load a document from file path"""
        try:
            file_ext = os.path.splitext(file_path)[1].lower()
            
            if file_ext == '.pdf':
                logger.info("Attempting PDF conversion with PyMuPDF...")
                try:
                    # Try PyMuPDF first
                    doc = fitz.open(file_path)
                    page = doc[0]
                    pix = page.get_pixmap(matrix=fitz.Matrix(300/72, 300/72))
                    img_data = pix.tobytes("png")
                    image = Image.open(io.BytesIO(img_data))
                    doc.close()
                    logger.info("Successfully converted PDF using PyMuPDF")
                    return image
                except Exception as e:
                    logger.warning(f"PyMuPDF conversion failed: {str(e)}. Trying pdf2image...")
                    try:
                        # Fallback to pdf2image
                        images = convert_from_path(file_path, dpi=300)
                        if images:
                            logger.info("Successfully converted PDF using pdf2image")
                            return images[0]
                    except Exception as e:
                        logger.error(f"PDF conversion failed: {str(e)}")
                        return None
            else:
                # For image files, open directly with PIL
                image = Image.open(file_path)
                return image
                
        except Exception as e:
            logger.error(f"Error loading document: {str(e)}")
            return None

    def _preprocess_image(self, image: Image.Image) -> torch.Tensor:
        """Preprocess image for the Donut model."""
        try:
            # Convert to RGB if needed
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Resize image if too large
            max_size = 1600
            if max(image.size) > max_size:
                ratio = max_size / max(image.size)
                new_size = tuple(int(dim * ratio) for dim in image.size)
                image = image.resize(new_size, Image.Resampling.LANCZOS)
            
            # Process image with the processor
            inputs = self.processor(
                images=image,
                return_tensors="pt"
            )
            
            # Extract pixel values and ensure correct shape
            pixel_values = inputs.pixel_values
            if isinstance(pixel_values, torch.Tensor):
                # Ensure we have a batch dimension
                if pixel_values.dim() == 3:
                    pixel_values = pixel_values.unsqueeze(0)
                # Move to device
                pixel_values = pixel_values.to(self.device)
                return pixel_values
            else:
                raise ValueError("Failed to get pixel values from processor")
            
        except Exception as e:
            logger.error(f"Error preprocessing image: {str(e)}")
            raise

    def _calculate_confidence(self, doc_type_confidence: float, fields: Dict[str, Any]) -> float:
        """Calculate overall confidence score."""
        try:
            if not fields:
                return 0.0
            
            # Calculate average confidence of fields
            field_confidences = []
            for field_data in fields.values():
                if isinstance(field_data, dict) and "confidence" in field_data:
                    field_confidences.append(field_data["confidence"])
            
            field_confidence = sum(field_confidences) / len(field_confidences) if field_confidences else 0.0
            
            # Combine document type confidence and field confidence
            overall_confidence = (doc_type_confidence + field_confidence) / 2
            return round(overall_confidence, 3)
            
        except Exception as e:
            logger.error(f"Error calculating confidence: {str(e)}")
            return 0.0

    def _classify_document_type(self, text: str) -> str:
        """Determine the type of document based on content analysis."""
        try:
            # Convert text to lowercase for case-insensitive matching
            text_lower = text.lower()
            
            # Define document type patterns with weights
            doc_patterns = {
                "invoice": {
                    "patterns": [
                        (r"invoice\s*(?:number|no\.?)", 3),
                        (r"tax\s*(?:number|id|vat)", 2),
                        (r"total\s*(?:amount|due)", 2),
                        (r"payment\s*terms", 1),
                        (r"bill\s*to", 1)
                    ],
                    "threshold": 5
                },
                "receipt": {
                    "patterns": [
                        (r"receipt", 3),
                        (r"merchant", 2),
                        (r"store\s*number", 1),
                        (r"cashier", 1),
                        (r"register", 1)
                    ],
                    "threshold": 4
                },
                "bank_statement": {
                    "patterns": [
                        (r"account\s*(?:number|no\.?)", 3),
                        (r"statement\s*period", 2),
                        (r"opening\s*balance", 2),
                        (r"closing\s*balance", 2),
                        (r"transaction\s*history", 1)
                    ],
                    "threshold": 5
                }
            }
            
            # Calculate scores for each document type
            scores = {}
            for doc_type, config in doc_patterns.items():
                score = 0
                for pattern, weight in config["patterns"]:
                    if re.search(pattern, text_lower):
                        score += weight
                scores[doc_type] = score
            
            # Find the document type with the highest score above its threshold
            best_type = "unknown"
            best_score = 0
            
            for doc_type, score in scores.items():
                if score >= doc_patterns[doc_type]["threshold"] and score > best_score:
                    best_type = doc_type
                    best_score = score
            
            return best_type
            
        except Exception as e:
            logger.error(f"Error classifying document type: {str(e)}")
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

    def _extract_alternative_field(self, text: str, field: str) -> Optional[Dict[str, Any]]:
        """Extract field using alternative patterns if primary extraction failed."""
        try:
            alternative_patterns = {
                "invoice_number": [
                    r"(?i)inv(?:oice)?\s*(?:no|number|#)?\s*[:#]?\s*([A-Z0-9-]+)",
                    r"(?i)document\s*(?:no|number|#)?\s*[:#]?\s*([A-Z0-9-]+)",
                    r"(?i)ref(?:erence)?\s*(?:no|number|#)?\s*[:#]?\s*([A-Z0-9-]+)"
                ],
                "date": [
                    r"(?i)date\s*[:#]?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})",
                    r"(?i)issued\s*[:#]?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})",
                    r"(?i)created\s*[:#]?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})"
                ],
                "amount": [
                    r"(?i)total\s*(?:amount|sum)?\s*[:#]?\s*([\$€£¥]?\s*\d+(?:,\d{3})*(?:\.\d{2})?)",
                    r"(?i)sum\s*(?:total)?\s*[:#]?\s*([\$€£¥]?\s*\d+(?:,\d{3})*(?:\.\d{2})?)",
                    r"(?i)balance\s*(?:due|total)?\s*[:#]?\s*([$€£¥]?\s*\d+(?:,\d{3})*(?:\.\d{2})?)"
                ]
            }
            
            if field in alternative_patterns:
                for pattern in alternative_patterns[field]:
                    match = re.search(pattern, text)
                    if match:
                        value = match.group(1).strip()
                        if value:
                            return {
                                "value": self._clean_field_value(value, field),
                                "confidence": 0.7,
                                "source": "alternative_pattern"
                            }
            
            return None
            
        except Exception as e:
            logger.error(f"Error extracting alternative field: {str(e)}")
            return None

    def _validate_extraction(self, doc_type: str, fields: Dict[str, Any]) -> Dict[str, Any]:
        """Validate extracted fields based on document type."""
        validation = {
            "is_valid": True,
            "missing_fields": [],
            "invalid_fields": [],
            "warnings": []
        }
        
        # Required fields for different document types
        required_fields = {
            "invoice": ["invoice_number", "date", "total_amount", "vendor_name"],
            "receipt": ["date", "total_amount", "vendor_name"],
            "bank_statement": ["date", "account_number", "bank_name"],
            "id_card": ["id_number", "name", "date_of_birth"],
            "contract": ["date", "parties", "contract_number"]
        }
        
        # Check for missing required fields
        if doc_type in required_fields:
            for field in required_fields[doc_type]:
                if not fields.get(field):
                    validation["missing_fields"].append(field)
                    validation["is_valid"] = False
        
        # Validate field formats
        if fields.get("invoice_number"):
            if not re.match(r"^[A-Z0-9-]+$", fields["invoice_number"]):
                validation["invalid_fields"].append("invoice_number")
                validation["warnings"].append("Invalid invoice number format")
        
        if fields.get("date"):
            try:
                datetime.strptime(fields["date"], "%d %b %Y")
            except ValueError:
                validation["invalid_fields"].append("date")
                validation["warnings"].append("Invalid date format")
        
        if fields.get("total_amount"):
            try:
                float(fields["total_amount"].replace(",", ""))
            except ValueError:
                validation["invalid_fields"].append("total_amount")
                validation["warnings"].append("Invalid amount format")
        
        return validation

    def _extract_structured_info(self, text: str, doc_type: str) -> Dict[str, Any]:
        """Extract structured information from text based on document type."""
        try:
            # Extract entities first
            entities = self._extract_entities(text)
            
            # Map entities to fields based on document type
            fields = {}
            
            # Common fields across document types
            if entities["date"]:
                fields["date"] = {
                    "value": entities["date"][0],
                    "confidence": 0.9
                }
            
            if doc_type == "invoice":
                if entities["invoice_number"]:
                    fields["invoice_number"] = {
                        "value": entities["invoice_number"][0],
                        "confidence": 0.9
                    }
                if entities["amount"]:
                    fields["total_amount"] = {
                        "value": entities["amount"][0],
                        "confidence": 0.9
                    }
                if entities["company_name"]:
                    fields["vendor_name"] = {
                        "value": entities["company_name"][0],
                        "confidence": 0.9
                    }
                    
            elif doc_type == "receipt":
                if entities["amount"]:
                    fields["total_amount"] = {
                        "value": entities["amount"][0],
                        "confidence": 0.9
                    }
                if entities["company_name"]:
                    fields["merchant_name"] = {
                        "value": entities["company_name"][0],
                        "confidence": 0.9
                    }
                    
            elif doc_type == "bank_statement":
                if entities["amount"]:
                    fields["balance"] = {
                        "value": entities["amount"][0],
                        "confidence": 0.9
                    }
            
            return fields
            
        except Exception as e:
            logger.error(f"Error extracting structured info: {str(e)}")
            return {} 