import logging
import os
import tempfile
from fastapi import FastAPI, File, UploadFile, HTTPException, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Dict, Any, List, Optional
import json
from PIL import Image
import io
import shutil
from models.document_processor import DocumentProcessor
from routers import annotation, training, supabase_auth
from pdf2image import convert_from_bytes
import magic
import fitz  # PyMuPDF
from pathlib import Path
from datetime import datetime
import asyncio
from concurrent.futures import ThreadPoolExecutor
import time
import uvicorn
from log import logger

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(filename)s:%(lineno)d - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Document Processing API",
    description="API for processing documents using LayoutLM and pattern-based extraction",
    version="1.0.0"
)

# Configure CORS with environment variable
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')
ALLOWED_ORIGINS = [
    "http://localhost:5173",  # Vite default
    "http://localhost:3000",  # React default
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "*"  # Allow all origins during development
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600
)

# Ensure model directories exist
os.makedirs("models", exist_ok=True)
os.makedirs("models/layout", exist_ok=True)
os.makedirs("models/spacy", exist_ok=True)

# Initialize document processor with thread pool
MAX_WORKERS = 4  # Adjust based on your server capacity
thread_pool = ThreadPoolExecutor(max_workers=MAX_WORKERS)
document_processor = DocumentProcessor()

# Request tracking
active_requests: Dict[str, Dict[str, Any]] = {}

# Include routers
app.include_router(annotation.router, prefix="/annotation", tags=["annotation"])
app.include_router(training.router, prefix="/training", tags=["training"])
app.include_router(supabase_auth.router, prefix="/auth", tags=["authentication"])

# Include inference router
try:
    from routers import inference
    # Set the global document processor in the inference router
    inference.document_processor = document_processor
    app.include_router(inference.router, prefix="/inference", tags=["inference"])
    logger.info("Inference router loaded successfully")
except ImportError as e:
    logger.warning(f"Inference router not available: {str(e)}")

# Supported file types
SUPPORTED_MIME_TYPES = {
    'image/jpeg': 'image',
    'image/png': 'image',
    'image/tiff': 'image',
    'image/bmp': 'image',
    'application/pdf': 'pdf',
    'application/msword': 'doc',  # .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',  # .docx
    'text/plain': 'text'
}

# Create upload directory if it doesn't exist
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Add test corrections for common invoice patterns
# Dynamic corrections for learning (no hardcoded values)
test_corrections = []

# Add corrections to the processor
for correction in test_corrections:
    document_processor.add_correction(
        doc_type=correction["doc_type"],
        field=correction["field"],
        original_value=correction["original_value"],
        corrected_value=correction["corrected_value"],
        context=correction["context"]
    )

@app.get("/")
async def root():
    """Root endpoint to check if the API is running."""
    return {"status": "running", "message": "Document Processing API is running"}

# Removed duplicate /process-document endpoint - now handled by inference router

@app.get("/request-status/{request_id}")
async def get_request_status(request_id: str) -> Dict[str, Any]:
    """Get the status of a document processing request."""
    if request_id not in active_requests:
        raise HTTPException(status_code=404, detail="Request not found")
        
    request_info = active_requests[request_id]
    if request_info["status"] == "processing":
        processing_time = time.time() - request_info["start_time"]
        return {
            "status": "processing",
            "processing_time": processing_time,
            "filename": request_info["filename"]
        }
    elif request_info["status"] == "completed":
        return {
            "status": "completed",
            "processing_time": request_info["end_time"] - request_info["start_time"],
            "result": request_info["result"]
        }
    else:
        return {
            "status": "failed",
            "error": request_info.get("error", "Unknown error")
        }

@app.post("/process-folder")
async def process_folder(
    folder_path: str = Form(...),
    output_format: str = Form("json")
) -> Dict[str, Any]:
    """
    Process all documents in a folder.
    
    Args:
        folder_path: Path to the folder containing documents
        output_format: Output format (json or text)
        
    Returns:
        Processing results for all documents
    """
    try:
        folder = Path(folder_path)
        if not folder.exists():
            raise HTTPException(status_code=400, detail=f"Folder not found: {folder_path}")
        
        results = {}
        for file_path in folder.glob('**/*'):
            if file_path.suffix.lower() in document_processor.supported_extensions:
                try:
                    result = document_processor.process_document(str(file_path))
                    results[str(file_path)] = result
                except Exception as e:
                    logger.error(f"Error processing {file_path}: {str(e)}")
                    results[str(file_path)] = {
                        'error': str(e),
                        'status': 'failed'
                    }
        
        # Format output based on requested format
        if output_format.lower() == "text":
            return {
                path: {
                    "document_type": result.get('document_type', 'unknown'),
                    "extracted_text": result.get('extracted_text', ''),
                    "confidence": result.get('confidence', 0.0)
                }
                for path, result in results.items()
            }
        else:
            return results
            
    except Exception as e:
        logger.error(f"Error processing folder: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/health")
async def health_check() -> Dict[str, Any]:
    """Detailed health check endpoint."""
    # Check active model status
    active_model_info = {"active": False, "model_name": None}
    try:
        from models.active_model_manager import ActiveModelManager
        active_manager = ActiveModelManager()
        active_model_info = active_manager.get_active_model()
    except Exception as e:
        logger.warning(f"Failed to get active model status: {e}")
    
    return {
        "status": "healthy",
        "active_requests": len(active_requests),
        "thread_pool": {
            "max_workers": MAX_WORKERS,
            "active_threads": len(thread_pool._threads)
        },
        "active_model": active_model_info,
        "uptime": time.time() - app.state.start_time
    }

@app.on_event("startup")
async def startup_event():
    """Initialize application state on startup."""
    app.state.start_time = time.time()
    
    # Try to auto-set the latest trained model as active
    try:
        from models.active_model_manager import ActiveModelManager
        active_manager = ActiveModelManager()
        result = active_manager.auto_set_latest_model()
        if result["success"]:
            logger.info(f"Auto-set latest model as active: {result['model_name']}")
        else:
            logger.info("No trained models found, using pattern-based extraction only")
    except Exception as e:
        logger.warning(f"Failed to auto-set active model: {e}")
    
    logger.info("Application startup complete")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    thread_pool.shutdown(wait=True)
    logger.info("Application shutdown complete")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)