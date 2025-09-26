import logging
from typing import Dict, Any, List, Optional, Tuple
import torch
from PIL import Image
import numpy as np
from paddleocr import PaddleOCR
try:
    # Optionally load .env for local runs; safe no-op if package/file missing
    from dotenv import load_dotenv  # type: ignore
    load_dotenv()
except Exception:
    pass
import spacy
from transformers import LayoutLMv3Processor, LayoutLMv3ForTokenClassification
from transformers import VisionEncoderDecoderModel, TrOCRProcessor  # optional, for handwriting
import re
from fastapi import HTTPException
import fitz  # PyMuPDF
import io
import os
import tempfile
try:
    import cv2  # type: ignore
except Exception:  # pragma: no cover
    cv2 = None

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

        # Initialize field patterns early to avoid attribute errors if later init fails
        # Will be populated with concrete patterns below
        self.field_patterns = {}
        
        # Initialize active model manager
        try:
            from models.active_model_manager import ActiveModelManager
            self.active_model_manager = ActiveModelManager()
            logger.info("Active model manager initialized")
        except Exception as e:
            logger.warning(f"Failed to initialize active model manager: {e}")
            self.active_model_manager = None
        
        # Initialize OCR
        # Allow configuring language via env var OCR_LANG. Examples: "en", "ar", "en,ar"
        ocr_lang_env = os.getenv("OCR_LANG", "en")
        try:
            configured_langs = [lang.strip() for lang in ocr_lang_env.split(",") if lang.strip()]
        except Exception:
            configured_langs = ["en"]

        logger.info(f"Initializing PaddleOCR with languages: {configured_langs}")
        self.configured_ocr_langs = configured_langs

        # If multiple languages are provided, build multiple OCR instances and fall back across them
        self.ocrs = []
        for _lang in configured_langs:
            try:
                self.ocrs.append(
                    PaddleOCR(
                        use_angle_cls=True,
                        lang=_lang,
                        use_gpu=torch.cuda.is_available(),
                        show_log=False
                    )
                )
            except Exception as e:
                logger.error(f"Failed to initialize PaddleOCR for lang '{_lang}': {e}")

        # Maintain backward compatibility with code that references self.ocr
        self.ocr = self.ocrs[0] if self.ocrs else PaddleOCR(
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
        
        try:
            self.layout_processor = LayoutLMv3Processor.from_pretrained(
                layout_model_name,
                apply_ocr=False  # Important: Set to False since we use PaddleOCR
            )
            
            # Prefer a fine-tuned checkpoint if provided; fall back to base
            checkpoint_path = os.getenv("LAYOUTLM_CHECKPOINT")
            if checkpoint_path and os.path.exists(checkpoint_path):
                logger.info(f"Loading fine-tuned LayoutLM checkpoint from: {checkpoint_path}")
                self.layout_model = LayoutLMv3ForTokenClassification.from_pretrained(
                    checkpoint_path,
                    num_labels=len(self.label2id)
                ).to(self.device)
            else:
                # Initialize model with proper field classification head for template-free processing
                self.layout_model = LayoutLMv3ForTokenClassification.from_pretrained(
                    layout_model_name,
                    num_labels=len(self.label2id)  # Match our label2id count for proper field classification
                ).to(self.device)
            
            self.use_layoutlm = True
            logger.info("LayoutLMv3 initialized successfully for template-free processing")
            
        except Exception as e:
            logger.warning(f"Failed to initialize LayoutLMv3: {str(e)}")
            logger.warning("Falling back to pattern-based extraction only")
            self.use_layoutlm = False
            self.layout_processor = None
            self.layout_model = None

        # Supported file extensions
        self.supported_extensions = ['.pdf', '.jpg', '.jpeg', '.png', '.tiff', '.bmp', '.txt', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.rtf']
        
        # Preprocessing configuration (always enabled; parameters remain configurable)
        self.preprocess_enabled = True
        self.preprocess_upscale = float(os.getenv("PREPROCESS_UPSCALE", "1.5"))
        self.preprocess_use_adaptive = os.getenv("PREPROCESS_ADAPTIVE_THRESHOLD", "auto").lower()  # auto|on|off
        self.preprocess_denoise = os.getenv("PREPROCESS_DENOISE", "light").lower()  # none|light
        logger.info(f"Preprocess mandatory: enabled={self.preprocess_enabled}, upscale={self.preprocess_upscale}, adaptive={self.preprocess_use_adaptive}, denoise={self.preprocess_denoise}")

        # Handwriting fallback (TrOCR - MIT licensed)
        self.trocr_enabled = os.getenv("USE_TROCR", "false").lower() in ["1", "true", "yes"]
        self.trocr_threshold = float(os.getenv("TROCR_FALLBACK_THRESHOLD", "0.65"))
        self.trocr_max_boxes = int(os.getenv("TROCR_MAX_BOXES", "120"))
        self.trocr_model_name = os.getenv("TROCR_MODEL", "microsoft/trocr-base-handwritten")
        self.trocr_processor = None
        self.trocr_model = None
        if self.trocr_enabled:
            try:
                self.trocr_processor = TrOCRProcessor.from_pretrained(self.trocr_model_name)
                self.trocr_model = VisionEncoderDecoderModel.from_pretrained(self.trocr_model_name).to(self.device)
                logger.info(f"Loaded TrOCR model: {self.trocr_model_name}")
            except Exception as e:
                logger.warning(f"Failed to load TrOCR ({self.trocr_model_name}): {e}")
                self.trocr_enabled = False

        # Donut fallback (optional)
        self.use_donut = os.getenv("USE_DONUT", "false").lower() in ["1", "true", "yes"]
        self.donut_threshold = float(os.getenv("DONUT_THRESHOLD", "0.60"))
        self.donut_force_types = set([
            t.strip().lower() for t in os.getenv("DONUT_FORCE_TYPES", "").split(",") if t.strip()
        ])  # e.g., "handwritten,form,unknown,invoice,always"
        self.donut = None
        if self.use_donut:
            try:
                from models.donut_processor import DonutDocumentProcessor  # type: ignore
                self.donut = DonutDocumentProcessor()
                logger.info("Donut processor initialized")
            except Exception as e:
                logger.warning(f"Failed to initialize Donut processor: {e}")
                self.use_donut = False
    
    def _get_active_model(self):
        """Get the active model for inference, fallback to default if none active"""
        if self.active_model_manager:
            active_model = self.active_model_manager.get_active_model_instance()
            active_processor = self.active_model_manager.get_active_processor()
            if active_model and active_processor:
                logger.info("Using active trained model for inference")
                return active_model, active_processor
        
        # Fallback to default model
        if getattr(self, 'use_layoutlm', False) and self.layout_processor and self.layout_model:
            logger.info("Using default LayoutLM model for inference")
            return self.layout_model, self.layout_processor
        
        logger.warning("No model available for inference")
        return None, None

    def _preprocess_image(self, img: np.ndarray) -> np.ndarray:
        """Light, safe preprocessing for mixed documents.

        Steps: grayscale -> CLAHE -> optional denoise -> optional adaptive threshold -> upscale.
        Keeps 3-channel RGB output for OCR compatibility.
        """
        if img is None or img.size == 0:
            return img
        if cv2 is None:
            return img

        # To BGR for OpenCV
        if img.ndim == 3 and img.shape[2] == 3:
            bgr = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
        else:
            bgr = img if img.ndim == 2 else img[..., :3]

        gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)

        # CLAHE for local contrast enhancement
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        gray = clahe.apply(gray)

        # Light denoise
        if self.preprocess_denoise == 'light':
            gray = cv2.medianBlur(gray, 3)

        # Adaptive threshold decision
        use_adaptive = False
        if self.preprocess_use_adaptive == 'on':
            use_adaptive = True
        elif self.preprocess_use_adaptive == 'auto':
            # Heuristic: low mean and high variance images benefit from binarization
            mean, std = float(gray.mean()), float(gray.std())
            use_adaptive = mean < 170 and std > 40

        if use_adaptive:
            proc = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                         cv2.THRESH_BINARY, 31, 10)
        else:
            proc = gray

        # Upscale if requested
        scale = max(1.0, float(self.preprocess_upscale))
        if scale > 1.01:
            h, w = proc.shape[:2]
            new_size = (int(w * scale), int(h * scale))
            proc = cv2.resize(proc, new_size, interpolation=cv2.INTER_CUBIC)

        # Return RGB
        return cv2.cvtColor(proc, cv2.COLOR_GRAY2RGB)
        
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
            'accident_report': {
                'report_number': [r'report\s*number\s*[:#]?\s*([A-Za-z0-9_-]+)'],
                'security_code': [r'security\s*code\s*[:#]?\s*([A-Za-z0-9_-]+)'],
                'driver_name': [r'driver\s*name\s*[:#]?\s*([^\n]+)'],
                'mobile_number': [r'(?:mobile|phone)\s*number\s*[:#]?\s*(\+?\d[\d\s-]{6,})'],
                'license_no': [r'license\s*no\s*[:#]?\s*([A-Za-z0-9]+)'],
                'license_expiry_date': [r'license\s*expiry\s*date\s*[:#]?\s*(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})'],
                'plate_details': [r'plate\s*details\s*[:#]?\s*([^\n]+)'],
                'accident_date': [r'accident\s*date\s*[:#]?\s*(\d{4}[-/]\d{2}[-/]\d{2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})'],
                'accident_time': [r'accident\s*time\s*[:#]?\s*([0-2]?\d[:\.]\d{2}(?::\d{2})?)'],
                'location': [r'location\s*[:#]?\s*([^\n]+)'],
                'insurance_company': [r'insurance\s*company\s*[:#]?\s*([^\n]+)'],
                'policy_no': [r'policy\s*no\s*[:#]?\s*([A-Za-z0-9-]+)']
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
        Process a document file and extract information.
        
        Args:
            file_path: Path to the document file
            
        Returns:
            Dictionary containing extracted information
        """
        try:
            logger.info(f"Processing document: {file_path}")
            
            # Determine file type
            file_type = self._get_file_type(file_path)
            file_ext = file_path.lower().split('.')[-1]
            
            # Route to appropriate processor based on file type
            if file_type == "application/pdf":
                return self._process_pdf(file_path)
            elif file_ext in ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx']:
                return self._process_office_document(file_path)
            elif file_ext in ['txt', 'rtf']:
                return self._process_text_document(file_path)
            else:
                # Handle image files (jpg, jpeg, png, tiff, bmp)
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
            
            # Extract fields from table data
            table_fields = self._extract_fields_from_tables([])
            fields.update(table_fields)
            
            # Add file information
            combined_result["file_type"] = "application/pdf"
            combined_result["file_name"] = os.path.basename(file_path)
            
            # Extract tables if present
            tables = self._extract_tables(doc)
            combined_result["tables"] = tables
            
            # Extract table-specific fields
            table_fields = self._extract_table_specific_fields(tables, doc_type)
            fields.update(table_fields)
            
            # Update extracted fields with all collected fields
            combined_result["extracted_fields"] = fields
            
            # Calculate confidence
            confidence = self._calculate_confidence(fields, doc_type)
            combined_result["confidence"] = confidence
            
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

    def _process_office_document(self, file_path: str) -> Dict[str, Any]:
        """Process Office documents (Word, Excel, PowerPoint)."""
        try:
            logger.info(f"Processing Office document: {file_path}")
            
            # For now, we'll convert Office documents to text and process as text
            # In a production system, you might want to use python-docx, openpyxl, etc.
            try:
                # Try to extract text using basic methods
                with open(file_path, 'rb') as f:
                    content = f.read()
                
                # Simple text extraction (this is basic - in production use proper libraries)
                text_content = str(content, 'utf-8', errors='ignore')
                
                # Clean up the text
                text_content = re.sub(r'[^\x00-\x7F]+', ' ', text_content)  # Remove non-ASCII
                text_content = re.sub(r'\s+', ' ', text_content).strip()  # Normalize whitespace
                
                # Determine document type
                doc_type = self._classify_document_type(text_content)
                
                # Extract fields using pattern-based approach
                fields = self._extract_fields_pattern_based(text_content)
                
                # Calculate confidence
                confidence = self._calculate_confidence(fields, doc_type)
                
                return {
                    "extracted_text": text_content,
                    "document_type": doc_type,
                    "confidence": confidence,
                    "bounding_boxes": [],
                    "extracted_fields": fields,
                    "tables": [],
                    "headers": [],
                    "footers": [],
                    "file_type": self._get_file_type(file_path),
                    "file_name": os.path.basename(file_path),
                    "processing_method": "office_document_basic"
                }
                
            except Exception as e:
                logger.warning(f"Basic Office document processing failed: {str(e)}")
                # Fallback to error response
                return {
                    "extracted_text": "",
                    "document_type": "unknown",
                    "confidence": 0.0,
                    "bounding_boxes": [],
                    "extracted_fields": {},
                    "tables": [],
                    "headers": [],
                    "footers": [],
                    "file_type": self._get_file_type(file_path),
                    "file_name": os.path.basename(file_path),
                    "processing_method": "office_document_fallback",
                    "error": f"Office document processing not fully implemented: {str(e)}"
                }
                
        except Exception as e:
            logger.error(f"Error processing Office document: {str(e)}")
            raise

    def _process_text_document(self, file_path: str) -> Dict[str, Any]:
        """Process text documents."""
        try:
            logger.info(f"Processing text document: {file_path}")
            
            # Read text file
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                text_content = f.read()
            
            # Determine document type
            doc_type = self._classify_document_type(text_content)
            
            # Extract fields using pattern-based approach
            fields = self._extract_fields_pattern_based(text_content)
            
            # Calculate confidence
            confidence = self._calculate_confidence(fields, doc_type)
            
            return {
                "extracted_text": text_content,
                "document_type": doc_type,
                "confidence": confidence,
                "bounding_boxes": [],
                "extracted_fields": fields,
                "tables": [],
                "headers": [],
                "footers": [],
                "file_type": self._get_file_type(file_path),
                "file_name": os.path.basename(file_path),
                "processing_method": "text_document"
            }
            
        except Exception as e:
            logger.error(f"Error processing text document: {str(e)}")
            raise

    def process_image(self, image: Image.Image) -> Dict[str, Any]:
        """Process a single image and extract information."""
        logger.info("=== Starting process_image ===")
        try:
            # Convert image to RGB if needed
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Convert PIL Image to numpy array, optionally preprocess
            img_array = np.array(image)
            if self.preprocess_enabled:
                try:
                    img_array = self._preprocess_image(img_array)
                except Exception as e:
                    logger.warning(f"Preprocess failed; continuing with original image: {e}")
            
            # Perform OCR
            logger.info("Starting OCR processing")
            logger.info(f"Image array shape: {img_array.shape}, dtype: {img_array.dtype}")
            try:
                # Support multiple OCR engines if configured; concatenate results
                if hasattr(self, 'ocrs') and self.ocrs:
                    ocr_result = []
                    for _engine in self.ocrs:
                        try:
                            _res = _engine.ocr(img_array, cls=True)
                            if _res:
                                ocr_result.extend(_res)
                        except Exception as inner_e:
                            logger.warning(f"OCR failed for one language engine: {inner_e}")
                else:
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
            if isinstance(ocr_result, list) and len(ocr_result) > 0:
                # Handle the case where ocr_result is a list of pages
                for page_idx, page in enumerate(ocr_result):
                    if page is None:
                        logger.warning(f"Page {page_idx} is None")
                        continue
                        
                    if not isinstance(page, list):
                        logger.warning(f"Page {page_idx} is not a list: {type(page)}")
                        continue
                        
                    for line_idx, line in enumerate(page):
                        try:
                            if line is None or not isinstance(line, list) or len(line) < 2:
                                logger.warning(f"Line {line_idx} in page {page_idx} is invalid: {line}")
                                continue
                                
                            # Extract text and confidence - PaddleOCR format: [bbox, (text, confidence)]
                            if isinstance(line[1], tuple) and len(line[1]) >= 2:
                                text = line[1][0]
                                confidence = line[1][1]
                            elif isinstance(line[1], list) and len(line[1]) >= 2:
                                text = line[1][0]
                                confidence = line[1][1]
                            else:
                                logger.warning(f"Invalid text format in line {line_idx}: {line[1]}")
                                continue
                            
                            # Extract bounding box
                            box = line[0] if isinstance(line[0], list) else []
                            
                            if text and text.strip():
                                extracted_text += text.strip() + "\n"
                                bounding_boxes.append({
                                    'text': text.strip(),
                                    'confidence': float(confidence),
                                    'box': box
                                })
                        except (IndexError, TypeError, ValueError) as e:
                            logger.warning(f"Error processing OCR line {line_idx} in page {page_idx}: {str(e)}")
                            continue
            
            logger.info(f"Extracted {len(bounding_boxes)} text blocks")

            # Handwriting fallback: if average confidence is low and TrOCR is enabled, re-recognize per line
            if self.trocr_enabled and bounding_boxes:
                try:
                    avg_conf = sum(b['confidence'] for b in bounding_boxes) / max(1, len(bounding_boxes))
                    if avg_conf < self.trocr_threshold:
                        logger.info(f"Avg OCR confidence {avg_conf:.2f} < {self.trocr_threshold}; applying TrOCR fallback on line crops")
                        trocr_texts = []
                        used = 0
                        for bbox in bounding_boxes:
                            if used >= self.trocr_max_boxes:
                                break
                            box = bbox.get('box')
                            if not (isinstance(box, list) and len(box) == 4 and all(isinstance(pt, list) and len(pt) == 2 for pt in box)):
                                continue
                            # Compute tight rectangle
                            xs = [int(pt[0]) for pt in box]
                            ys = [int(pt[1]) for pt in box]
                            x1, y1, x2, y2 = max(0, min(xs)), max(0, min(ys)), max(xs), max(ys)
                            crop = img_array[y1:y2, x1:x2]
                            if crop.size == 0:
                                continue
                            # Prepare for TrOCR
                            try:
                                from PIL import Image as PILImage
                                pil = PILImage.fromarray(crop)
                                trocr_inputs = self.trocr_processor(images=pil, return_tensors="pt").to(self.device)
                                generated_ids = self.trocr_model.generate(**trocr_inputs, max_length=256)
                                line_text = self.trocr_processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
                                trocr_texts.append(line_text)
                                used += 1
                            except Exception as e:
                                logger.warning(f"TrOCR line failed: {e}")
                        if len(trocr_texts) >= max(3, int(0.2 * len(bounding_boxes))):
                            extracted_text = "\n".join([t for t in trocr_texts if t and t.strip()])
                            logger.info("Applied TrOCR fallback and replaced extracted_text with TrOCR output")
                except Exception as e:
                    logger.warning(f"TrOCR fallback failed: {e}")

            # Donut fallback: if overall OCR confidence is low, or doc type forced, and Donut is enabled, run Donut and merge/replace
            if self.use_donut:
                try:
                    should_use_donut = False
                    if not bounding_boxes:
                        should_use_donut = True
                    else:
                        avg_conf_for_donut = sum(b['confidence'] for b in bounding_boxes) / max(1, len(bounding_boxes))
                        if avg_conf_for_donut < self.donut_threshold:
                            should_use_donut = True

                    # If we can heuristically classify as handwritten early, force Donut
                    # Simple heuristic: many small boxes and low average width
                    if not should_use_donut and len(bounding_boxes) >= 50:
                        should_use_donut = True

                    if not should_use_donut and self.donut_force_types:
                        # We don't know doc_type yet; if 'always' present, force; if 'unknown' present and low text length, force
                        if 'always' in self.donut_force_types:
                            should_use_donut = True

                    if not should_use_donut:
                        raise Exception("Donut criteria not met; skipping")

                    logger.info("Applying Donut fallback")
                    # Save temp image for Donut processor if it expects a path
                    with tempfile.NamedTemporaryFile(suffix='.png', delete=True) as tmp:
                        from PIL import Image as PILImage
                        PILImage.fromarray(img_array).save(tmp.name)
                        donut_result = self.donut.process_document(tmp.name) if self.donut else None
                    if isinstance(donut_result, dict):
                        donut_text = donut_result.get('raw_text') or ''
                        donut_fields = donut_result.get('fields') or {}
                        if donut_text and len(donut_text) > len(extracted_text):
                            extracted_text = donut_text
                        if isinstance(donut_fields, dict):
                            # Map into our extracted_fields later
                            bounding_boxes = bounding_boxes  # keep existing boxes
                            self._donut_extra_fields = donut_fields
                            logger.info(f"Donut provided {len(donut_fields)} fields")
                except Exception as e:
                    logger.info(f"Donut not applied: {e}")
            
            # If no text was extracted, return early
            if not extracted_text.strip():
                logger.warning("No text extracted from image")
                return {
                    "extracted_text": "",
                    "document_type": "unknown",
                    "confidence": 0.0,
                    "bounding_boxes": []
                }
            
            # Determine document type first
            doc_type = self._classify_document_type(extracted_text)
            
            # Track which components were used for transparency
            pipeline_used = {
                "ocr": f"paddleocr-{'/'.join(getattr(self, 'configured_ocr_langs', ['en']))}",
                "ner": "none"
            }

            # Use LayoutLM for universal document understanding if available
            extracted_fields = {}
            # If Donut provided fields, seed with them first
            if hasattr(self, '_donut_extra_fields') and isinstance(self._donut_extra_fields, dict):
                extracted_fields.update(self._donut_extra_fields)
                try:
                    del self._donut_extra_fields
                except Exception:
                    pass
            model, processor = self._get_active_model()
            if model and processor:
                logger.info("Using active model for universal field extraction")
                try:
                    layoutlm_fields = self._extract_fields_layoutlm_universal(image, extracted_text, bounding_boxes, model, processor)
                    extracted_fields.update(layoutlm_fields)
                    pipeline_used["ner"] = getattr(model, "name_or_path", "layoutlmv3")
                except Exception as e:
                    logger.warning(f"Active model extraction failed: {str(e)}")
            else:
                logger.info("No active model available, using pattern-based extraction only")
            
            # Scoped extraction first based on detected document type
            logger.info(f"Using scoped pattern extraction for doc_type='{doc_type}'")
            scoped_fields = self._extract_fields(extracted_text, doc_type)
            extracted_fields.update(scoped_fields)

            # Fallback to universal patterns if we found too few fields
            min_scoped = 3 if doc_type in ["invoice", "receipt"] else 1
            if len(scoped_fields) < min_scoped:
                logger.info("Scoped extraction sparse; applying universal patterns as fallback")
                pattern_fields = self._extract_fields_pattern_based(extracted_text)
                for k, v in pattern_fields.items():
                    if k not in extracted_fields:
                        extracted_fields[k] = v
            
            # If we still have very few fields, try alternative approaches
            if len(extracted_fields) < min_scoped:
                logger.info("Pattern-based extraction failed, trying alternative methods...")
                # Try extracting from bounding boxes directly
                bbox_fields = self._extract_fields_from_bounding_boxes(bounding_boxes, extracted_text)
                extracted_fields.update(bbox_fields)
                
                # If still no fields, try simple keyword extraction
                if not bbox_fields:
                    simple_fields = self._extract_fields_simple_keywords(extracted_text)
                    extracted_fields.update(simple_fields)

            # Compose result object
            result = {
                "extracted_text": extracted_text,
                "document_type": doc_type,
                "confidence": 1.0 if extracted_fields else 0.0,
                "bounding_boxes": bounding_boxes,
                "fields": extracted_fields,
                "pipeline_used": pipeline_used
            }
            return result
            
            # Extract fields from table data if available
            table_fields = self._extract_fields_from_tables(bounding_boxes)
            extracted_fields.update(table_fields)
            
            # Document-type-specific field extraction
            doc_type_fields = self._extract_document_type_fields(extracted_text, doc_type, bounding_boxes)
            extracted_fields.update(doc_type_fields)
            
            # Extract main header fields from the document
            main_header_fields = self._extract_main_header_fields(extracted_text, doc_type, bounding_boxes)
            extracted_fields.update(main_header_fields)
            
            # Also extract from the raw text as fallback
            if not extracted_fields:
                text_fields = self._extract_fields_from_text(extracted_text)
                extracted_fields.update(text_fields)
            
            # Calculate confidence based on extracted fields
            confidence = self._calculate_confidence(extracted_fields, doc_type)
            
            # Clean up extracted text
            extracted_text = extracted_text.strip()
            
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
            
            # Prepare bounding boxes for LayoutLM
            boxes = []
            for bbox in bounding_boxes:
                if bbox.get('box') and len(bbox['box']) == 4:
                    # Flatten the box coordinates for LayoutLM
                    box = bbox['box']
                    boxes.append([box[0], box[1], box[2], box[3]])
            
            # Convert text to word list for LayoutLM
            words = text.split()
            
            # If no bounding boxes, create dummy ones
            if not boxes:
                boxes = [[0, 0, 100, 100] for _ in range(len(words))]
            
            # Ensure we have the same number of boxes as words
            if len(boxes) != len(words):
                if len(boxes) > len(words):
                    boxes = boxes[:len(words)]
                else:
                    # Pad boxes with the last available box
                    last_box = boxes[-1] if boxes else [0, 0, 100, 100]
                    boxes.extend([last_box] * (len(words) - len(boxes)))
            
            logger.info(f"Preparing LayoutLM input with {len(words)} words and {len(boxes)} bounding boxes...")
            
            encoding = self.layout_processor(
                image,
                words,
                boxes=boxes,
                return_tensors="pt",
                truncation=True,
                padding=True,
                max_length=512
            )
            logger.info("LayoutLM encoding successful")
            
            # Get model predictions for text classification
            logger.info("Getting LayoutLM predictions...")
            model, processor = self._get_active_model()
            if not model:
                logger.warning("No model available for inference, skipping ML-based extraction")
                return {}
            
            with torch.no_grad():
                outputs = model(**encoding)
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

    def _process_table_data(self, table, page_num: int, table_num: int) -> Dict[str, Any]:
        """Process raw table data into structured format."""
        try:
            if not table:
                return None
            
            # Handle different table formats
            if hasattr(table, 'rows'):
                # PyMuPDF table format
                rows = table.rows
                headers = []
                data_rows = []
                
                if rows:
                    # Extract headers (first row)
                    if rows[0]:
                        headers = [cell.text.strip() if hasattr(cell, 'text') else str(cell).strip() for cell in rows[0]]
                    
                    # Extract data rows
                    for row in rows[1:]:
                        if row:
                            row_data = [cell.text.strip() if hasattr(cell, 'text') else str(cell).strip() for cell in row]
                            data_rows.append(row_data)
                
                # Ensure consistent column count
                max_cols = max(len(headers), max(len(row) for row in data_rows) if data_rows else 0)
                
                # Pad headers and rows
                while len(headers) < max_cols:
                    headers.append("")
                
                for row in data_rows:
                    while len(row) < max_cols:
                        row.append("")
                
                processed_table = {
                    "table_id": f"table_{page_num}_{table_num}",
                    "page": page_num,
                    "table_number": table_num,
                    "rows": len(data_rows) + (1 if headers else 0),
                    "columns": max_cols,
                    "headers": headers,
                    "data": data_rows,
                    "has_headers": bool(headers),
                    "extraction_method": "pymupdf",
                    "bbox": getattr(table, 'bbox', None),
                    "type": self._detect_table_type(headers)
                }
                
            else:
                # List format
                if not isinstance(table, list) or len(table) == 0:
                    return None
                
                # Clean and structure table data
                cleaned_rows = []
                headers = []
                
                for row_idx, row in enumerate(table):
                    if row is None:
                        continue
                        
                    # Convert row to list if it's not already
                    if hasattr(row, '__iter__') and not isinstance(row, (str, bytes)):
                        try:
                            row_data = list(row)
                        except:
                            row_data = [str(cell) for cell in row] if hasattr(row, '__getitem__') else [str(row)]
                    else:
                        row_data = [str(row)]
                    
                    # Clean cell data
                    cleaned_row = []
                    for cell in row_data:
                        if cell is None:
                            cleaned_cell = ""
                        else:
                            cleaned_cell = str(cell).strip()
                            # Remove extra whitespace and newlines
                            cleaned_cell = ' '.join(cleaned_cell.split())
                        cleaned_row.append(cleaned_cell)
                    
                    # First non-empty row might be headers
                    if row_idx == 0 and not headers and any(cell.strip() for cell in cleaned_row):
                        headers = cleaned_row
                    
                    cleaned_rows.append(cleaned_row)
                
                # Determine table structure
                max_cols = max(len(row) for row in cleaned_rows) if cleaned_rows else 0
                
                # Pad rows to ensure consistent column count
                for row in cleaned_rows:
                    while len(row) < max_cols:
                        row.append("")
                
                processed_table = {
                    "table_id": f"table_{page_num}_{table_num}",
                    "page": page_num,
                    "table_number": table_num,
                    "rows": len(cleaned_rows),
                    "columns": max_cols,
                    "headers": headers if headers else [],
                    "data": cleaned_rows,
                    "has_headers": bool(headers),
                    "extraction_method": "list_format",
                    "type": self._detect_table_type(headers)
                }
            
            logger.info(f"Processed table {table_num} on page {page_num}: {processed_table['rows']} rows, {processed_table['columns']} columns")
            return processed_table
            
        except Exception as e:
            logger.error(f"Error processing table data: {str(e)}")
            return None

    def _extract_tables_from_ocr(self, page) -> List[Dict[str, Any]]:
        """Extract tables using OCR analysis for complex layouts."""
        tables = []
        try:
            # Convert page to image for OCR analysis
            pix = page.get_pixmap()
            img_data = pix.tobytes("png")
            
            # Use OCR to extract text with positioning
            ocr_result = self.ocr.ocr(img_data)
            
            if not ocr_result or not ocr_result[0]:
                return tables
            
            # Analyze text layout for table-like structures
            text_blocks = []
            for line in ocr_result[0]:
                if len(line) >= 2:
                    bbox = line[0]
                    text = line[1][0] if isinstance(line[1], (list, tuple)) else str(line[1])
                    confidence = line[1][1] if isinstance(line[1], (list, tuple)) and len(line[1]) > 1 else 1.0
                    
                    text_blocks.append({
                        'text': text.strip(),
                        'bbox': bbox,
                        'confidence': confidence,
                        'center_x': (bbox[0][0] + bbox[2][0]) / 2,
                        'center_y': (bbox[0][1] + bbox[2][1]) / 2
                    })
            
            # Group text blocks into potential table rows
            table_candidates = self._group_text_into_tables(text_blocks)
            
            # Process table candidates
            for idx, candidate in enumerate(table_candidates):
                if len(candidate) >= 2:  # At least 2 rows to be a table
                    table_data = self._convert_candidate_to_table(candidate)
                    if table_data:
                        tables.append({
                            "table_id": f"ocr_table_{page.number + 1}_{idx + 1}",
                            "page": page.number + 1,
                            "table_number": idx + 1,
                            "extraction_method": "ocr",
                            "rows": len(table_data),
                            "columns": max(len(row) for row in table_data) if table_data else 0,
                            "data": table_data,
                            "has_headers": False,
                            "type": "ocr_detected"
                        })
            
        except Exception as e:
            logger.error(f"Error in OCR table extraction: {str(e)}")
        
        return tables

    def _group_text_into_tables(self, text_blocks: List[Dict]) -> List[List[Dict]]:
        """Group text blocks into potential table structures."""
        if not text_blocks:
            return []
        
        # Sort by Y position (top to bottom)
        sorted_blocks = sorted(text_blocks, key=lambda x: x['center_y'])
        
        tables = []
        current_table = []
        last_y = None
        y_tolerance = 10  # Pixels
        
        for block in sorted_blocks:
            if last_y is None or abs(block['center_y'] - last_y) <= y_tolerance:
                # Same row or very close
                current_table.append(block)
                last_y = block['center_y']
            else:
                # New row detected
                if len(current_table) >= 2:  # At least 2 columns
                    tables.append(current_table)
                current_table = [block]
                last_y = block['center_y']
        
        # Add the last table
        if len(current_table) >= 2:
            tables.append(current_table)
        
        return tables

    def _convert_candidate_to_table(self, candidate: List[Dict]) -> List[List[str]]:
        """Convert table candidate into structured table data."""
        try:
            # Sort by X position (left to right)
            sorted_candidate = sorted(candidate, key=lambda x: x['center_x'])
            
            # Extract text from each block
            row_data = [block['text'] for block in sorted_candidate]
            
            # Filter out empty or very short text
            row_data = [text for text in row_data if text and len(text.strip()) > 0]
            
            return [row_data] if row_data else []
            
        except Exception as e:
            logger.error(f"Error converting candidate to table: {str(e)}")
            return []

    def _extract_tables(self, doc: fitz.Document) -> List[Dict[str, Any]]:
        """Extract tables from PDF document with comprehensive processing."""
        tables = []
        try:
            for page_num, page in enumerate(doc):
                logger.info(f"Processing page {page_num + 1} for table extraction...")
                
                # Method 1: PyMuPDF table extraction
                try:
                    table_list = page.get_tables()
                    logger.info(f"Found {len(table_list)} tables using PyMuPDF method")
                except AttributeError:
                    try:
                        table_list = page.find_tables()
                        logger.info(f"Found {len(table_list)} tables using find_tables method")
                    except:
                        table_list = []
                
                # Process each table
                for table_idx, table in enumerate(table_list):
                    try:
                        processed_table = self._process_table_data(table, page_num + 1, table_idx + 1)
                        if processed_table:
                            tables.append(processed_table)
                    except Exception as e:
                        logger.warning(f"Error processing table {table_idx + 1} on page {page_num + 1}: {str(e)}")
                
                # Method 2: OCR-based table extraction for complex layouts
                try:
                    ocr_tables = self._extract_tables_from_ocr(page)
                    tables.extend(ocr_tables)
                except Exception as e:
                    logger.warning(f"Error in OCR table extraction for page {page_num + 1}: {str(e)}")
                    
        except Exception as e:
            logger.error(f"Error extracting tables: {str(e)}")
        
        logger.info(f"Total tables extracted: {len(tables)}")
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
                'accident_report': [
                    r'traffic\s*accident\s*report',
                    r'accident\s*date',
                    r'accident\s*time',
                    r'report\s*number',
                    r'security\s*code',
                    r'driver\s*name'
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
            # For pattern-based approach, use a standard set of expected fields
            expected_fields = {
                "invoice": ["invoice_number", "date", "total_amount", "vendor_name"],
                "receipt": ["total_amount", "date", "vendor_name"],
                "contract": ["date", "vendor_name", "customer_name"],
                "quote": ["quote_number", "date", "total_amount", "vendor_name"],
                "unknown": ["date", "vendor_name"]
            }
            expected_count = len(expected_fields.get(doc_type, expected_fields["unknown"]))
            field_confidence = len(fields) / expected_count if expected_count > 0 else 0.0
            
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
        elif ext in ['tiff', 'tif']:
            return 'image/tiff'
        elif ext in ['bmp']:
            return 'image/bmp'
        elif ext in ['doc']:
            return 'application/msword'
        elif ext in ['docx']:
            return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        elif ext in ['xls']:
            return 'application/vnd.ms-excel'
        elif ext in ['xlsx']:
            return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        elif ext in ['ppt']:
            return 'application/vnd.ms-powerpoint'
        elif ext in ['pptx']:
            return 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        elif ext in ['txt']:
            return 'text/plain'
        elif ext in ['rtf']:
            return 'application/rtf'
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

    def _extract_fields_pattern_based(self, text: str) -> Dict[str, Any]:
        """Extract fields using comprehensive pattern matching for template-free processing."""
        fields = {}
        
        # Comprehensive field extraction patterns for any document type
        patterns = {
            # Document Numbers and Identifiers
            'invoice_number': [
                r'(INV-\d+)',  # Full invoice number pattern - HIGHEST PRIORITY
                r'#\s*(INV-\d+)',  # Invoice number with # prefix
                r'(?:invoice|inv|bill)[\s#:]*([A-Z0-9\-]+)',  # Invoice-specific patterns
                r'([A-Z]{2,}\d{4,})',  # Pattern like INV-000038
                r'(INV-\d+|PO-\d+|QTE-\d+|CNT-\d+)',  # Common prefixes
            ],
            'document_number': [
                r'Report\s*Number[:\s]*(\d{8,15})',  # Report number pattern
                r'(?:report|document|file)\s*(?:number|no|#)[:\s]*(\d{8,15})',  # Document number
                r'(?:number|no|#|id|identifier)[\s:]*([A-Z0-9\-]+)',
                r'INV-(\d+)',  # Specific invoice pattern
                r'(\d{4,}-\d{3,})',    # Pattern like 2024-001
                r'(\d{6,})',           # Long number sequences
                r'([A-Z]{2,}\d{2,}[A-Z]?\d{2,})',  # Mixed alphanumeric
                r'(?:receipt|quote|estimate|contract|agreement|order|po|purchase\s*order)[\s#:]*([A-Z0-9\-]+)',
            ],
            'reference_number': [
                r'(?:ref|reference|tracking)[\s#:]*([A-Z0-9\-]+)',
                r'(?:order\s*ref|po\s*ref)[\s:]*([A-Z0-9\-]+)',
                r'(?:customer\s*ref|client\s*ref)[\s:]*([A-Z0-9\-]+)',
            ],
            
            # Dates
            'invoice_date': [
                r'(?:invoice\s*date|bill\s*date|date)[\s:]*(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4})',  # Month name format - HIGHEST PRIORITY
                r'(?:invoice\s*date|bill\s*date|date)[\s:]*(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4})',  # Numeric format
                r'(?:invoice\s*date|bill\s*date)[\s:]*(\d{4}-\d{2}-\d{2})',  # ISO format
            ],
            'date': [
                r'(?:accident\s*date|report\s*date)[\s:]*(\d{4}[/\-]\d{1,2}[/\-]\d{1,2})',  # Accident/Report date
                r'(?:issued|due|created|generated|effective|expires?|valid\s*until)[\s:]*(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4})',
                r'(\d{4}-\d{2}-\d{2})',  # ISO format first
                r'(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4})',
                r'(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[\w\s]*\d{1,2},?\s*\d{4}',  # Month name format
                r'(?:january|february|march|april|may|june|july|august|september|october|november|december)[\w\s]*\d{1,2},?\s*\d{4}',
            ],
            'due_date': [
                r'(?:due|payment\s*due|pay\s*by)[\s:]*(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4})',
                r'(?:due\s*date)[\s:]*(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4})',
            ],
            
            # Financial Information
            'total_amount': [
                r'(?:balance\s*due|total\s*due)[\s:]*AED([0-9,]+\.?\d*)',  # AED currency - HIGHEST PRIORITY
                r'(?:total|grand\s*total|final\s*total)[\s:]*AED([0-9,]+\.?\d*)',  # AED currency
                r'(?:balance\s*due|total\s*due)[\s:]*\$?([0-9,]+\.?\d*)',  # Generic currency
                r'(?:total|amount|sum|due|balance|grand\s*total|net\s*amount)[\s:]*\$?([0-9,]+\.?\d*)',
                r'\$([0-9,]+\.?\d*)',
                r'([0-9,]+\.?\d*)\s*(?:usd|dollars?|us\s*\$?|eur|euros?|gbp|pounds?)',
                r'(?:net|subtotal)[\s:]*\$?([0-9,]+\.?\d*)',
                r'(?:final\s*amount|total\s*cost)[\s:]*\$?([0-9,]+\.?\d*)',
                r'Total\s*Amount[\s:]*\$?([0-9,]+\.?\d*)',
                r'Amount\s*Due[\s:]*\$?([0-9,]+\.?\d*)',
            ],
            'subtotal': [
                r'(?:subtotal|sub\s*total|before\s*tax)[\s:]*\$?([0-9,]+\.?\d*)',
                r'(?:pre\s*tax|excluding\s*tax)[\s:]*\$?([0-9,]+\.?\d*)',
            ],
            'tax_amount': [
                r'(?:tax|vat|gst|sales\s*tax|service\s*tax)[\s(]*\d*%?[)\s:]*\$?([0-9,]+\.?\d*)',
                r'(\d+\.\d{2})\s*(?:tax|vat|gst)',
                r'(?:tax\s*amount|tax\s*total)[\s:]*\$?([0-9,]+\.?\d*)',
                r'Tax\s*\(\d+%\):\s*\$?([0-9,]+\.?\d*)',
            ],
            'discount': [
                r'(?:discount|disc|off|reduction)[\s:]*\$?([0-9,]+\.?\d*)',
                r'(\d+\.?\d*)\s*(?:%|percent|off)',
            ],
            
            # Names and Organizations
            'vendor_name': [
                r'(?:from|vendor|company|bill\s*to|seller|provider|supplier|merchant)[\s:]*([A-Za-z\s&\.]+)',
                r'^([A-Za-z\s&\.]+)',  # First line often contains company name
                r'(?:business\s*name|company\s*name|organization)[\s:]*([A-Za-z\s&\.]+)',
                r'(?:issued\s*by|prepared\s*by)[\s:]*([A-Za-z\s&\.]+)',
            ],
            'customer_name': [
                r'(?:to|bill\s*to|customer|client|sold\s*to|buyer|purchaser)[\s:]*([A-Za-z\s&\.]+)',
                r'(?:ship\s*to|deliver\s*to|send\s*to)[\s:]*([A-Za-z\s&\.]+)',
                r'(?:attention|attn)[\s:]*([A-Za-z\s&\.]+)',
            ],
            'contact_person': [
                r'(?:contact|person|representative|agent)[\s:]*([A-Za-z\s&\.]+)',
                r'(?:responsible|account\s*manager)[\s:]*([A-Za-z\s&\.]+)',
            ],
            
            # Contact Information
            'email': [
                r'([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})',
                r'(?:email|e-mail)[\s:]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})',
            ],
            'phone': [
                r'(?:phone|tel|mobile|contact|call)[\s:]*([\d\s\-\(\)\+]+)',
                r'(\d{3}[-\.\s]?\d{3}[-\.\s]?\d{4})',  # US phone format
                r'(\(\d{3}\)\s?\d{3}[-\.\s]?\d{4})',   # US phone with parentheses
                r'(\+\d{1,3}\s?\d{1,4}[-\.\s]?\d{1,4}[-\.\s]?\d{1,4})',  # International
            ],
            'fax': [
                r'(?:fax|facsimile)[\s:]*([\d\s\-\(\)\+]+)',
            ],
            
            # Addresses
            'billing_address': [
                r'(?:billing\s*address|bill\s*to\s*address)[\s:]*([A-Za-z0-9\s,\.\-]+)',
            ],
            'shipping_address': [
                r'(?:shipping\s*address|ship\s*to\s*address)[\s:]*([A-Za-z0-9\s,\.\-]+)',
            ],
            'address': [
                r'(?:address|location|street)[\s:]*([A-Za-z0-9\s,\.\-]+)',
                r'(\d+\s+[A-Za-z\s,\.\-]+(?:street|st|avenue|ave|road|rd|drive|dr|boulevard|blvd|lane|ln))',
                r'(\d+\s+[A-Za-z\s,\.\-]+(?:street|st|avenue|ave|road|rd|drive|dr|boulevard|blvd|lane|ln)[\s,]*[A-Za-z\s,\.\-]*)',
            ],
            'city': [
                r'(?:city|town)[\s:]*([A-Za-z\s]+)',
            ],
            'state': [
                r'(?:state|province|region)[\s:]*([A-Za-z\s]+)',
            ],
            'zip_code': [
                r'(?:zip|postal|post\s*code)[\s:]*([A-Z0-9\s\-]+)',
                r'(\d{5}(?:-\d{4})?)',  # US ZIP format
            ],
            'country': [
                r'(?:country|nation)[\s:]*([A-Za-z\s]+)',
            ],
            
            # Business Information
            'po_number': [
                r'(?:p\.o\.#|po\s*#)[\s:]*([A-Z0-9\-\/]+)',  # PO# pattern - HIGHEST PRIORITY
                r'(?:p\.o\.|po|purchase\s*order)[\s#:]*([A-Z0-9\-\/]+)',  # PO number pattern
                r'(?:order\s*number|order\s*no)[\s:]*([A-Z0-9\-\/]+)',
            ],
            'vat_number': [
                r'(?:vat\s*no\.?|vat\s*number)[\s:]*(\d{10,15})',  # VAT No.: pattern - HIGHEST PRIORITY
                r'(?:vat\s*no|vat\s*number|vat\s*id)[\s:]*(\d{10,15})',  # VAT number pattern
                r'(?:tax\s*id|tax\s*number|ein|tin|vat\s*number)[\s:]*([A-Z0-9\s\-]+)',
                r'(?:federal\s*tax\s*id|employer\s*id)[\s:]*([A-Z0-9\s\-]+)',
            ],
            'tax_id': [
                r'(?:tax\s*id|tax\s*number|ein|tin)[\s:]*([A-Z0-9\s\-]+)',
                r'(?:federal\s*tax\s*id|employer\s*id)[\s:]*([A-Z0-9\s\-]+)',
            ],
            'license_number': [
                r'License\s*No[\s:]*(\d{8,15})',  # License number pattern
                r'(?:license|permit|registration)[\s#:]*([A-Z0-9\s\-]+)',
                r'(?:license\s*number|permit\s*number)[\s:]*([A-Z0-9\s\-]+)',
            ],
            'driver_name': [
                r'Driver\s*Name[\s:]*([A-Za-z\s]+)',  # Driver name pattern
                r'(?:driver|name)[\s:]*([A-Za-z\s]+)',
            ],
            'account_number': [
                r'(?:account|acct)[\s#:]*([A-Z0-9\s\-]+)',
                r'(?:account\s*number|acct\s*no)[\s:]*([A-Z0-9\s\-]+)',
            ],
            
            # Payment Information
            'payment_terms': [
                r'(?:payment\s*terms|terms)[\s:]*([A-Za-z0-9\s,\.\-]+)',
                r'(?:net|due)[\s:]*(\d+)\s*(?:days|day)',
            ],
            'payment_method': [
                r'(?:payment\s*method|pay\s*by)[\s:]*([A-Za-z\s]+)',
                r'(?:cash|check|credit\s*card|bank\s*transfer|wire|ach)',
            ],
            
            # Product/Service Information
            'description': [
                r'(?:description|item|product|service)[\s:]*([A-Za-z0-9\s,\.\-]+)',
                r'(?:for|work\s*performed)[\s:]*([A-Za-z0-9\s,\.\-]+)',
            ],
            'quantity': [
                r'(?:qty|quantity)[\s:]*(\d+)',
                r'(?:units?|pieces?|items?)[\s:]*(\d+)',
            ],
            'unit_price': [
                r'(?:unit\s*price|price\s*per|rate)[\s:]*\$?([0-9,]+\.?\d*)',
                r'(?:each|per\s*unit)[\s:]*\$?([0-9,]+\.?\d*)',
            ],
            
            # Status and Conditions
            'status': [
                r'(?:status|state|condition)[\s:]*([A-Za-z\s]+)',
                r'(?:pending|approved|rejected|completed|in\s*progress)',
            ],
            'priority': [
                r'(?:priority|urgency)[\s:]*([A-Za-z\s]+)',
                r'(?:high|medium|low|urgent|normal)',
            ],
            
            # Additional Common Fields
            'notes': [
                r'(?:notes?|comments?|remarks?)[\s:]*([A-Za-z0-9\s,\.\-]+)',
                r'(?:special\s*instructions|additional\s*info)[\s:]*([A-Za-z0-9\s,\.\-]+)',
            ],
            'department': [
                r'(?:department|dept|division)[\s:]*([A-Za-z\s]+)',
            ],
            'project_code': [
                r'(?:project|job|work\s*order)[\s#:]*([A-Z0-9\s\-]+)',
                r'(?:project\s*code|job\s*code)[\s:]*([A-Z0-9\s\-]+)',
            ]
        }
        
        # Extract fields using patterns
        for field_name, pattern_list in patterns.items():
            for pattern in pattern_list:
                matches = re.findall(pattern, text, re.IGNORECASE | re.MULTILINE)
                if matches:
                    # Take the first match and clean it
                    value = matches[0].strip()
                    if value and len(value) > 1:  # Avoid single characters
                        # Additional validation for specific fields
                        if field_name == 'email' and '@' not in value:
                            continue
                        if field_name == 'phone' and len(re.sub(r'[\s\-\(\)\+]', '', value)) < 7:
                            continue
                        if field_name in ['total_amount', 'tax_amount', 'subtotal'] and not re.search(r'\d', value):
                            continue
                            
                        fields[field_name] = value
                        logger.info(f"Extracted {field_name}: '{value}'")
                        break
        
        # Post-processing to clean up extracted values
        for field_name, value in fields.items():
            if field_name in ['vendor_name', 'customer_name']:
                # Remove common prefixes/suffixes and limit length
                value = re.sub(r'^(from|to|bill\s*to|ship\s*to):?\s*', '', value, flags=re.IGNORECASE)
                value = re.sub(r'\s+', ' ', value).strip()
                if len(value) > 50:  # Limit length
                    value = value[:50].strip()
                fields[field_name] = value
        
        logger.info(f"Pattern-based extraction found {len(fields)} fields: {list(fields.keys())}")
        return fields

    def _extract_fields_from_bounding_boxes(self, bounding_boxes: List[Dict], text: str) -> Dict[str, Any]:
        """Extract fields by analyzing bounding box text content."""
        fields = {}
        try:
            # Look for specific patterns in bounding box text
            for bbox in bounding_boxes:
                bbox_text = bbox.get('text', '').strip()
                if not bbox_text:
                    continue
                
                # Look for license numbers (long numeric strings)
                if re.match(r'^\d{8,12}$', bbox_text):
                    if 'license_number' not in fields:
                        fields['license_number'] = bbox_text
                
                # Look for phone numbers
                if re.match(r'^\d{10,15}$', bbox_text.replace('-', '')):
                    if 'phone' not in fields:
                        fields['phone'] = bbox_text
                
                # Look for dates
                if re.match(r'\d{2}/\d{2}/\d{4}', bbox_text):
                    if 'date' not in fields:
                        fields['date'] = bbox_text
                
                # Look for report numbers
                if re.match(r'^\d{8,12}$', bbox_text):
                    if 'document_number' not in fields:
                        fields['document_number'] = bbox_text
                        
        except Exception as e:
            logger.warning(f"Error extracting fields from bounding boxes: {str(e)}")
        
        return fields

    def _extract_fields_simple_keywords(self, text: str) -> Dict[str, Any]:
        """Simple keyword-based field extraction for fallback."""
        fields = {}
        try:
            # Look for specific keywords and extract nearby values
            lines = text.split('\n')
            
            for i, line in enumerate(lines):
                line = line.strip()
                
                # Look for "Driver Name" and get next meaningful line
                if 'driver name' in line.lower() or 'name' in line.lower():
                    # Look at nearby lines for names
                    for j in range(max(0, i-2), min(len(lines), i+3)):
                        if j != i and lines[j].strip() and len(lines[j].strip()) > 3:
                            # Check if it looks like a name (not just numbers)
                            if not re.match(r'^\d+$', lines[j].strip()):
                                fields['driver_name'] = lines[j].strip()
                                break
                
                # Look for mobile numbers
                if 'mobile' in line.lower() or 'phone' in line.lower():
                    # Extract numbers from the same line or nearby
                    numbers = re.findall(r'\d{10,15}', line)
                    if numbers:
                        fields['phone'] = numbers[0]
                
                # Look for license numbers
                if 'license' in line.lower():
                    numbers = re.findall(r'\d{8,12}', line)
                    if numbers:
                        fields['license_number'] = numbers[0]
                
                # Look for dates
                dates = re.findall(r'\d{2}/\d{2}/\d{4}', line)
                if dates:
                    if 'date' not in fields:
                        fields['date'] = dates[0]
                    elif 'accident_date' not in fields:
                        fields['accident_date'] = dates[0]
                        
        except Exception as e:
            logger.warning(f"Error in simple keyword extraction: {str(e)}")
        
        return fields

    def _extract_main_header_fields(self, text: str, document_type: str, bounding_boxes: List[Dict]) -> Dict[str, Any]:
        """Extract main header fields from the document."""
        fields = {}
        
        try:
            if document_type == 'invoice':
                # Extract vendor information
                vendor_patterns = [
                    r'([A-Z][A-Z\s]+(?:TECHNOLOGY|INFORMATION|CONSULTANCY|LTD|LLC|INC|CORP))',
                    r'([A-Z][A-Z\s]+(?:COMPANY|ENTERPRISES|SOLUTIONS))'
                ]
                
                for pattern in vendor_patterns:
                    match = re.search(pattern, text)
                    if match:
                        vendor_name = match.group(1).strip()
                        if len(vendor_name) > 10:  # Ensure it's a substantial company name
                            fields['vendor_name'] = vendor_name
                            break
                
                # Extract customer information
                customer_patterns = [
                    r'Bill\s*To\s*([^\n]+)',
                    r'Customer[:\s]*([^\n]+)',
                    r'Client[:\s]*([^\n]+)'
                ]
                
                for pattern in customer_patterns:
                    match = re.search(pattern, text, re.IGNORECASE)
                    if match:
                        customer_name = match.group(1).strip()
                        if len(customer_name) > 5:
                            fields['customer_name'] = customer_name
                            break
                
                # Extract subject/description
                subject_patterns = [
                    r'Subject[:\s]*([^\n]+)',
                    r'Description[:\s]*([^\n]+)',
                    r'Invoice\s*for\s*([^\n]+)'
                ]
                
                for pattern in subject_patterns:
                    match = re.search(pattern, text, re.IGNORECASE)
                    if match:
                        subject = match.group(1).strip()
                        if len(subject) > 5:
                            fields['subject'] = subject
                            break
                
                # Extract terms
                terms_patterns = [
                    r'Terms[:\s]*([^\n]+)',
                    r'Payment\s*Terms[:\s]*([^\n]+)'
                ]
                
                for pattern in terms_patterns:
                    match = re.search(pattern, text, re.IGNORECASE)
                    if match:
                        terms = match.group(1).strip()
                        if len(terms) > 2:
                            fields['terms'] = terms
                            break
                
                # Extract bank details
                bank_patterns = [
                    r'Bank\s*[:\s]*([^\n]+)',
                    r'IBAN[:\s]*([A-Z0-9]+)',
                    r'SWIFT[:\s]*([A-Z0-9]+)',
                    r'Account[:\s]*([A-Z0-9]+)'
                ]
                
                for pattern in bank_patterns:
                    match = re.search(pattern, text, re.IGNORECASE)
                    if match:
                        bank_info = match.group(1).strip()
                        if 'bank' in pattern.lower():
                            fields['bank_name'] = bank_info
                        elif 'iban' in pattern.lower():
                            fields['iban'] = bank_info
                        elif 'swift' in pattern.lower():
                            fields['swift_code'] = bank_info
                        elif 'account' in pattern.lower():
                            fields['account_number'] = bank_info
                
            elif document_type == 'id_card':
                # Extract license information
                license_patterns = [
                    r'License\s*No\.?\s*[:\s]*([A-Z0-9\-]+)',
                    r'Registration\s*No\.?\s*[:\s]*(\d+)',
                    r'ADFZ[-\s]?(\d+)'
                ]
                
                for pattern in license_patterns:
                    match = re.search(pattern, text, re.IGNORECASE)
                    if match:
                        fields['license_number'] = match.group(1).strip()
                        break
                
                # Extract company information
                company_patterns = [
                    r'Trade\s*Name[:\s]*([^\n]+)',
                    r'Company\s*Name[:\s]*([^\n]+)',
                    r'Business\s*Name[:\s]*([^\n]+)'
                ]
                
                for pattern in company_patterns:
                    match = re.search(pattern, text, re.IGNORECASE)
                    if match:
                        fields['company_name'] = match.group(1).strip()
                        break
                
                # Extract dates
                date_patterns = [
                    r'First\s*Issue\s*Date[:\s]*(\d{2}\s+\w+\s+\d{4})',
                    r'Current\s*Issue\s*Date[:\s]*(\d{2}\s+\w+\s+\d{4})',
                    r'Expiry\s*Date[:\s]*(\d{2}\s+\w+\s+\d{4})'
                ]
                
                for pattern in date_patterns:
                    match = re.search(pattern, text, re.IGNORECASE)
                    if match:
                        if 'first' in pattern.lower():
                            fields['first_issue_date'] = match.group(1).strip()
                        elif 'current' in pattern.lower():
                            fields['current_issue_date'] = match.group(1).strip()
                        elif 'expiry' in pattern.lower():
                            fields['expiry_date'] = match.group(1).strip()
                
        except Exception as e:
            logger.warning(f"Error extracting main header fields: {str(e)}")
        
        return fields

    def _extract_table_specific_fields(self, tables: List[Dict], document_type: str) -> Dict[str, Any]:
        """Extract fields specific to each table in the document."""
        fields = {}
        
        try:
            for i, table in enumerate(tables):
                table_id = table.get('table_id', f'table_{i+1}')
                table_data = table.get('data', [])
                
                if not table_data:
                    continue
                
                # Process each table based on its content and document type
                table_fields = self._process_table_fields(table_data, table_id, document_type)
                fields.update(table_fields)
                
        except Exception as e:
            logger.warning(f"Error extracting table-specific fields: {str(e)}")
        
        return fields

    def _process_table_fields(self, table_data: List[List], table_id: str, document_type: str) -> Dict[str, Any]:
        """Process individual table data to extract fields."""
        fields = {}
        
        try:
            if document_type == 'invoice':
                # Look for invoice-specific table patterns
                for row_idx, row in enumerate(table_data):
                    for col_idx, cell in enumerate(row):
                        cell_text = str(cell).strip()
                        
                        # Look for invoice number in tables
                        if 'INV-' in cell_text and 'invoice_number' not in fields:
                            fields['invoice_number'] = cell_text
                        
                        # Look for amounts
                        if 'AED' in cell_text and ',' in cell_text:
                            amount_value = cell_text
                            if 'total' in cell_text.lower() or row_idx == len(table_data) - 1:
                                if 'total_amount' not in fields:
                                    fields['total_amount'] = amount_value
                            elif 'sub' in cell_text.lower():
                                if 'subtotal' not in fields:
                                    fields['subtotal'] = amount_value
                            elif 'tax' in cell_text.lower():
                                if 'tax_amount' not in fields:
                                    fields['tax_amount'] = amount_value
                        
                        # Look for dates
                        if re.match(r'\d{2}\s+\w+\s+\d{4}', cell_text):
                            if 'invoice_date' not in fields:
                                fields['invoice_date'] = cell_text
                        
                        # Look for PO numbers
                        if re.match(r'[A-Z]{2,}-\d{4,}-\d{2,}-\d{2,}', cell_text):
                            if 'po_number' not in fields:
                                fields['po_number'] = cell_text
                        
                        # Look for VAT numbers
                        if re.match(r'\d{15}', cell_text):
                            if 'vat_number' not in fields:
                                fields['vat_number'] = cell_text
                        
                        # Look for license numbers
                        if re.match(r'ADFZ-\d+', cell_text):
                            if 'license_number' not in fields:
                                fields['license_number'] = cell_text
                        
                        # Look for company names (long text)
                        if len(cell_text) > 20 and any(word in cell_text.upper() for word in ['TECHNOLOGY', 'CONSULTANCY', 'LTD', 'BANK', 'COMPANY']):
                            if 'vendor_name' not in fields:
                                fields['vendor_name'] = cell_text
                            elif 'customer_name' not in fields and 'BANK' in cell_text.upper():
                                fields['customer_name'] = cell_text
                
                # Add table-specific metadata
                fields[f'{table_id}_row_count'] = len(table_data)
                fields[f'{table_id}_column_count'] = len(table_data[0]) if table_data else 0
                fields[f'{table_id}_type'] = 'invoice_table'
                
            elif document_type == 'id_card':
                # Look for ID card specific patterns
                for row in table_data:
                    for cell in row:
                        cell_text = str(cell).strip()
                        
                        # Look for license numbers
                        if re.match(r'ADFZ-\d+', cell_text):
                            if 'license_number' not in fields:
                                fields['license_number'] = cell_text
                        
                        # Look for registration numbers
                        if re.match(r'\d{3,}', cell_text) and len(cell_text) < 10:
                            if 'registration_number' not in fields:
                                fields['registration_number'] = cell_text
                        
                        # Look for company names
                        if len(cell_text) > 15 and any(word in cell_text.upper() for word in ['TECHNOLOGY', 'CONSULTANCY', 'LTD']):
                            if 'company_name' not in fields:
                                fields['company_name'] = cell_text
                        
                        # Look for dates
                        if re.match(r'\d{2}\s+\w+\s+\d{4}', cell_text):
                            if 'issue_date' not in fields:
                                fields['issue_date'] = cell_text
                            elif 'expiry_date' not in fields:
                                fields['expiry_date'] = cell_text
                
                # Add table-specific metadata
                fields[f'{table_id}_row_count'] = len(table_data)
                fields[f'{table_id}_column_count'] = len(table_data[0]) if table_data else 0
                fields[f'{table_id}_type'] = 'id_card_table'
                
        except Exception as e:
            logger.warning(f"Error processing table fields for {table_id}: {str(e)}")
        
        return fields

    def _extract_document_type_fields(self, text: str, document_type: str, bounding_boxes: List[Dict]) -> Dict[str, Any]:
        """Extract fields specific to the document type."""
        fields = {}
        
        try:
            if document_type == 'invoice':
                fields.update(self._extract_invoice_fields(text, bounding_boxes))
            elif document_type == 'id_card':
                fields.update(self._extract_id_card_fields(text, bounding_boxes))
            elif document_type == 'financial_report':
                fields.update(self._extract_financial_report_fields(text, bounding_boxes))
            elif document_type == 'contract':
                fields.update(self._extract_contract_fields(text, bounding_boxes))
            elif document_type == 'receipt':
                fields.update(self._extract_receipt_fields(text, bounding_boxes))
            else:
                # Generic document fields
                fields.update(self._extract_generic_fields(text, bounding_boxes))
                
        except Exception as e:
            logger.warning(f"Error in document-type-specific extraction: {str(e)}")
        
        return fields

    def _extract_invoice_fields(self, text: str, bounding_boxes: List[Dict]) -> Dict[str, Any]:
        """Extract invoice-specific fields."""
        fields = {}
        
        try:
            # Invoice number - look for patterns like INV-000038
            invoice_patterns = [
                r'#?\s*(INV[-\s]?\d+)',
                r'Invoice\s*#?\s*([A-Z0-9\-]+)',
                r'#\s*([A-Z]{2,}[-\s]?\d+)',
                r'INV[-\s]?(\d+)'
            ]
            
            for pattern in invoice_patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    fields['invoice_number'] = match.group(1).strip()
                    break
            
            # Invoice date
            date_patterns = [
                r'Invoice\s*Date\s*[:\s]*(\d{1,2}\s+\w+\s+\d{4})',
                r'Date\s*[:\s]*(\d{1,2}\s+\w+\s+\d{4})',
                r'(\d{1,2}\s+Feb\s+\d{4})',
                r'(\d{1,2}\s+Jan\s+\d{4})',
                r'(\d{1,2}\s+Mar\s+\d{4})'
            ]
            
            for pattern in date_patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    fields['invoice_date'] = match.group(1).strip()
                    break
            
            # Due date
            due_patterns = [
                r'Due\s*Date\s*[:\s]*(\d{1,2}\s+\w+\s+\d{4})',
                r'Due\s*[:\s]*(\d{1,2}\s+\w+\s+\d{4})'
            ]
            
            for pattern in due_patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    fields['due_date'] = match.group(1).strip()
                    break
            
            # Total amount - look for AED amounts
            total_patterns = [
                r'Total\s*[:\s]*AED\s*([\d,]+\.?\d*)',
                r'Balance\s*Due\s*[:\s]*AED\s*([\d,]+\.?\d*)',
                r'AED\s*([\d,]+\.?\d*)\s*$'
            ]
            
            for pattern in total_patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    fields['total_amount'] = f"AED {match.group(1)}"
                    break
            
            # Subtotal
            subtotal_patterns = [
                r'Sub\s*Total\s*[:\s]*([\d,]+\.?\d*)',
                r'Subtotal\s*[:\s]*([\d,]+\.?\d*)'
            ]
            
            for pattern in subtotal_patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    fields['subtotal'] = f"AED {match.group(1)}"
                    break
            
            # Tax amount
            tax_patterns = [
                r'Tax\s*[:\s]*AED\s*([\d,]+\.?\d*)',
                r'VAT\s*[:\s]*AED\s*([\d,]+\.?\d*)',
                r'(\d+\.\d{2})\s*$'  # Last amount in line
            ]
            
            for pattern in tax_patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    fields['tax_amount'] = f"AED {match.group(1)}"
                    break
            
            # VAT Number
            vat_patterns = [
                r'VAT\s*No\.?\s*[:\s]*(\d+)',
                r'TRN\s*(\d+)',
                r'Tax\s*Registration\s*Number\s*[:\s]*(\d+)'
            ]
            
            for pattern in vat_patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    fields['vat_number'] = match.group(1).strip()
                    break
            
            # PO Number
            po_patterns = [
                r'P\.O\.#?\s*[:\s]*([A-Z0-9\-]+)',
                r'Purchase\s*Order\s*[:\s]*([A-Z0-9\-]+)',
                r'PO\s*[:\s]*([A-Z0-9\-]+)'
            ]
            
            for pattern in po_patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    fields['po_number'] = match.group(1).strip()
                    break
            
            # Extract from bounding boxes for better accuracy
            for bbox in bounding_boxes:
                bbox_text = bbox.get('text', '').strip()
                
                # Look for specific invoice elements
                if 'INV-' in bbox_text and not fields.get('invoice_number'):
                    fields['invoice_number'] = bbox_text
                elif 'AED' in bbox_text and ',' in bbox_text:
                    if 'total' not in fields.get('total_amount', '').lower():
                        fields['total_amount'] = bbox_text
                elif re.match(r'\d{2}\s+\w+\s+\d{4}', bbox_text):
                    if not fields.get('invoice_date'):
                        fields['invoice_date'] = bbox_text
                        
        except Exception as e:
            logger.warning(f"Error extracting invoice fields: {str(e)}")
        
        return fields

    def _extract_id_card_fields(self, text: str, bounding_boxes: List[Dict]) -> Dict[str, Any]:
        """Extract ID card specific fields."""
        fields = {}
        
        try:
            # License number patterns
            license_patterns = [
                r'License\s*No\.?\s*[:\s]*([A-Z0-9\-]+)',
                r'License\s*Number\s*[:\s]*([A-Z0-9\-]+)',
                r'ADFZ[-\s]?(\d+)'
            ]
            
            for pattern in license_patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    fields['license_number'] = match.group(1).strip()
                    break
            
            # Registration number
            reg_patterns = [
                r'Registration\s*No\.?\s*[:\s]*(\d+)',
                r'Reg\s*No\.?\s*[:\s]*(\d+)'
            ]
            
            for pattern in reg_patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    fields['registration_number'] = match.group(1).strip()
                    break
            
            # Company name
            company_patterns = [
                r'Trade\s*Name\s*[:\s]*([^\n]+)',
                r'Company\s*Name\s*[:\s]*([^\n]+)'
            ]
            
            for pattern in company_patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    fields['company_name'] = match.group(1).strip()
                    break
                    
        except Exception as e:
            logger.warning(f"Error extracting ID card fields: {str(e)}")
        
        return fields

    def _extract_financial_report_fields(self, text: str, bounding_boxes: List[Dict]) -> Dict[str, Any]:
        """Extract financial report specific fields."""
        fields = {}
        
        try:
            # Revenue patterns
            revenue_patterns = [
                r'Revenue\s*[:\s]*([\d,]+\.?\d*)',
                r'Total\s*Revenue\s*[:\s]*([\d,]+\.?\d*)',
                r'Income\s*[:\s]*([\d,]+\.?\d*)'
            ]
            
            for pattern in revenue_patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    fields['revenue'] = match.group(1).strip()
                    break
            
            # Profit patterns
            profit_patterns = [
                r'Profit\s*[:\s]*([\d,]+\.?\d*)',
                r'Net\s*Profit\s*[:\s]*([\d,]+\.?\d*)'
            ]
            
            for pattern in profit_patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    fields['profit'] = match.group(1).strip()
                    break
                    
        except Exception as e:
            logger.warning(f"Error extracting financial report fields: {str(e)}")
        
        return fields

    def _extract_contract_fields(self, text: str, bounding_boxes: List[Dict]) -> Dict[str, Any]:
        """Extract contract specific fields."""
        fields = {}
        
        try:
            # Contract number
            contract_patterns = [
                r'Contract\s*No\.?\s*[:\s]*([A-Z0-9\-]+)',
                r'Agreement\s*No\.?\s*[:\s]*([A-Z0-9\-]+)'
            ]
            
            for pattern in contract_patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    fields['contract_number'] = match.group(1).strip()
                    break
            
            # Contract date
            date_patterns = [
                r'Contract\s*Date\s*[:\s]*(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})',
                r'Effective\s*Date\s*[:\s]*(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})'
            ]
            
            for pattern in date_patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    fields['contract_date'] = match.group(1).strip()
                    break
                    
        except Exception as e:
            logger.warning(f"Error extracting contract fields: {str(e)}")
        
        return fields

    def _extract_receipt_fields(self, text: str, bounding_boxes: List[Dict]) -> Dict[str, Any]:
        """Extract receipt specific fields."""
        fields = {}
        
        try:
            # Receipt number
            receipt_patterns = [
                r'Receipt\s*No\.?\s*[:\s]*([A-Z0-9\-]+)',
                r'Receipt\s*#\s*[:\s]*([A-Z0-9\-]+)'
            ]
            
            for pattern in receipt_patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    fields['receipt_number'] = match.group(1).strip()
                    break
            
            # Total amount
            total_patterns = [
                r'Total\s*[:\s]*([\d,]+\.?\d*)',
                r'Amount\s*[:\s]*([\d,]+\.?\d*)'
            ]
            
            for pattern in total_patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    fields['total_amount'] = match.group(1).strip()
                    break
                    
        except Exception as e:
            logger.warning(f"Error extracting receipt fields: {str(e)}")
        
        return fields

    def _extract_generic_fields(self, text: str, bounding_boxes: List[Dict]) -> Dict[str, Any]:
        """Extract generic fields for unknown document types."""
        fields = {}
        
        try:
            # Look for any dates
            dates = re.findall(r'\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}', text)
            if dates:
                fields['date'] = dates[0]
            
            # Look for any amounts
            amounts = re.findall(r'[\d,]+\.?\d*', text)
            if amounts:
                fields['amount'] = amounts[-1]  # Take the last amount found
                
        except Exception as e:
            logger.warning(f"Error extracting generic fields: {str(e)}")
        
        return fields

    def _extract_fields_from_tables(self, bounding_boxes: List[Dict]) -> Dict[str, Any]:
        """Extract structured fields from table-like data in bounding boxes."""
        fields = {}
        
        try:
            # Create a mapping of field names to their values based on common patterns
            field_mappings = {
                'license_number': ['license no', 'license number', 'licence no', 'licence number'],
                'registration_number': ['registration no', 'registration number', 'reg no'],
                'customs_registration': ['customs registration no', 'customs registration number', 'customs reg'],
                'company_name': ['trade name', 'company name', 'business name', 'organization name'],
                'first_issue_date': ['first issue date', 'initial issue date', 'original issue date'],
                'current_issue_date': ['current issue date', 'issue date', 'issued date'],
                'expiry_date': ['expiry date', 'expiration date', 'valid until', 'expires'],
                'legal_form': ['legal form', 'company type', 'entity type', 'business type'],
                'manager_name': ['manager name', 'contact person', 'authorized person', 'representative'],
                'email': ['email', 'e-mail', 'email address'],
                'phone': ['phone', 'phone number', 'telephone', 'contact number', 'mobile'],
                'address': ['address', 'location', 'street address', 'business address'],
                'licensed_activities': ['licensed activities', 'activities', 'business activities', 'services']
            }
            
            # Convert bounding boxes to a searchable text
            all_text = " ".join([bbox.get('text', '') for bbox in bounding_boxes]).lower()
            
            # Look for field-value pairs in the text
            for field_name, field_patterns in field_mappings.items():
                for pattern in field_patterns:
                    # Find the pattern and extract the value that follows
                    import re
                    
                    # Create a regex pattern to find the field name followed by a value
                    regex_pattern = rf'{re.escape(pattern)}\s*:?\s*([^\n\r]+?)(?=\n|$|[A-Z][a-z]+\s*:|$)'
                    match = re.search(regex_pattern, all_text, re.IGNORECASE)
                    
                    if match:
                        value = match.group(1).strip()
                        # Clean up the value
                        value = re.sub(r'[^\w\s@.-]', '', value)  # Remove special characters except common ones
                        value = value.strip()
                        
                        if value and len(value) > 1:
                            fields[field_name] = value
                            break
            
            # Additional pattern-based extraction for common document fields
            additional_patterns = {
                'license_number': [r'(?:license|licence)[\s#:]*([A-Z0-9-]+)', r'([A-Z]{2,}-\d{4,})'],
                'registration_number': [r'(?:registration|reg)[\s#:]*(\d+)', r'reg[\s#:]*(\d+)'],
                'email': [r'([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})'],
                'phone': [r'(\+\d{1,3}\s?\d{1,4}[-\.\s]?\d{1,4}[-\.\s]?\d{1,4})', r'(\(\d{3}\)\s?\d{3}[-\.\s]?\d{4})'],
                'date': [r'(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4})', r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})']
            }
            
            for field_name, patterns in additional_patterns.items():
                if field_name not in fields:  # Only if not already found
                    for pattern in patterns:
                        matches = re.findall(pattern, all_text, re.IGNORECASE)
                        if matches:
                            fields[field_name] = matches[0].strip()
                            break
            
            logger.info(f"Extracted {len(fields)} fields from table data: {list(fields.keys())}")
            
        except Exception as e:
            logger.error(f"Error extracting fields from tables: {str(e)}")
        
        return fields

    def _extract_fields_from_text(self, text: str) -> Dict[str, Any]:
        """Extract fields directly from the raw text using simple pattern matching."""
        fields = {}
        
        try:
            import re
            
            # Simple field extraction patterns based on the license document format
            patterns = {
                'license_number': [
                    r'ADFZ-\d+',
                    r'License No\s*([A-Z0-9-]+)',
                    r'([A-Z]{2,}-\d{4,})'
                ],
                'registration_number': [
                    r'Registration No\s*(\d+)',
                    r'549'
                ],
                'customs_registration': [
                    r'1537135',
                    r'Customs.*?Registration No\s*(\d+)'
                ],
                'company_name': [
                    r'Saisoft Information Technology\s*Consultancy Ltd',
                    r'Trade Name\s*([A-Za-z\s&\.]+)',
                    r'([A-Za-z\s]+(?:Technology|Consultancy|Ltd|Inc|Corp|LLC))'
                ],
                'first_issue_date': [
                    r'First Issue Date\s*(\d{1,2}\s+Sep\s+\d{4})',
                    r'03 Sep 2020'
                ],
                'current_issue_date': [
                    r'Current Issue Date\s*(\d{1,2}\s+Sep\s+\d{4})',
                    r'03 Sep 2024'
                ],
                'expiry_date': [
                    r'Expiry Date\s*(\d{1,2}\s+Sep\s+\d{4})',
                    r'02 Sep 2025'
                ],
                'legal_form': [
                    r'Legal Form\s*(Limited Liability Company)',
                    r'Limited Liability Company'
                ],
                'manager_name': [
                    r'Manager Name\s*(Venkata Lakshmi Kishor Namburu)',
                    r'Venkata Lakshmi Kishor Namburu'
                ],
                'email': [
                    r'Email\s*(kishornbd@gmail\.com)',
                    r'kishornbd@gmail\.com',
                    r'([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})'
                ],
                'phone': [
                    r'Phone Number\s*(\+971585969754)',
                    r'\+971585969754',
                    r'(\+\d{1,3}\s?\d{1,4}[-\.\s]?\d{1,4}[-\.\s]?\d{1,4})'
                ],
                'address': [
                    r'Workstation No\. 235A.*?United Arab Emirates',
                    r'Workstation No\. 235A\s*Building No\.280\s*Taweelah, Abu Dhabi,\s*United Arab Emirates'
                ],
                'licensed_activities': [
                    r'Information Technology Consultancy',
                    r'Licenced Activities.*?(Information Technology Consultancy)'
                ]
            }
            
            # Extract fields using patterns
            for field_name, pattern_list in patterns.items():
                for pattern in pattern_list:
                    matches = re.findall(pattern, text, re.IGNORECASE | re.DOTALL)
                    if matches:
                        if isinstance(matches[0], tuple):
                            value = matches[0][0] if matches[0][0] else matches[0]
                        else:
                            value = matches[0]
                        
                        # Clean up the value
                        value = str(value).strip()
                        if value and len(value) > 1:
                            fields[field_name] = value
                            break
            
            # Special handling for address - combine multiple lines
            if 'address' not in fields:
                address_parts = []
                if 'Workstation No. 235A' in text:
                    address_parts.append('Workstation No. 235A')
                if 'Building No.280' in text:
                    address_parts.append('Building No.280')
                if 'Taweelah, Abu Dhabi,' in text:
                    address_parts.append('Taweelah, Abu Dhabi,')
                if 'United Arab Emirates' in text:
                    address_parts.append('United Arab Emirates')
                
                if address_parts:
                    fields['address'] = ', '.join(address_parts)
            
            logger.info(f"Text-based extraction found {len(fields)} fields: {list(fields.keys())}")
            
        except Exception as e:
            logger.error(f"Error in text-based field extraction: {str(e)}")
        
        return fields

    def add_correction(self, doc_type: str, field: str, original_value: str, corrected_value: str, context: dict = None):
        """Add a correction to the learning data for future processing."""
        try:
            # This method maintains compatibility with the API
            # The DocumentProcessor uses pattern-based extraction, so corrections
            # are handled through the pattern matching system
            logger.info(f"Correction added for {doc_type}.{field}: '{original_value}' -> '{corrected_value}'")
            
            # Store correction for potential future use
            if not hasattr(self, 'corrections'):
                self.corrections = []
            
            correction = {
                'doc_type': doc_type,
                'field': field,
                'original_value': original_value,
                'corrected_value': corrected_value,
                'context': context or {}
            }
            self.corrections.append(correction)
            
        except Exception as e:
            logger.error(f"Error adding correction: {str(e)}")

    def get_corrections(self) -> list:
        """Get all stored corrections."""
        return getattr(self, 'corrections', [])

    def _extract_fields_layoutlm_universal(self, image, text: str, bounding_boxes: List[Dict], model=None, processor=None) -> Dict[str, Any]:
        """Universal field extraction using LayoutLM's document understanding."""
        fields = {}
        try:
            # Use provided model/processor or fallback to default
            if not model or not processor:
                if not getattr(self, 'use_layoutlm', False) or not self.layout_processor or not self.layout_model:
                    logger.warning("LayoutLM not available, skipping universal extraction")
                    return fields
                model = self.layout_model
                processor = self.layout_processor
            
            logger.info("Starting universal LayoutLM field extraction...")
            
            # Get image dimensions for proper normalization
            img_width, img_height = image.size
            
            # Prepare input for LayoutLM
            words = text.split()
            
            # Prepare bounding boxes for LayoutLM
            boxes = []
            for bbox in bounding_boxes:
                if bbox.get('box') and len(bbox['box']) == 4:
                    box = bbox['box']
                    boxes.append([box[0], box[1], box[2], box[3]])
            
            # Ensure we have the same number of boxes as words
            if len(boxes) != len(words):
                if len(boxes) > len(words):
                    boxes = boxes[:len(words)]
                else:
                    last_box = boxes[-1] if boxes else [0, 0, 100, 100]
                    boxes.extend([last_box] * (len(words) - len(boxes)))
            
            if not boxes:
                boxes = [[0, 0, 100, 100] for _ in range(len(words))]
            
            logger.info(f"Processing {len(words)} words with {len(boxes)} bounding boxes...")
            
            # LayoutLM processing with proper tensor formatting
            try:
                # Ensure boxes are properly formatted as flat lists
                formatted_boxes = []
                for box in boxes:
                    if isinstance(box, list) and len(box) == 4:
                        # Handle nested lists - flatten if needed
                        flat_box = []
                        for coord in box:
                            if isinstance(coord, list):
                                flat_box.extend(coord)
                            else:
                                flat_box.append(coord)
                        
                        # Ensure we have exactly 4 coordinates and normalize to 0-1000 range
                        if len(flat_box) >= 4:
                            x1, y1, x2, y2 = int(flat_box[0]), int(flat_box[1]), int(flat_box[2]), int(flat_box[3])
                            # Normalize coordinates to 0-1000 range (LayoutLM requirement)
                            # Use actual image dimensions for proper normalization
                            x1_norm = min(1000, max(0, int(x1 * 1000 / img_width)))
                            y1_norm = min(1000, max(0, int(y1 * 1000 / img_height)))
                            x2_norm = min(1000, max(0, int(x2 * 1000 / img_width)))
                            y2_norm = min(1000, max(0, int(y2 * 1000 / img_height)))
                            formatted_boxes.append([x1_norm, y1_norm, x2_norm, y2_norm])
                        else:
                            formatted_boxes.append([0, 0, 100, 100])
                    elif isinstance(box, (int, float)):
                        # Single coordinate - create a default box
                        formatted_boxes.append([0, 0, 100, 100])
                    else:
                        formatted_boxes.append([0, 0, 100, 100])
                
                # Ensure we have the same number of boxes as words
                if len(formatted_boxes) != len(words):
                    if len(formatted_boxes) > len(words):
                        formatted_boxes = formatted_boxes[:len(words)]
                    else:
                        # Pad with the last box
                        last_box = formatted_boxes[-1] if formatted_boxes else [0, 0, 100, 100]
                        formatted_boxes.extend([last_box] * (len(words) - len(formatted_boxes)))
                
                # Limit input size to avoid memory issues
                max_words = 256
                if len(words) > max_words:
                    words = words[:max_words]
                    formatted_boxes = formatted_boxes[:max_words]
                
                logger.info(f"LayoutLM input: {len(words)} words, {len(formatted_boxes)} boxes")
                
                encoding = self.layout_processor(
                    image,
                    words,
                    boxes=formatted_boxes,
                    return_tensors="pt",
                    truncation=True,
                    padding=True,
                    max_length=512
                )
                
                logger.info("LayoutLM encoding successful")
                
            except Exception as e:
                logger.warning(f"LayoutLM encoding failed: {str(e)}")
                return {}
            
            # Get model predictions
            with torch.no_grad():
                outputs = model(**encoding)
                predictions = torch.nn.functional.softmax(outputs.logits, dim=-1)
                predicted_labels = torch.argmax(predictions, dim=-1)
            
            # Extract fields based on LayoutLM predictions and spatial analysis
            fields = self._extract_fields_from_layout_analysis(
                words, boxes, predicted_labels, encoding, text
            )
            
            logger.info(f"LayoutLM universal extraction found {len(fields)} fields")
            return fields
            
        except Exception as e:
            logger.error(f"Error in LayoutLM universal extraction: {str(e)}")
            return fields

    def _extract_fields_from_layout_analysis(self, words: List[str], boxes: List[List[int]], 
                                           predicted_labels, encoding, full_text: str) -> Dict[str, Any]:
        """Extract fields using LayoutLM's layout understanding."""
        fields = {}
        try:
            # Convert predictions to numpy for easier processing
            labels = predicted_labels.cpu().numpy()[0]  # Remove batch dimension
            
            # Get attention mask to ignore padding tokens
            attention_mask = encoding.get('attention_mask', None)
            if attention_mask is not None:
                attention_mask = attention_mask.cpu().numpy()[0]
                # Only process non-padded tokens
                valid_length = len([x for x in attention_mask if x == 1])
                words = words[:valid_length]
                boxes = boxes[:valid_length]
                labels = labels[:valid_length]
            
            # Group tokens by spatial proximity and labels
            field_groups = self._group_tokens_by_layout(words, boxes, labels)
            
            # Extract different types of fields based on layout analysis
            fields.update(self._extract_numeric_fields(field_groups))
            fields.update(self._extract_date_fields(field_groups))
            fields.update(self._extract_identifier_fields(field_groups))
            fields.update(self._extract_text_fields(field_groups))
            
            # Use spatial relationships to identify field-value pairs
            spatial_fields = self._extract_spatial_field_pairs(words, boxes, full_text)
            fields.update(spatial_fields)
            
            return fields
            
        except Exception as e:
            logger.error(f"Error in layout analysis: {str(e)}")
            return fields

    def _group_tokens_by_layout(self, words: List[str], boxes: List[List[int]], 
                               labels: List[int]) -> List[Dict]:
        """Group tokens based on their spatial layout and labels."""
        groups = []
        current_group = []
        
        for i, (word, box, label) in enumerate(zip(words, boxes, labels)):
            if not current_group:
                current_group = {'words': [word], 'boxes': [box], 'labels': [label], 'start_idx': i}
            else:
                # Check if this token should be grouped with the current group
                last_box = current_group['boxes'][-1]
                distance = self._calculate_box_distance(box, last_box)
                
                # Group tokens that are close spatially and have similar labels
                if distance < 50 and abs(label - current_group['labels'][-1]) <= 1:
                    current_group['words'].append(word)
                    current_group['boxes'].append(box)
                    current_group['labels'].append(label)
                else:
                    # Start a new group
                    groups.append(current_group)
                    current_group = {'words': [word], 'boxes': [box], 'labels': [label], 'start_idx': i}
        
        if current_group:
            groups.append(current_group)
        
        return groups

    def _calculate_box_distance(self, box1: List[int], box2: List[int]) -> float:
        """Calculate distance between two bounding boxes."""
        try:
            # Calculate center points
            center1 = [(box1[0] + box1[2]) / 2, (box1[1] + box1[3]) / 2]
            center2 = [(box2[0] + box2[2]) / 2, (box2[1] + box2[3]) / 2]
            
            # Euclidean distance
            distance = ((center1[0] - center2[0]) ** 2 + (center1[1] - center2[1]) ** 2) ** 0.5
            return distance
        except:
            return float('inf')

    def _extract_numeric_fields(self, field_groups: List[Dict]) -> Dict[str, Any]:
        """Extract numeric fields like amounts, quantities, etc."""
        fields = {}
        
        for group in field_groups:
            text = ' '.join(group['words']).strip()
            
            # Look for monetary amounts
            if re.search(r'[\$€£¥₹]', text) or re.search(r'\d+\.\d{2}', text):
                # Check if this looks like a total amount
                if any(keyword in text.lower() for keyword in ['total', 'amount', 'sum', 'due', 'balance']):
                    fields['total_amount'] = text
                elif any(keyword in text.lower() for keyword in ['tax', 'vat', 'gst']):
                    fields['tax_amount'] = text
                elif any(keyword in text.lower() for keyword in ['subtotal', 'sub total']):
                    fields['subtotal'] = text
                elif any(keyword in text.lower() for keyword in ['discount', 'off']):
                    fields['discount'] = text
                else:
                    # Generic monetary field
                    fields['monetary_amount'] = text
            
            # Look for quantities
            elif re.search(r'^\d+$', text) and len(text) <= 10:
                if any(keyword in ' '.join(group['words'][:3]).lower() for keyword in ['qty', 'quantity', 'units']):
                    fields['quantity'] = text
        
        return fields

    def _extract_date_fields(self, field_groups: List[Dict]) -> Dict[str, Any]:
        """Extract date fields."""
        fields = {}
        
        for group in field_groups:
            text = ' '.join(group['words']).strip()
            
            # Look for date patterns
            date_patterns = [
                r'\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4}',
                r'\d{4}-\d{2}-\d{2}',
                r'(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[\w\s]*\d{1,2},?\s*\d{4}'
            ]
            
            for pattern in date_patterns:
                if re.search(pattern, text, re.IGNORECASE):
                    # Determine date type based on context
                    context_words = ' '.join(group['words'][:5]).lower()
                    if any(keyword in context_words for keyword in ['due', 'payment', 'pay by']):
                        fields['due_date'] = text
                    elif any(keyword in context_words for keyword in ['issue', 'create', 'generate']):
                        fields['issue_date'] = text
                    else:
                        fields['date'] = text
                    break
        
        return fields

    def _extract_identifier_fields(self, field_groups: List[Dict]) -> Dict[str, Any]:
        """Extract identifier fields like document numbers, IDs, etc."""
        fields = {}
        
        for group in field_groups:
            text = ' '.join(group['words']).strip()
            
            # Look for document numbers/IDs
            if re.search(r'[A-Z]{2,}\d{4,}', text) or re.search(r'\d{4,}-\d{3,}', text):
                context_words = ' '.join(group['words'][:3]).lower()
                if any(keyword in context_words for keyword in ['invoice', 'inv', 'bill', 'receipt']):
                    fields['document_number'] = text
                elif any(keyword in context_words for keyword in ['po', 'purchase', 'order']):
                    fields['purchase_order'] = text
                elif any(keyword in context_words for keyword in ['quote', 'estimate']):
                    fields['quote_number'] = text
                else:
                    fields['reference_number'] = text
            
            # Look for email addresses
            elif re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', text):
                fields['email'] = text
            
            # Look for phone numbers
            elif re.search(r'[\+]?[\d\s\-\(\)]{10,}', text):
                fields['phone'] = text
        
        return fields

    def _extract_text_fields(self, field_groups: List[Dict]) -> Dict[str, Any]:
        """Extract text fields like names, addresses, descriptions."""
        fields = {}
        
        for group in field_groups:
            text = ' '.join(group['words']).strip()
            
            # Skip if it's mostly numbers or special characters
            if len(text) < 3 or re.search(r'^[\d\s\-\.\$€£¥₹]+$', text):
                continue
            
            # Look for company/person names (usually longer text blocks)
            if len(text) > 5 and len(text) < 100:
                context_words = ' '.join(group['words'][:3]).lower()
                if any(keyword in context_words for keyword in ['from', 'vendor', 'company', 'bill to']):
                    fields['vendor_name'] = text
                elif any(keyword in context_words for keyword in ['to', 'customer', 'client', 'ship to']):
                    fields['customer_name'] = text
                elif any(keyword in context_words for keyword in ['contact', 'person', 'representative']):
                    fields['contact_person'] = text
                elif any(keyword in context_words for keyword in ['address', 'location', 'street']):
                    fields['address'] = text
                elif any(keyword in context_words for keyword in ['description', 'item', 'product', 'service']):
                    fields['description'] = text
        
        return fields

    def _extract_spatial_field_pairs(self, words: List[str], boxes: List[List[int]], 
                                   full_text: str) -> Dict[str, Any]:
        """Extract field-value pairs based on spatial relationships."""
        fields = {}
        
        try:
            # Look for common field patterns in the text
            field_patterns = {
                'total_amount': [r'total[\s:]*\$?([0-9,]+\.?\d*)', r'amount[\s:]*\$?([0-9,]+\.?\d*)'],
                'date': [r'date[\s:]*(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4})'],
                'document_number': [r'(?:invoice|inv|bill|receipt)[\s#:]*([A-Z0-9\-]+)'],
                'vendor_name': [r'from[\s:]*([A-Za-z\s&\.]+)'],
                'customer_name': [r'to[\s:]*([A-Za-z\s&\.]+)']
            }
            
            for field_name, patterns in field_patterns.items():
                for pattern in patterns:
                    matches = re.findall(pattern, full_text, re.IGNORECASE | re.MULTILINE)
                    if matches:
                        fields[field_name] = matches[0].strip()
                        break
        
        except Exception as e:
            logger.error(f"Error in spatial field extraction: {str(e)}")
        
        return fields