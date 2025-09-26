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
import spacy
from spacy.tokens import Doc
from transformers import DonutProcessor, VisionEncoderDecoderModel
import torch
import json
from .feedback_learning import FeedbackLearningSystem
import uuid
import random

# Try to import training module, but make it optional
try:
    from spacy.training import create_optimizer
    from spacy.util import minibatch, compounding
    TRAINING_AVAILABLE = True
except ImportError:
    TRAINING_AVAILABLE = False
    logging.warning("spaCy training module not available. Training functionality will be disabled.")

# Try to import Tesseract, but make it optional
TESSERACT_AVAILABLE = False
try:
    import pytesseract
    TESSERACT_AVAILABLE = True
    if os.name == 'nt':  # Windows
        tesseract_path = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
        if os.path.exists(tesseract_path):
            pytesseract.pytesseract.tesseract_cmd = tesseract_path
except ImportError:
    logging.warning("Pytesseract not available. Using alternative text extraction methods.")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class OCRDocumentProcessor:
    def __init__(self, model_dir: str = "models", tesseract_path: str = None):
        """
        Initialize the OCR document processor.
        
        Args:
            model_dir: Directory to store models and feedback data
            tesseract_path: Path to Tesseract executable (optional)
        """
        # Initialize logger
        self.logger = logging.getLogger(__name__)
        
        # Configure Tesseract path if provided
        if tesseract_path and os.path.exists(tesseract_path):
            pytesseract.pytesseract.tesseract_cmd = tesseract_path
            self.logger.info(f"Using custom Tesseract path: {tesseract_path}")
        
        # Verify Tesseract installation
        try:
            pytesseract.get_tesseract_version()
            self.logger.info("Tesseract OCR is properly configured")
        except Exception as e:
            self.logger.error(f"Tesseract OCR error: {str(e)}")
            self.logger.error("Please install Tesseract OCR and ensure it's properly configured")
        
        # Initialize spaCy model for NER
        try:
            self.nlp = spacy.load("en_core_web_sm")
            self.logger.info("Loaded spaCy model successfully")
        except OSError:
            self.logger.warning("Downloading spaCy model...")
            os.system("python -m spacy download en_core_web_sm")
            self.nlp = spacy.load("en_core_web_sm")
        
        # Custom entity patterns for spaCy
        self.custom_patterns = [
            {"label": "INVOICE_NUMBER", "pattern": [
                {"LOWER": {"IN": ["invoice", "inv"]}},
                {"LOWER": {"IN": ["no", "number", "#"]}, "OP": "?"},
                {"IS_PUNCT": True, "OP": "?"},
                {"TEXT": {"REGEX": "^[A-Z0-9-]+$"}}
            ]},
            {"label": "AMOUNT", "pattern": [
                {"LOWER": {"IN": ["total", "amount", "sum", "due"]}},
                {"IS_PUNCT": True, "OP": "?"},
                {"TEXT": {"REGEX": "^[A-Z]{2,3}\\s*[\\d,]+(\\.[0-9]*)?$"}}
            ]},
            {"label": "DATE", "pattern": [
                {"LOWER": {"IN": ["date", "issued", "created"]}},
                {"IS_PUNCT": True, "OP": "?"},
                {"TEXT": {"REGEX": "^\\d{1,2}[-/]\\d{1,2}[-/]\\d{2,4}$"}}
            ]},
            {"label": "VENDOR", "pattern": [
                {"LOWER": {"IN": ["from", "vendor", "supplier", "company"]}},
                {"IS_PUNCT": True, "OP": "?"},
                {"TEXT": {"REGEX": "^[A-Za-z0-9\\s&.,]+(Ltd|LLC|Inc|Corp|Company|Limited)$"}}
            ]}
        ]
        
        # Add custom patterns to the pipeline
        ruler = self.nlp.add_pipe("entity_ruler", before="ner")
        ruler.add_patterns(self.custom_patterns)
        
        # Initialize other components
        self.processor = DonutProcessor.from_pretrained("naver-clova-ix/donut-base-finetuned-cord-v2")
        self.model = VisionEncoderDecoderModel.from_pretrained("naver-clova-ix/donut-base-finetuned-cord-v2")
        
        if torch.cuda.is_available():
            self.model = self.model.to("cuda")
            self.logger.info("Using GPU for model inference")
        else:
            self.logger.info("Using CPU for model inference")
        
        # Initialize regex patterns for common fields
        self._init_regex_patterns()
        
        # Initialize feedback learning system
        self.feedback_system = FeedbackLearningSystem()
        self.feedback_data = {}
        self.last_extraction = {}
        self.performance_metrics = {
            'accuracy': 0.0,
            'precision': 0.0,
            'recall': 0.0,
            'field_accuracy': {}
        }
        self.logger.info("OCR Document Processor initialized with feedback learning system")

        # Log available text extraction methods
        self.logger.info("Available text extraction methods:")
        self.logger.info("- PyMuPDF direct text extraction")
        self.logger.info("- Donut transformer model")
        self.logger.info(f"- Tesseract OCR: {'Available' if TESSERACT_AVAILABLE else 'Not available'}")

    def _init_regex_patterns(self):
        """Initialize regex patterns for common field extraction."""
        self.patterns = {
            'invoice_number': [
                r'(?i)(?:inv|eiv)[-.]?0*(\d{6})',  # Format: INV-000038
                r'(?i)invoice\s*(?:no|number|#)?\s*[:#]?\s*([A-Z0-9-]+)',  # Standard format
                r'(?i)(?:ref|no)[-#]?\s*[:#]?\s*([A-Z0-9-]+)',  # Reference format
                r'(?i)invoice\s*(?:no|number|#)?\s*[:#]?\s*([A-Z0-9-]+)'  # Additional format
            ],
            'date': [
                r'(?i)(?:invoice|due)\s*date\s*:?\s*(\d{1,2}[-/\s]+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[-/\s]+\d{4})',
                r'(?i)date\s*:?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})',
                r'(?i)date\s*:?\s*(\d{4}[-/]\d{1,2}[-/]\d{1,2})',
                r'(?i)date\s*:?\s*(\d{2}[-/]\d{2}[-/]\d{4})'  # Additional format
            ],
            'amount': [
                r'(?i)(?:total|amount|balance)\s*:?\s*(?:AED|USD)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)',
                r'(?i)(?:AED|USD)\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)',
                r'(?:^|\s)(?:AED|USD)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:AED|USD)?(?:\s|$)',
                r'(?i)total\s*(?:amount)?\s*:?\s*([A-Z]{2,3}\s*[\d,]+\.?\d*)'  # Additional format
            ],
            'vendor_name': [
                r'(?i)(?:from|vendor|company)\s*:?\s*(.*?)(?:\n|$)',
                r'(?i)(?:SAISOFT|INFORMATION TECHNOLOGY CONSULTANCY)[^\n]*',
                r'(?i)from\s*:?\s*([A-Za-z0-9\s&.,]+(?:Ltd|LLC|Inc|Corp|Company|Limited))'  # Additional format
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
            
            # Convert to grayscale
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
            
            # Apply bilateral filter to reduce noise while preserving edges
            denoised = cv2.bilateralFilter(gray, 9, 75, 75)
            
            # Apply adaptive thresholding with different block sizes
            binary1 = cv2.adaptiveThreshold(
                denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                cv2.THRESH_BINARY, 11, 2
            )
            binary2 = cv2.adaptiveThreshold(
                denoised, 255, cv2.ADAPTIVE_THRESH_MEAN_C, 
                cv2.THRESH_BINARY, 15, 3
            )
            
            # Combine both thresholding results
            binary = cv2.bitwise_and(binary1, binary2)
            
            # Enhance contrast using CLAHE
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
            enhanced = clahe.apply(binary)
            
            # Apply morphological operations to clean up the image
            kernel = np.ones((1, 1), np.uint8)
            enhanced = cv2.morphologyEx(enhanced, cv2.MORPH_CLOSE, kernel)
            enhanced = cv2.morphologyEx(enhanced, cv2.MORPH_OPEN, kernel)
            
            # Convert back to PIL Image
            enhanced_image = Image.fromarray(enhanced)
            
            # Resize if too large while maintaining aspect ratio
            max_size = 1600
            if max(enhanced_image.size) > max_size:
                ratio = max_size / max(enhanced_image.size)
                new_size = tuple(int(dim * ratio) for dim in enhanced_image.size)
                enhanced_image = enhanced_image.resize(new_size, Image.Resampling.LANCZOS)
            
            # Apply sharpening with enhanced parameters
            enhanced_image = enhanced_image.filter(ImageFilter.SHARPEN)
            enhanced_image = enhanced_image.filter(ImageFilter.EDGE_ENHANCE_MORE)
            
            return enhanced_image
        
        except Exception as e:
            self.logger.error(f"Error in image preprocessing: {str(e)}")
            return image  # Return original image if preprocessing fails

    def pdf_to_image(self, pdf_path: str) -> np.ndarray:
        """Convert PDF to image using PyMuPDF."""
        try:
            self.logger.info("Attempting PDF conversion with PyMuPDF...")
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
            
            self.logger.info("Successfully converted PDF using PyMuPDF")
            return img

        except Exception as e:
            self.logger.error(f"Error converting PDF to image: {str(e)}")
            raise

    def _extract_text_with_multiple_passes(self, image: Image.Image) -> List[Dict[str, Any]]:
        """Extract text using multiple OCR passes with different preprocessing settings."""
        try:
            results = []
            
            # Pass 1: Standard preprocessing
            processed_image = self._preprocess_image(image)
            data = pytesseract.image_to_data(processed_image, output_type=pytesseract.Output.DICT)
            results.append(self._process_ocr_data(data))
            
            # Pass 2: High contrast preprocessing
            high_contrast = self._apply_high_contrast(image)
            data = pytesseract.image_to_data(high_contrast, output_type=pytesseract.Output.DICT)
            results.append(self._process_ocr_data(data))
            
            # Pass 3: Edge-enhanced preprocessing
            edge_enhanced = self._apply_edge_enhancement(image)
            data = pytesseract.image_to_data(edge_enhanced, output_type=pytesseract.Output.DICT)
            results.append(self._process_ocr_data(data))
            
            # Combine results using confidence scores
            return self._combine_ocr_results(results)
            
        except Exception as e:
            self.logger.error(f"Error in multi-pass text extraction: {str(e)}")
            return []

    def _apply_high_contrast(self, image: Image.Image) -> Image.Image:
        """Apply high contrast preprocessing."""
        try:
            img_array = np.array(image)
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
            
            # Apply histogram equalization
            equalized = cv2.equalizeHist(gray)
            
            # Apply adaptive thresholding
            binary = cv2.adaptiveThreshold(
                equalized, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv2.THRESH_BINARY, 11, 2
            )
            
            return Image.fromarray(binary)
        except Exception as e:
            self.logger.error(f"Error in high contrast preprocessing: {str(e)}")
            return image

    def _apply_edge_enhancement(self, image: Image.Image) -> Image.Image:
        """Apply edge enhancement preprocessing."""
        try:
            img_array = np.array(image)
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
            
            # Apply Sobel edge detection
            sobelx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
            sobely = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
            
            # Combine edges
            edges = np.sqrt(sobelx**2 + sobely**2)
            edges = np.uint8(edges)
            
            # Enhance edges
            enhanced = cv2.addWeighted(gray, 0.7, edges, 0.3, 0)
            
            return Image.fromarray(enhanced)
        except Exception as e:
            self.logger.error(f"Error in edge enhancement preprocessing: {str(e)}")
            return image

    def _process_ocr_data(self, data: Dict) -> List[Dict[str, Any]]:
        """Process OCR data into structured format."""
        try:
            processed_data = []
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
                        
                        processed_data.append({
                            'text': text,
                            'confidence': confidence,
                            'bbox': bbox
                        })
            
            return processed_data
        except Exception as e:
            self.logger.error(f"Error processing OCR data: {str(e)}")
            return []

    def _combine_ocr_results(self, results: List[List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
        """Combine results from multiple OCR passes using confidence scores."""
        try:
            combined = []
            seen_texts = set()
            
            # Sort all results by confidence
            all_results = []
            for result in results:
                all_results.extend(result)
            
            # Sort by confidence in descending order
            all_results.sort(key=lambda x: x['confidence'], reverse=True)
            
            # Take the highest confidence result for each unique text
            for result in all_results:
                text = result['text'].lower().strip()
                if text not in seen_texts:
                    seen_texts.add(text)
                    combined.append(result)
            
            return combined
        except Exception as e:
            self.logger.error(f"Error combining OCR results: {str(e)}")
            return []

    def extract_text(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """Extract text using multiple methods in order of preference."""
        try:
            # Convert numpy array to PIL Image
            pil_image = Image.fromarray(image)
            
            extracted_text = []
            
            # 1. Try Donut model first
            self.logger.info("Attempting text extraction with Donut model...")
            donut_results = self._extract_text_with_donut(pil_image)
            if donut_results:
                self.logger.info(f"Donut model extracted {len(donut_results)} text blocks")
                extracted_text.extend(donut_results)
            
            # 2. If Donut results are insufficient, try PyMuPDF
            if not self._is_extraction_sufficient(extracted_text):
                self.logger.info("Donut results insufficient, trying PyMuPDF...")
                pymupdf_results = self._extract_text_with_pymupdf(image)
                if pymupdf_results:
                    self.logger.info(f"PyMuPDF extracted {len(pymupdf_results)} text blocks")
                    extracted_text.extend(pymupdf_results)
            
            # 3. If Tesseract is available and results are still insufficient, use it
            if TESSERACT_AVAILABLE and not self._is_extraction_sufficient(extracted_text):
                self.logger.info("Using Tesseract as fallback...")
                tesseract_results = self._extract_text_with_tesseract(pil_image)
                if tesseract_results:
                    self.logger.info(f"Tesseract extracted {len(tesseract_results)} text blocks")
                    extracted_text.extend(tesseract_results)
            
            if not extracted_text:
                self.logger.warning("No text was extracted by any method")
                return []
            
            # Clean and process the combined results
            self.logger.info(f"Processing {len(extracted_text)} total extracted text blocks")
            cleaned_text = self._clean_and_validate_text(extracted_text)
            self.logger.info(f"After cleaning: {len(cleaned_text)} text blocks remain")
            
            if not cleaned_text:
                self.logger.warning("No text blocks remained after cleaning")
                return []
            
            layout_groups = self._group_text_by_layout(cleaned_text)
            corrected_text = self._apply_context_correction(layout_groups)
            
            self.logger.info(f"Final processed text blocks: {len(corrected_text)}")
            return corrected_text
            
        except Exception as e:
            self.logger.error(f"Error in text extraction: {str(e)}")
            return []

    def _is_extraction_sufficient(self, extracted_text: List[Dict[str, Any]]) -> bool:
        """Check if the extracted text meets minimum quality criteria."""
        if not extracted_text:
            return False
            
        # Check total text length
        total_text = ' '.join(block['text'] for block in extracted_text)
        if len(total_text) < 50:  # Minimum character threshold
            return False
            
        # Check confidence scores
        avg_confidence = sum(block.get('confidence', 0) for block in extracted_text) / len(extracted_text)
        if avg_confidence < 0.5:  # Minimum confidence threshold
            return False
            
        return True

    def _extract_text_with_donut(self, image: Image.Image) -> List[Dict[str, Any]]:
        """Extract text using the Donut model."""
        try:
            self.logger.info("Starting Donut model text extraction...")
            
            # Preprocess image for Donut
            processed_image = self._preprocess_image_for_donut(image)
            
            # Ensure image is in the correct format
            if processed_image.mode != 'RGB':
                processed_image = processed_image.convert('RGB')
            
            # Process image with Donut processor
            try:
                pixel_values = self.processor(processed_image, return_tensors="pt").pixel_values
            except Exception as e:
                self.logger.error(f"Error processing image with Donut processor: {str(e)}")
                return {
                    'text': '',
                    'data': [],
                    'fields': {},
                    'confidence': 0.0
                }
            
            self.logger.info("Image preprocessed for Donut model")
            
            # Move to GPU if available
            if torch.cuda.is_available():
                try:
                    pixel_values = pixel_values.to("cuda")
                    self.model = self.model.to("cuda")
                except Exception as e:
                    self.logger.error(f"Error moving model to GPU: {str(e)}")
                    # Continue with CPU if GPU fails
            
            # Generate text with improved parameters
            try:
                generated_ids = self.model.generate(
                    pixel_values,
                    max_length=1024,
                    num_beams=4,
                    early_stopping=False,
                    pad_token_id=self.processor.tokenizer.pad_token_id,
                    eos_token_id=self.processor.tokenizer.eos_token_id,
                    use_cache=True,
                    num_return_sequences=1,
                    do_sample=False,
                    temperature=1.0,
                    top_k=50,
                    top_p=0.95
                )
            except Exception as e:
                self.logger.error(f"Error generating text with Donut model: {str(e)}")
                return {
                    'text': '',
                    'data': [],
                    'fields': {},
                    'confidence': 0.0
                }
            
            self.logger.info("Donut model generated text")
            
            # Decode generated text
            try:
                generated_text = self.processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
            except Exception as e:
                self.logger.error(f"Error decoding generated text: {str(e)}")
                return {
                    'text': '',
                    'data': [],
                    'fields': {},
                    'confidence': 0.0
                }
            
            self.logger.info(f"Decoded text length: {len(generated_text)}")
            
            if not generated_text.strip():
                self.logger.warning("Donut model returned empty text")
                return {
                    'text': '',
                    'data': [],
                    'fields': {},
                    'confidence': 0.0
                }
            
            # Process the text into structured data
            data_blocks = []
            confidence = 0.8  # Base confidence for Donut model
            
            # Split text into lines and create data blocks
            lines = [line.strip() for line in generated_text.split('\n') if line.strip()]
            for line in lines:
                data_blocks.append({
                    'text': line,
                    'confidence': confidence,
                    'bbox': None  # Donut doesn't provide bounding boxes
                })
            
            # Extract fields using regex patterns
            fields = self.extract_fields(generated_text)
            
            # Adjust confidence based on field extraction success
            if fields:
                confidence += 0.1
            
            result = {
                'text': generated_text,
                'data': data_blocks,
                'fields': fields,
                'confidence': min(confidence, 1.0)  # Ensure confidence doesn't exceed 1.0
            }
            
            self.logger.info(f"Donut model extracted {len(data_blocks)} text blocks")
            return [result]
            
        except Exception as e:
            self.logger.error(f"Error in Donut text extraction: {str(e)}")
            return []

    def _clean_and_validate_text(self, text_blocks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Clean and validate extracted text blocks."""
        try:
            self.logger.info(f"Starting text cleaning and validation for {len(text_blocks)} blocks")
            cleaned_blocks = []
            
            for block in text_blocks:
                text = block.get("text", "").strip()
                if not text:
                    continue
                
                # Remove special characters and normalize whitespace
                text = re.sub(r'[^\w\s.,;:()/-]', ' ', text)
                text = re.sub(r'\s+', ' ', text).strip()
                
                if len(text) < 2:  # Skip very short texts
                    continue
                
                block["text"] = text
                cleaned_blocks.append(block)
            
            self.logger.info(f"After cleaning: {len(cleaned_blocks)} blocks remain")
            return cleaned_blocks
            
        except Exception as e:
            self.logger.error(f"Error in text cleaning: {str(e)}")
            return []

    def _group_text_by_layout(self, text_blocks: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """Group text blocks by layout position."""
        try:
            if not text_blocks:
                return {'header': [], 'body': text_blocks, 'footer': []}
            
            # Sort blocks by vertical position
            sorted_blocks = sorted(text_blocks, key=lambda x: x['bbox'][0][1])
            
            # Get total height from bounding boxes
            max_y = max(block['bbox'][2][1] for block in text_blocks)
            min_y = min(block['bbox'][0][1] for block in text_blocks)
            total_height = max_y - min_y
            
            # Initialize layout groups
            layout_groups = {
                'header': [],
                'body': [],
                'footer': []
            }
            
            # Group blocks by position
            for block in sorted_blocks:
                y_pos = (block['bbox'][0][1] - min_y) / total_height
                
                if y_pos < 0.2:  # Top 20%
                    layout_groups['header'].append(block)
                elif y_pos > 0.8:  # Bottom 20%
                    layout_groups['footer'].append(block)
                else:
                    layout_groups['body'].append(block)
            
            return layout_groups
            
        except Exception as e:
            self.logger.error(f"Error in layout grouping: {str(e)}")
            return {'header': [], 'body': text_blocks, 'footer': []}

    def _apply_context_correction(self, layout_groups: Dict[str, List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
        """Apply context-aware correction to text blocks."""
        try:
            corrected_blocks = []
            
            # Process each layout group
            for group_name, blocks in layout_groups.items():
                # Sort blocks by position
                sorted_blocks = sorted(blocks, key=lambda x: (x['bbox'][0][1], x['bbox'][0][0]))
                
                # Apply group-specific corrections
                if group_name == 'header':
                    corrected_blocks.extend(self._correct_header_blocks(sorted_blocks))
                elif group_name == 'body':
                    corrected_blocks.extend(self._correct_body_blocks(sorted_blocks))
                else:  # footer
                    corrected_blocks.extend(self._correct_footer_blocks(sorted_blocks))
            
            return corrected_blocks
            
        except Exception as e:
            self.logger.error(f"Error in context correction: {str(e)}")
            return [block for blocks in layout_groups.values() for block in blocks]

    def _correct_header_blocks(self, blocks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Apply corrections specific to header blocks."""
        try:
            corrected = []
            
            for block in blocks:
                text = block['text']
                
                # Header-specific corrections
                text = text.upper()  # Headers are often uppercase
                text = re.sub(r'\s+', ' ', text)  # Normalize whitespace
                
                block['text'] = text
                corrected.append(block)
            
            return corrected
            
        except Exception as e:
            self.logger.error(f"Error in header correction: {str(e)}")
            return blocks

    def _correct_body_blocks(self, blocks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Apply corrections specific to body blocks."""
        try:
            corrected = []
            
            for block in blocks:
                text = block['text']
                
                # Body-specific corrections
                text = text.title()  # Capitalize words
                text = re.sub(r'\s+', ' ', text)  # Normalize whitespace
                
                block['text'] = text
                corrected.append(block)
            
            return corrected
            
        except Exception as e:
            self.logger.error(f"Error in body correction: {str(e)}")
            return blocks

    def _correct_footer_blocks(self, blocks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Apply corrections specific to footer blocks."""
        try:
            corrected = []
            
            for block in blocks:
                text = block['text']
                
                # Footer-specific corrections
                text = text.lower()  # Footers are often lowercase
                text = re.sub(r'\s+', ' ', text)  # Normalize whitespace
                
                block['text'] = text
                corrected.append(block)
            
            return corrected
            
        except Exception as e:
            self.logger.error(f"Error in footer correction: {str(e)}")
            return blocks

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
                    if len(number) >= 4:  # Relaxed validation
                        entities['invoice_number'] = [f'INV-{number.zfill(6)}']
                        break
            
            # Extract other fields with relaxed patterns
            for field, patterns in self.patterns.items():
                if field != 'invoice_number':  # Already handled
                    for pattern in patterns:
                        matches = re.finditer(pattern, text, re.IGNORECASE)
                        values = []
                        for match in matches:
                            value = match.group(1) if match.groups() else match.group(0)
                            value = value.strip()
                            if value and value not in values:
                                values.append(value)
                        if values:
                            entities[field] = values
                            break
            
            # If no fields found, try spaCy NER
            if not any(entities.values()):
                doc = self.nlp(text)
                for ent in doc.ents:
                    if ent.label_ in ['INVOICE_NUMBER', 'AMOUNT', 'DATE', 'VENDOR']:
                        field_map = {
                            'INVOICE_NUMBER': 'invoice_number',
                            'AMOUNT': 'total_amount',
                            'DATE': 'date',
                            'VENDOR': 'vendor_name'
                        }
                        entities[field_map[ent.label_]].append(ent.text)
            
            return entities

        except Exception as e:
            self.logger.error(f"Error in field extraction: {str(e)}")
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
            self.logger.error(f"Error in layout analysis: {str(e)}")
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
            
            # Group elements by their vertical position (with tolerance)
            y_tolerance = 10  # pixels
            line_groups = []
            current_line = []
            last_y = None
            
            for element in sorted_elements:
                y_pos = element['bbox'][0][1]
                
                if last_y is None or abs(y_pos - last_y) <= y_tolerance:
                    current_line.append(element)
                else:
                    if current_line:
                        # Sort elements in line by x-coordinate
                        current_line.sort(key=lambda x: x['bbox'][0][0])
                        line_groups.append(current_line)
                    current_line = [element]
                
                last_y = y_pos
            
            # Add the last line
            if current_line:
                current_line.sort(key=lambda x: x['bbox'][0][0])
                line_groups.append(current_line)
            
            # Analyze lines for table structure
            min_rows = 2  # Minimum number of rows to consider as table
            min_cols = 2  # Minimum number of columns to consider as table
            current_table = None
            table_rows = []
            
            for i, line in enumerate(line_groups):
                # Skip empty lines
                if not line:
                    continue
                
                # Extract text and positions from line
                line_text = [elem['text'].strip() for elem in line]
                line_positions = [elem['bbox'] for elem in line]
                
                # Check if this could be a header
                if self._is_potential_header(line_text):
                    # If we have a current table, save it if it meets criteria
                    if current_table and len(table_rows) >= min_rows:
                        table = self._process_table_rows(current_table, table_rows)
                        if table and table['column_count'] >= min_cols:
                            tables.append(table)
                    
                    # Start new table
                    current_table = {
                        'header': line_text,
                        'header_positions': line_positions,
                        'column_count': len(line_text)
                    }
                    table_rows = []
                    continue
                
                # If we have a current table, try to add this line as a row
                if current_table:
                    # Check if this line could be part of the table
                    if self._is_potential_table_row(line_text, current_table):
                        table_rows.append({
                            'text': line_text,
                            'positions': line_positions
                        })
                    else:
                        # Line doesn't match table structure, end current table
                        if len(table_rows) >= min_rows:
                            table = self._process_table_rows(current_table, table_rows)
                            if table and table['column_count'] >= min_cols:
                                tables.append(table)
                        current_table = None
                        table_rows = []
            
            # Process the last table if exists
            if current_table and len(table_rows) >= min_rows:
                table = self._process_table_rows(current_table, table_rows)
                if table and table['column_count'] >= min_cols:
                    tables.append(table)
            
            return tables
            
        except Exception as e:
            self.logger.error(f"Error in table extraction: {str(e)}")
            return []

    def _is_potential_header(self, line_text: List[str]) -> bool:
        """Check if a line could be a table header."""
        if not line_text:
            return False
        
        # Header characteristics
        header_indicators = ['id', 'date', 'description', 'amount', 'quantity', 'price', 'total']
        
        # Check if any text in the line matches header indicators
        text_lower = [t.lower() for t in line_text]
        if any(indicator in ' '.join(text_lower) for indicator in header_indicators):
            return True
        
        # Check if the line has multiple capitalized words
        capitalized_words = sum(1 for t in line_text if t and t[0].isupper())
        if capitalized_words >= 2 and len(line_text) >= 2:
            return True
        
        return False

    def _is_potential_table_row(self, line_text: List[str], table: Dict) -> bool:
        """Check if a line could be a table row."""
        if not line_text:
            return False
        
        # Check if the number of columns roughly matches the header
        column_ratio = len(line_text) / table['column_count']
        if not (0.5 <= column_ratio <= 1.5):
            return False
        
        # Check if at least one cell contains a number
        has_number = any(
            any(c.isdigit() for c in cell)
            for cell in line_text
        )
        
        # Check if cells are reasonably sized
        reasonable_length = all(
            1 <= len(cell) <= 50
            for cell in line_text
        )
        
        return has_number and reasonable_length

    def _process_table_rows(self, table: Dict, rows: List[Dict]) -> Dict:
        """Process collected rows into a structured table."""
        try:
            if not table or not rows:
                return None
            
            # Initialize table structure
            processed_table = {
                'header': table['header'],
                'data': [],
                'column_types': {},
                'bbox': self._calculate_table_bbox(table['header_positions'], rows),
                'row_count': len(rows),
                'column_count': table['column_count']
            }
            
            # Process each row
            for row in rows:
                processed_row = []
                for i, cell in enumerate(row['text']):
                    # Clean and normalize cell text
                    cell_text = cell.strip()
                    if cell_text:
                        processed_row.append(cell_text)
                        
                        # Update column type information
                        col_name = table['header'][i] if i < len(table['header']) else f'Column_{i}'
                        if col_name not in processed_table['column_types']:
                            processed_table['column_types'][col_name] = self._detect_column_type(cell_text)
                
                if processed_row:
                    processed_table['data'].append(processed_row)
            
            return processed_table
            
        except Exception as e:
            self.logger.error(f"Error processing table rows: {str(e)}")
            return None

    def _calculate_table_bbox(self, header_positions: List, rows: List[Dict]) -> List:
        """Calculate the bounding box for the entire table."""
        try:
            if not header_positions or not rows:
                return [[0, 0], [0, 0], [0, 0], [0, 0]]
            
            # Get all positions
            all_positions = header_positions + [
                pos
                for row in rows
                for pos in row['positions']
            ]
            
            # Find min/max coordinates
            min_x = min(pos[0][0] for pos in all_positions)
            min_y = min(pos[0][1] for pos in all_positions)
            max_x = max(pos[2][0] for pos in all_positions)
            max_y = max(pos[2][1] for pos in all_positions)
            
            return [
                [min_x, min_y],  # Top-left
                [max_x, min_y],  # Top-right
                [max_x, max_y],  # Bottom-right
                [min_x, max_y]   # Bottom-left
            ]
            
        except Exception as e:
            self.logger.error(f"Error calculating table bbox: {str(e)}")
            return [[0, 0], [0, 0], [0, 0], [0, 0]]

    def _detect_column_type(self, text: str) -> str:
        """Detect the type of data in a column."""
        text = text.strip()
        
        # Check for empty
        if not text:
            return 'empty'
        
        # Check for numeric (including currency)
        if re.match(r'^[$€£¥]?\s*-?\d+(?:,\d{3})*(?:\.\d+)?(?:\s*%)?$', text):
            return 'numeric'
        
        # Check for date
        date_patterns = [
            r'\d{1,2}[-/]\d{1,2}[-/]\d{2,4}',
            r'\d{4}[-/]\d{1,2}[-/]\d{1,2}',
            r'\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4}'
        ]
        if any(re.match(pattern, text, re.IGNORECASE) for pattern in date_patterns):
            return 'date'
        
        # Check for boolean
        if text.lower() in ['yes', 'no', 'true', 'false']:
            return 'boolean'
        
        # Default to text
        return 'text'

    def process_document(self, image: Union[str, Image.Image, np.ndarray]) -> Dict:
        """Process a document using both Tesseract and Donut models."""
        try:
            # Convert input to PIL Image if needed
            if isinstance(image, str):
                if image.lower().endswith('.pdf'):
                    # Handle PDF files
                    pdf_document = fitz.open(image)
                    page = pdf_document[0]
                    pix = page.get_pixmap(matrix=fitz.Matrix(2.0, 2.0))  # 2x resolution
                    image = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                else:
                    # Handle image files
                    image = Image.open(image)
            elif isinstance(image, np.ndarray):
                image = Image.fromarray(image)
            
            # Ensure image is in RGB mode
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            self.logger.info("Starting document processing...")
            
            # Process with Donut model
            self.logger.info("Processing with Donut model...")
            donut_results = self._process_with_donut(image)
            
            # Process with Tesseract
            self.logger.info("Processing with Tesseract...")
            tesseract_results = self._process_with_tesseract(image)
            
            # Combine results
            self.logger.info("Combining results from both models...")
            combined_results = self._combine_results(donut_results, tesseract_results)
            
            # Log processing completion
            self.logger.info("Document processing completed successfully")
            self.logger.info(f"Total text length: {len(combined_results.get('text', ''))}")
            self.logger.info(f"Number of fields extracted: {len(combined_results.get('fields', {}))}")
            self.logger.info(f"Number of data blocks: {len(combined_results.get('data', []))}")
            self.logger.info(f"Overall confidence: {combined_results.get('confidence', 0.0):.2f}")
            
            return combined_results
            
        except Exception as e:
            self.logger.error(f"Error processing document: {str(e)}")
            return {
                "error": str(e),
                "text": "",
                "data": [],
                "fields": {},
                "confidence": 0.0
            }

    def _process_with_donut(self, image: Image.Image) -> Dict:
        """Process image with Donut model."""
        try:
            self.logger.info("Starting Donut model text extraction...")
            
            # Preprocess image for Donut
            processed_image = self._preprocess_image_for_donut(image)
            
            # Ensure image is in the correct format
            if processed_image.mode != 'RGB':
                processed_image = processed_image.convert('RGB')
            
            # Process image with Donut processor
            try:
                pixel_values = self.processor(processed_image, return_tensors="pt").pixel_values
            except Exception as e:
                self.logger.error(f"Error processing image with Donut processor: {str(e)}")
                return {
                    'text': '',
                    'data': [],
                    'fields': {},
                    'confidence': 0.0
                }
            
            self.logger.info("Image preprocessed for Donut model")
            
            # Move to GPU if available
            if torch.cuda.is_available():
                try:
                    pixel_values = pixel_values.to("cuda")
                    self.model = self.model.to("cuda")
                except Exception as e:
                    self.logger.error(f"Error moving model to GPU: {str(e)}")
                    # Continue with CPU if GPU fails
            
            # Generate text with improved parameters
            try:
                generated_ids = self.model.generate(
                    pixel_values,
                    max_length=1024,
                    num_beams=4,
                    early_stopping=False,
                    pad_token_id=self.processor.tokenizer.pad_token_id,
                    eos_token_id=self.processor.tokenizer.eos_token_id,
                    use_cache=True,
                    num_return_sequences=1,
                    do_sample=False,
                    temperature=1.0,
                    top_k=50,
                    top_p=0.95
                )
            except Exception as e:
                self.logger.error(f"Error generating text with Donut model: {str(e)}")
                return {
                    'text': '',
                    'data': [],
                    'fields': {},
                    'confidence': 0.0
                }
            
            self.logger.info("Donut model generated text")
            
            # Decode generated text
            try:
                generated_text = self.processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
            except Exception as e:
                self.logger.error(f"Error decoding generated text: {str(e)}")
                return {
                    'text': '',
                    'data': [],
                    'fields': {},
                    'confidence': 0.0
                }
            
            self.logger.info(f"Decoded text length: {len(generated_text)}")
            
            if not generated_text.strip():
                self.logger.warning("Donut model returned empty text")
                return {
                    'text': '',
                    'data': [],
                    'fields': {},
                    'confidence': 0.0
                }
            
            # Process the text into structured data
            data_blocks = []
            confidence = 0.8  # Base confidence for Donut model
            
            # Split text into lines and create data blocks
            lines = [line.strip() for line in generated_text.split('\n') if line.strip()]
            for line in lines:
                data_blocks.append({
                    'text': line,
                    'confidence': confidence,
                    'bbox': None  # Donut doesn't provide bounding boxes
                })
            
            # Extract fields using regex patterns
            fields = self.extract_fields(generated_text)
            
            # Adjust confidence based on field extraction success
            if fields:
                confidence += 0.1
            
            result = {
                'text': generated_text,
                'data': data_blocks,
                'fields': fields,
                'confidence': min(confidence, 1.0)  # Ensure confidence doesn't exceed 1.0
            }
            
            self.logger.info(f"Donut model extracted {len(data_blocks)} text blocks")
            return result
            
        except Exception as e:
            self.logger.error(f"Error in Donut text extraction: {str(e)}")
            return {
                'text': '',
                'data': [],
                'fields': {},
                'confidence': 0.0
            }

    def _preprocess_image_for_donut(self, image: Image.Image) -> Image.Image:
        """Preprocess image specifically for Donut model."""
        try:
            # Convert to RGB if not already
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Resize image to model's expected size while maintaining aspect ratio
            target_size = (1280, 960)  # Donut model's expected size
            ratio = min(target_size[0] / image.width, target_size[1] / image.height)
            new_size = (int(image.width * ratio), int(image.height * ratio))
            image = image.resize(new_size, Image.Resampling.LANCZOS)
            
            # Create a white background image of target size
            background = Image.new('RGB', target_size, (255, 255, 255))
            
            # Paste the resized image onto the white background
            offset = ((target_size[0] - new_size[0]) // 2,
                     (target_size[1] - new_size[1]) // 2)
            background.paste(image, offset)
            
            # Convert to numpy array for OpenCV operations
            img_array = np.array(background)
            
            # Convert to grayscale
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
            
            # Apply adaptive thresholding
            binary = cv2.adaptiveThreshold(
                gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv2.THRESH_BINARY, 11, 2
            )
            
            # Apply morphological operations
            kernel = np.ones((1, 1), np.uint8)
            binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
            binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)
            
            # Convert back to RGB
            processed = cv2.cvtColor(binary, cv2.COLOR_GRAY2RGB)
            
            # Convert back to PIL Image
            processed_image = Image.fromarray(processed)
            
            self.logger.info(f"Donut preprocessing completed. Final size: {processed_image.size}")
            return processed_image
            
        except Exception as e:
            self.logger.error(f"Error in Donut preprocessing: {str(e)}")
            return image  # Return original image if preprocessing fails

    def _process_with_tesseract(self, image: Image.Image) -> Dict:
        """Process image with Tesseract OCR."""
        try:
            # Convert image to numpy array for OpenCV processing
            img_array = np.array(image)
            
            # Convert to grayscale
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
            
            # Apply preprocessing
            processed = self._preprocess_image(Image.fromarray(gray))
            
            # Extract text using Tesseract
            text = pytesseract.image_to_string(processed)
            
            # Extract data with bounding boxes
            data = pytesseract.image_to_data(processed, output_type=pytesseract.Output.DICT)
            
            # Process the extracted data
            processed_data = []
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
                        
                        processed_data.append({
                            'text': text,
                            'confidence': confidence,
                            'bbox': bbox
                        })
            
            # Extract fields using regex patterns
            fields = self.extract_fields(text)
            
            return {
                'text': text,
                'data': processed_data,
                'fields': fields,
                'confidence': sum(d['confidence'] for d in processed_data) / len(processed_data) if processed_data else 0.0
            }
            
        except Exception as e:
            self.logger.error(f"Error in Tesseract processing: {str(e)}")
            return {
                'text': '',
                'data': [],
                'fields': {},
                'confidence': 0.0
            }

    def _combine_results(self, donut_results: Dict, tesseract_results: Dict) -> Dict:
        """Combine results from Donut and Tesseract models."""
        try:
            # Initialize combined results
            combined = {
                'text': '',
                'data': [],
                'fields': {},
                'confidence': 0.0
            }
            
            # Combine text (prefer Donut's text if available)
            donut_text = donut_results.get('text', '').strip()
            tesseract_text = tesseract_results.get('text', '').strip()
            
            if donut_text and tesseract_text:
                # Use both texts with a separator
                combined['text'] = f"{donut_text}\n\n=== Additional Text ===\n\n{tesseract_text}"
            else:
                # Use whichever is available
                combined['text'] = donut_text or tesseract_text
            
            # Combine data blocks
            combined['data'] = (
                donut_results.get('data', []) +
                tesseract_results.get('data', [])
            )
            
            # Combine fields, preferring Donut's fields but adding any unique fields from Tesseract
            donut_fields = donut_results.get('fields', {})
            tesseract_fields = tesseract_results.get('fields', {})
            
            combined['fields'] = donut_fields.copy()
            for field, value in tesseract_fields.items():
                if field not in combined['fields']:
                    combined['fields'][field] = value
            
            # Calculate weighted confidence score
            donut_conf = donut_results.get('confidence', 0.0)
            tesseract_conf = tesseract_results.get('confidence', 0.0)
            
            if donut_conf and tesseract_conf:
                # Weight Donut's confidence more heavily (0.6 vs 0.4)
                combined['confidence'] = (donut_conf * 0.6) + (tesseract_conf * 0.4)
            else:
                # Use whichever confidence is available
                combined['confidence'] = donut_conf or tesseract_conf
            
            return combined
            
        except Exception as e:
            self.logger.error(f"Error combining results: {str(e)}")
            return {
                'text': '',
                'data': [],
                'fields': {},
                'confidence': 0.0
            } 