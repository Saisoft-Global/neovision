import os
import re
import cv2
import numpy as np
import pytesseract
from typing import Dict, List, Any, Union
import logging
from pathlib import Path
import fitz  # PyMuPDF
from PIL import Image, ImageFilter
from collections import defaultdict
from datetime import datetime, timedelta

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class OCRDocumentProcessor:
    def __init__(self):
        """Initialize the OCR Document Processor with Tesseract."""
        try:
            # Set Tesseract path for Windows
            if os.name == 'nt':
                pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
            
            # Initialize regex patterns for common fields
            self._init_regex_patterns()
            
            logger.info("OCR Document Processor initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing OCR Document Processor: {str(e)}")
            raise

    def _init_regex_patterns(self):
        """Initialize regex patterns for common field extraction."""
        self.patterns = {
            'invoice_number': [
                r'(?i)(?:inv|eiv)[-.]?0*(\d{6})',  # Format: INV-000038
                r'(?i)invoice\s*(?:no|number|#)?\s*[:#]?\s*([A-Z0-9-]+)',  # Standard format
                r'(?i)(?:ref|no)[-#]?\s*[:#]?\s*([A-Z0-9-]+)'  # Reference format
            ],
            'date': [
                r'(?i)(?:invoice|due)\s*date\s*:?\s*(\d{1,2}[-/\s]+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[-/\s]+\d{4})',
                r'(?i)date\s*:?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})',
                r'(?i)date\s*:?\s*(\d{4}[-/]\d{1,2}[-/]\d{1,2})'
            ],
            'amount': [
                r'(?i)(?:total|amount|balance)\s*:?\s*(?:AED|USD)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)',
                r'(?i)(?:AED|USD)\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)',
                r'(?:^|\s)(?:AED|USD)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:AED|USD)?(?:\s|$)'
            ],
            'vendor_name': [
                r'(?i)(?:from|vendor|company)\s*:?\s*(.*?)(?:\n|$)',
                r'(?i)(?:SAISOFT|INFORMATION TECHNOLOGY CONSULTANCY)[^\n]*'
            ]
        }

    def _preprocess_image(self, image: Image.Image) -> Image.Image:
        """Enhanced image preprocessing for better OCR accuracy."""
        try:
            # Convert to RGB if not already
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Convert to numpy array for advanced processing
            img_array = np.array(image)
            
            # Apply adaptive thresholding
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
            binary = cv2.adaptiveThreshold(
                gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                cv2.THRESH_BINARY, 11, 2
            )
            
            # Denoise the image
            denoised = cv2.fastNlMeansDenoising(binary)
            
            # Enhance contrast using CLAHE
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
            enhanced = clahe.apply(denoised)
            
            # Convert back to PIL Image
            enhanced_image = Image.fromarray(enhanced)
            
            # Resize if too large while maintaining aspect ratio
            max_size = 1600
            if max(enhanced_image.size) > max_size:
                ratio = max_size / max(enhanced_image.size)
                new_size = tuple(int(dim * ratio) for dim in enhanced_image.size)
                enhanced_image = enhanced_image.resize(new_size, Image.Resampling.LANCZOS)
            
            # Apply sharpening
            enhanced_image = enhanced_image.filter(ImageFilter.SHARPEN)
            
            return enhanced_image
        
        except Exception as e:
            logger.error(f"Error in image preprocessing: {str(e)}")
            return image  # Return original image if preprocessing fails

    def pdf_to_image(self, pdf_path: str) -> np.ndarray:
        """Convert PDF to image using PyMuPDF."""
        try:
            logger.info("Attempting PDF conversion with PyMuPDF...")
            # Open the PDF
            pdf_document = fitz.open(pdf_path)
            
            # Get the first page
            page = pdf_document[0]
            
            # Convert page to image
            pix = page.get_pixmap()
            
            # Convert to numpy array
            img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(
                pix.height, pix.width, pix.n
            )
            
            logger.info("Successfully converted PDF using PyMuPDF")
            return img

        except Exception as e:
            logger.error(f"Error converting PDF to image: {str(e)}")
            raise

    def extract_text(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """Extract text from image using Tesseract OCR."""
        try:
            # Preprocess image
            processed_image = self._preprocess_image(Image.fromarray(image))
            
            # Extract text and bounding boxes
            data = pytesseract.image_to_data(processed_image, output_type=pytesseract.Output.DICT)
            
            # Extract text blocks with confidence and position
            extracted_text = []
            n_boxes = len(data['text'])
            
            for i in range(n_boxes):
                if int(data['conf'][i]) > 0:  # Filter out low confidence results
                    text = data['text'][i].strip()
                    if text:  # Only include non-empty text
                        confidence = float(data['conf'][i]) / 100.0
                        bbox = [
                            (data['left'][i], data['top'][i]),
                            (data['left'][i] + data['width'][i], data['top'][i]),
                            (data['left'][i] + data['width'][i], data['top'][i] + data['height'][i]),
                            (data['left'][i], data['top'][i] + data['height'][i])
                        ]
                        
                        extracted_text.append({
                            'text': text,
                            'confidence': confidence,
                            'bbox': bbox
                        })
            
            logger.info(f"Successfully extracted text. Length: {len(extracted_text)}")
            return extracted_text

        except Exception as e:
            logger.error(f"Error in text extraction: {str(e)}")
            return []

    def extract_fields(self, text: str) -> Dict[str, Any]:
        """Extract fields using regex patterns."""
        try:
            entities = defaultdict(list)
            
            # Debug logging
            logging.info(f"Raw extracted text:\n{text}")
            
            # Preprocess text for invoice number extraction
            text_for_invoice = text.lower()
            text_for_invoice = text_for_invoice.replace('eiv', 'inv')  # Common OCR misread
            text_for_invoice = text_for_invoice.replace('.', '-')  # Normalize separators
            text_for_invoice = text_for_invoice.replace(' ', '')  # Remove spaces
            
            # Extract invoice number
            for pattern in self.patterns['invoice_number']:
                matches = re.finditer(pattern, text_for_invoice)
                for match in matches:
                    number = match.group(1).strip() if match.groups() else match.group(0).strip()
                    # Clean and validate invoice number
                    number = re.sub(r'[^\w-]', '', number)
                    if number.isdigit() and len(number) >= 6:
                        entities['invoice_number'] = [f'INV-{number.zfill(6)}']
                        break
            
            # Extract other fields
            for field, patterns in self.patterns.items():
                if field != 'invoice_number':  # Already handled
                    for pattern in patterns:
                        matches = re.finditer(pattern, text)
                        values = []
                        for match in matches:
                            value = match.group(1) if match.groups() else match.group(0)
                            value = value.strip()
                            if value and value not in values:
                                values.append(value)
                        if values:
                            entities[field] = values
                            break
            
            return entities

        except Exception as e:
            logger.error(f"Error in field extraction: {str(e)}")
            return {}

    def analyze_layout(self, extracted_text: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze document layout without using templates."""
        try:
            if not extracted_text:
                return {'headers': [], 'body': [], 'footers': []}

            # Sort text blocks by vertical position
            sorted_blocks = sorted(extracted_text, key=lambda x: x['bbox'][0][1])
            
            # Get total height
            total_height = max(block['bbox'][2][1] for block in extracted_text)
            
            headers = []
            body = []
            footers = []
            
            for block in sorted_blocks:
                y_pos = block['bbox'][0][1]
                if y_pos < total_height * 0.2:  # Top 20%
                    headers.append(block)
                elif y_pos > total_height * 0.8:  # Bottom 20%
                    footers.append(block)
                else:
                    body.append(block)
            
            return {
                'headers': headers,
                'body': body,
                'footers': footers
            }

        except Exception as e:
            logger.error(f"Error in layout analysis: {str(e)}")
            return {'headers': [], 'body': [], 'footers': []}

    def extract_tables(self, text: str, layout: Dict) -> List[Dict]:
        """Enhanced table extraction with improved accuracy."""
        try:
            tables = []
            current_table = None
            rows = []
            
            # Sort layout elements by vertical position
            sorted_elements = sorted(
                layout.get('body', []) + layout.get('headers', []),
                key=lambda x: x['bbox'][0][1]  # Sort by y-coordinate
            )
            
            for element in sorted_elements:
                text = element['text'].strip()
                if not text:
                    continue
                    
                # Check if this is a potential table header
                if self._is_table_header(text):
                    # If we have a current table, save it
                    if current_table and rows:
                        table = self._process_table(rows)
                        if table:
                            tables.append(table)
                    
                    # Start new table
                    current_table = {
                        'header': [text],
                        'data': [],
                        'column_types': {},
                        'bbox': element['bbox'],
                        'row_count': 0,
                        'column_count': 1
                    }
                    rows = [{'header': text}]
                    continue
                
                # Check if this is a potential table row
                if current_table and self._is_table_row(text, element['bbox']):
                    row_data = self._extract_row_data(text, element['bbox'])
                    if row_data:
                        rows.append(row_data)
                        current_table['row_count'] += 1
                        current_table['column_count'] = max(
                            current_table['column_count'],
                            len(row_data)
                        )
            
            # Add the last table if exists
            if current_table and rows:
                table = self._process_table(rows)
                if table:
                    tables.append(table)
            
            return tables
            
        except Exception as e:
            logger.error(f"Error in table extraction: {str(e)}")
            return []

    def _is_table_header(self, text: str) -> bool:
        """Enhanced table header detection."""
        header_keywords = {
            'invoice', 'date', 'amount', 'total', 'description', 'item',
            'quantity', 'price', 'subtotal', 'tax', 'vendor', 'customer',
            'account', 'reference', 'payment', 'terms', 'due', 'balance'
        }
        
        # Check for header keywords
        text_lower = text.lower()
        if any(keyword in text_lower for keyword in header_keywords):
            return True
        
        # Check for common header patterns
        header_patterns = [
            r'^[A-Z\s]+$',  # All caps
            r'^[A-Z][a-z]+(?:\s[A-Z][a-z]+)*$',  # Title Case
            r'^[A-Z0-9-]+$'  # Alphanumeric with hyphens
        ]
        
        return any(re.match(pattern, text) for pattern in header_patterns)

    def _is_table_row(self, text: str, bbox: List[List[int]]) -> bool:
        """Enhanced table row detection."""
        # Check for numeric content
        if re.match(r'^[\d,.]+$', text):
            return True
        
        # Check for date format
        if re.match(r'^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$', text):
            return True
        
        # Check for currency format
        if re.match(r'^[A-Z]{2,3}\s*[\d,]+\.?\d*$', text):
            return True
        
        # Check for alphanumeric content
        if re.match(r'^[A-Za-z0-9\s.,-]+$', text):
            return True
        
        return False

    def _extract_row_data(self, text: str, bbox: List[List[int]]) -> Dict:
        """Extract structured data from table row."""
        try:
            # Split text into potential columns
            columns = text.split()
            if not columns:
                return {}
            
            # Try to identify column types
            row_data = {}
            for i, col in enumerate(columns):
                # Check for date
                if re.match(r'^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$', col):
                    row_data[f'col_{i}'] = {'value': col, 'type': 'date'}
                # Check for amount
                elif re.match(r'^[\d,]+\.?\d*$', col):
                    row_data[f'col_{i}'] = {'value': col, 'type': 'number'}
                # Check for currency
                elif re.match(r'^[A-Z]{2,3}\s*[\d,]+\.?\d*$', col):
                    row_data[f'col_{i}'] = {'value': col, 'type': 'currency'}
                # Default to text
                else:
                    row_data[f'col_{i}'] = {'value': col, 'type': 'text'}
            
            return row_data
        
        except Exception as e:
            logger.error(f"Error extracting row data: {str(e)}")
            return {}

    def _process_table(self, rows: List[Dict]) -> Dict:
        """Process extracted table rows into structured format."""
        try:
            if not rows:
                return None
            
            # Get header row
            header = rows[0].get('header', '')
            if not header:
                return None
            
            # Process data rows
            data = []
            for row in rows[1:]:
                if isinstance(row, dict) and row.get('value'):
                    data.append(row)
            
            # Calculate table bounds
            bbox = self._calculate_table_bbox(rows)
            
            # Detect column types
            column_types = self._detect_column_types(data)
            
            return {
                'header': header,
                'data': data,
                'column_types': column_types,
                'bbox': bbox,
                'row_count': len(rows),
                'column_count': len(column_types)
            }
        
        except Exception as e:
            logger.error(f"Error processing table: {str(e)}")
            return None

    def _calculate_table_bbox(self, rows: List[Dict]) -> List[List[int]]:
        """Calculate bounding box for entire table."""
        try:
            if not rows:
                return [[0, 0], [0, 0], [0, 0], [0, 0]]
            
            # Initialize with first row's bbox
            bbox = rows[0].get('bbox', [[0, 0], [0, 0], [0, 0], [0, 0]])
            
            # Update with subsequent rows
            for row in rows[1:]:
                row_bbox = row.get('bbox', [[0, 0], [0, 0], [0, 0], [0, 0]])
                # Update bottom coordinates
                bbox[2][1] = max(bbox[2][1], row_bbox[2][1])
                bbox[3][1] = max(bbox[3][1], row_bbox[3][1])
                # Update right coordinates
                bbox[1][0] = max(bbox[1][0], row_bbox[1][0])
                bbox[2][0] = max(bbox[2][0], row_bbox[2][0])
            
            return bbox
        
        except Exception as e:
            logger.error(f"Error calculating table bbox: {str(e)}")
            return [[0, 0], [0, 0], [0, 0], [0, 0]]

    def _detect_column_types(self, data: List[Dict]) -> Dict[str, str]:
        """Detect data types for table columns."""
        try:
            column_types = {}
            if not data:
                return column_types
            
            # Analyze first row to determine types
            first_row = data[0]
            for col, value in first_row.items():
                val = value.get('value', '')
                # Check for date
                if re.match(r'^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$', val):
                    column_types[col] = 'date'
                # Check for number
                elif re.match(r'^[\d,]+\.?\d*$', val):
                    column_types[col] = 'number'
                # Check for currency
                elif re.match(r'^[A-Z]{2,3}\s*[\d,]+\.?\d*$', val):
                    column_types[col] = 'currency'
                # Default to text
                else:
                    column_types[col] = 'text'
            
            return column_types
        
        except Exception as e:
            logger.error(f"Error detecting column types: {str(e)}")
            return {}

    def process_document(self, file_path: Union[str, Path]) -> Dict[str, Any]:
        """Process a document and extract information."""
        try:
            file_path = Path(file_path)
            if not file_path.exists():
                raise FileNotFoundError(f"File not found: {file_path}")

            # Process each page separately
            all_results = []
            
            # Convert PDF to images if needed
            if file_path.suffix.lower() == '.pdf':
                # Open the PDF
                pdf_document = fitz.open(str(file_path))
                total_pages = len(pdf_document)
                logger.info(f"Processing PDF with {total_pages} pages")
                
                # Process each page
                for page_num in range(total_pages):
                    logger.info(f"Processing page {page_num+1}/{total_pages}")
                    page = pdf_document[page_num]
                    
                    # Convert page to image
                    pix = page.get_pixmap()
                    image = np.frombuffer(pix.samples, dtype=np.uint8).reshape(
                        pix.height, pix.width, pix.n
                    )
                    
                    # Process the page
                    page_result = self._process_page(image, page_num+1)
                    all_results.append(page_result)
                
                pdf_document.close()
            else:
                # Process single image
                image = cv2.imread(str(file_path))
                if image is None:
                    raise ValueError(f"Could not read image: {file_path}")
                
                page_result = self._process_page(image, 1)
                all_results.append(page_result)
            
            # Combine results
            combined_result = {
                'document_type': 'multi_document',
                'confidence': sum(r.get('confidence', 0) for r in all_results) / len(all_results) if all_results else 0.0,
                'pages': all_results,
                'total_pages': len(all_results),
                'extracted_documents': []
            }
            
            # Group pages into separate documents
            current_doc = None
            for page_result in all_results:
                # Check if this page starts a new document
                if self._is_new_document(page_result):
                    if current_doc:
                        combined_result['extracted_documents'].append(current_doc)
                    current_doc = {
                        'document_type': page_result.get('document_type', 'unknown'),
                        'confidence': page_result.get('confidence', 0.0),
                        'fields': page_result.get('fields', {}),
                        'tables': page_result.get('tables', []),
                        'pages': [page_result.get('page_number', 1)]
                    }
                else:
                    # Add to current document
                    if current_doc:
                        current_doc['pages'].append(page_result.get('page_number', 1))
                        # Merge fields and tables
                        for field, values in page_result.get('fields', {}).items():
                            if field not in current_doc['fields']:
                                current_doc['fields'][field] = []
                            current_doc['fields'][field].extend(values)
                        current_doc['tables'].extend(page_result.get('tables', []))
                        # Update confidence
                        current_doc['confidence'] = (current_doc['confidence'] + page_result.get('confidence', 0.0)) / 2
            
            # Add the last document if exists
            if current_doc:
                combined_result['extracted_documents'].append(current_doc)
            
            return combined_result

        except Exception as e:
            logger.error(f"Error processing document: {str(e)}")
            return {
                'error': str(e),
                'status': 'failed'
            }
    
    def _process_page(self, image: np.ndarray, page_number: int) -> Dict[str, Any]:
        """Process a single page and extract information."""
        try:
            # Extract text
            extracted_text = self.extract_text(image)
            
            # Combine all text for processing
            full_text = ' '.join(item['text'] for item in extracted_text)
            
            # Extract fields using regex
            fields = self.extract_fields(full_text)
            
            # Analyze layout
            layout = self.analyze_layout(extracted_text)
            
            # Extract tables
            tables = self.extract_tables(full_text, layout)
            
            # Calculate confidence score
            confidence = np.mean([item['confidence'] for item in extracted_text]) if extracted_text else 0.0
            
            # Determine document type
            doc_type = self._determine_document_type(full_text, fields)
            
            return {
                'page_number': page_number,
                'document_type': doc_type,
                'extracted_text': full_text,
                'fields': fields,
                'layout': layout,
                'tables': tables,
                'confidence': float(confidence),
                'raw_ocr_results': extracted_text
            }
        except Exception as e:
            logger.error(f"Error processing page {page_number}: {str(e)}")
            return {
                'page_number': page_number,
                'error': str(e),
                'status': 'failed'
            }
    
    def _is_new_document(self, page_result: Dict[str, Any]) -> bool:
        """Determine if a page starts a new document."""
        # Check for document type indicators
        doc_type = page_result.get('document_type', '')
        
        # Check for invoice number at the top of the page
        fields = page_result.get('fields', {})
        if 'invoice_number' in fields:
            return True
        
        # Check for document headers
        layout = page_result.get('layout', {})
        headers = layout.get('headers', [])
        
        # Look for document type indicators in headers
        header_text = ' '.join([h.get('text', '') for h in headers])
        header_text = header_text.lower()
        
        # Check for common document headers
        doc_indicators = [
            'invoice', 'receipt', 'statement', 'bill', 'payment', 
            'tax invoice', 'commercial invoice', 'bank statement'
        ]
        
        return any(indicator in header_text for indicator in doc_indicators)

    def _determine_document_type(self, text: str, fields: Dict[str, List[str]]) -> str:
        """Determine document type based on content and extracted fields."""
        text = text.lower()
        
        # Check for invoice indicators
        if ('invoice_number' in fields or 
            any(word in text for word in ['invoice', 'bill', 'payment due'])):
            return 'invoice'
        
        # Check for receipt indicators
        if any(word in text for word in ['receipt', 'thank you for your purchase']):
            return 'receipt'
        
        # Check for ID card indicators
        if any(word in text for word in ['id', 'identification', 'license']):
            return 'id_card'
        
        # Check for bank statement indicators
        if any(word in text for word in ['statement', 'account', 'balance']):
            return 'bank_statement'
        
        return 'unknown'

    def _extract_entities(self, text: str) -> Dict[str, List[str]]:
        """Enhanced entity extraction with improved accuracy."""
        try:
            # Clean and normalize text
            text = text.replace('\n', ' ').strip()
            text = re.sub(r'\s+', ' ', text)
            
            # Initialize result dictionary
            entities = {
                'invoice_number': [],
                'date': [],
                'total_amount': [],
                'vendor_name': []
            }
            
            # Enhanced invoice number patterns
            invoice_patterns = [
                r'(?i)invoice\s*(?:no|number|#)?\s*[:#]?\s*([A-Z0-9-]+)',
                r'(?i)inv\s*(?:no|number|#)?\s*[:#]?\s*([A-Z0-9-]+)',
                r'(?i)bill\s*(?:no|number|#)?\s*[:#]?\s*([A-Z0-9-]+)',
                r'(?i)doc(?:ument)?\s*(?:no|number|#)?\s*[:#]?\s*([A-Z0-9-]+)'
            ]
            
            # Enhanced date patterns
            date_patterns = [
                r'(?i)date\s*[:]?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})',
                r'(?i)issued\s*[:]?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})',
                r'(?i)created\s*[:]?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})',
                r'(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})'  # Fallback pattern
            ]
            
            # Enhanced amount patterns
            amount_patterns = [
                r'(?i)total\s*(?:amount)?\s*[:]?\s*([A-Z]{2,3}\s*[\d,]+\.?\d*)',
                r'(?i)amount\s*[:]?\s*([A-Z]{2,3}\s*[\d,]+\.?\d*)',
                r'(?i)sum\s*[:]?\s*([A-Z]{2,3}\s*[\d,]+\.?\d*)',
                r'(?i)due\s*[:]?\s*([A-Z]{2,3}\s*[\d,]+\.?\d*)',
                r'([A-Z]{2,3}\s*[\d,]+\.?\d*)'  # Fallback pattern
            ]
            
            # Enhanced vendor name patterns
            vendor_patterns = [
                r'(?i)from\s*[:]?\s*([A-Za-z0-9\s&.,]+(?:Ltd|LLC|Inc|Corp|Company|Limited))',
                r'(?i)vendor\s*[:]?\s*([A-Za-z0-9\s&.,]+(?:Ltd|LLC|Inc|Corp|Company|Limited))',
                r'(?i)supplier\s*[:]?\s*([A-Za-z0-9\s&.,]+(?:Ltd|LLC|Inc|Corp|Company|Limited))',
                r'(?i)company\s*[:]?\s*([A-Za-z0-9\s&.,]+(?:Ltd|LLC|Inc|Corp|Company|Limited))'
            ]
            
            # Extract entities using patterns
            for pattern in invoice_patterns:
                matches = re.finditer(pattern, text)
                for match in matches:
                    invoice_num = match.group(1).strip()
                    if invoice_num and invoice_num not in entities['invoice_number']:
                        entities['invoice_number'].append(invoice_num)
                        
            for pattern in date_patterns:
                matches = re.finditer(pattern, text)
                for match in matches:
                    date = match.group(1).strip()
                    if self._is_valid_date(date) and date not in entities['date']:
                        entities['date'].append(date)
                        
            for pattern in amount_patterns:
                matches = re.finditer(pattern, text)
                for match in matches:
                    amount = match.group(1).strip()
                    if self._is_valid_amount(amount) and amount not in entities['total_amount']:
                        entities['total_amount'].append(amount)
                        
            for pattern in vendor_patterns:
                matches = re.finditer(pattern, text)
                for match in matches:
                    vendor = match.group(1).strip()
                    if vendor and vendor not in entities['vendor_name']:
                        entities['vendor_name'].append(vendor)
            
            # Post-process extracted entities
            entities = self._post_process_entities(entities)
            
            return entities
            
        except Exception as e:
            logger.error(f"Error in entity extraction: {str(e)}")
            return {
                'invoice_number': [],
                'date': [],
                'total_amount': [],
                'vendor_name': []
            }

    def _is_valid_date(self, date_str: str) -> bool:
        """Validate date format and range."""
        try:
            # Try different date formats
            formats = ['%d-%m-%Y', '%Y-%m-%d', '%d/%m/%Y', '%Y/%m/%d']
            for fmt in formats:
                try:
                    date = datetime.strptime(date_str, fmt)
                    # Check if date is within reasonable range (e.g., last 10 years)
                    if date > datetime.now() - timedelta(days=3650) and date <= datetime.now():
                        return True
                except ValueError:
                    continue
            return False
        except Exception:
            return False

    def _is_valid_amount(self, amount_str: str) -> bool:
        """Validate amount format and range."""
        try:
            # Remove currency symbols and whitespace
            amount_str = re.sub(r'[^\d.,]', '', amount_str)
            # Replace comma with dot for decimal
            amount_str = amount_str.replace(',', '.')
            amount = float(amount_str)
            # Check if amount is within reasonable range
            return 0 < amount < 1000000000  # 1 billion as upper limit
        except Exception:
            return False

    def _post_process_entities(self, entities: Dict[str, List[str]]) -> Dict[str, List[str]]:
        """Clean and normalize extracted entities."""
        try:
            processed = {}
            for key, values in entities.items():
                processed[key] = []
                for value in values:
                    # Remove extra whitespace
                    value = ' '.join(value.split())
                    # Remove special characters
                    value = re.sub(r'[^\w\s.,-]', '', value)
                    # Convert to uppercase for consistency
                    if key in ['invoice_number', 'vendor_name']:
                        value = value.upper()
                    # Add to processed list if not empty
                    if value and value not in processed[key]:
                        processed[key].append(value)
            return processed
        except Exception as e:
            logger.error(f"Error in post-processing entities: {str(e)}")
            return entities

    def _is_valid_date(self, date_str: str) -> bool:
        """Validate date format and range."""
        try:
            # Try different date formats
            formats = ['%d-%m-%Y', '%Y-%m-%d', '%d/%m/%Y', '%Y/%m/%d']
            for fmt in formats:
                try:
                    date = datetime.strptime(date_str, fmt)
                    # Check if date is within reasonable range (e.g., last 10 years)
                    if date > datetime.now() - timedelta(days=3650) and date <= datetime.now():
                        return True
                except ValueError:
                    continue
            return False
        except Exception:
            return False

    def _is_valid_amount(self, amount_str: str) -> bool:
        """Validate amount format and range."""
        try:
            # Remove currency symbols and whitespace
            amount_str = re.sub(r'[^\d.,]', '', amount_str)
            # Replace comma with dot for decimal
            amount_str = amount_str.replace(',', '.')
            amount = float(amount_str)
            # Check if amount is within reasonable range
            return 0 < amount < 1000000000  # 1 billion as upper limit
        except Exception:
            return False

    def _post_process_entities(self, entities: Dict[str, List[str]]) -> Dict[str, List[str]]:
        """Clean and normalize extracted entities."""
        try:
            processed = {}
            for key, values in entities.items():
                processed[key] = []
                for value in values:
                    # Remove extra whitespace
                    value = ' '.join(value.split())
                    # Remove special characters
                    value = re.sub(r'[^\w\s.,-]', '', value)
                    # Convert to uppercase for consistency
                    if key in ['invoice_number', 'vendor_name']:
                        value = value.upper()
                    # Add to processed list if not empty
                    if value and value not in processed[key]:
                        processed[key].append(value)
            return processed
        except Exception as e:
            logger.error(f"Error in post-processing entities: {str(e)}")
            return entities 