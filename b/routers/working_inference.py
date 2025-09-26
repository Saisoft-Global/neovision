from fastapi import APIRouter, File, UploadFile, HTTPException
from pathlib import Path
import os
import logging
import traceback
import tempfile
import uuid

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/process-document")
async def process_document_working(file: UploadFile = File(...)):
    """Working document processing endpoint with proper isolation"""
    temp_path = None
    try:
        logger.info(f"=== STARTING DOCUMENT PROCESSING ===")
        logger.info(f"Received file: {file.filename}")
        
        # Validate file
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")
        
        # Get file extension
        file_ext = os.path.splitext(file.filename)[1].lower()
        supported_types = ['.pdf', '.jpg', '.jpeg', '.png', '.tiff', '.bmp', '.txt', '.doc', '.docx', '.xls', '.xlsx']
        
        if file_ext not in supported_types:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {file_ext}. Supported: {supported_types}"
            )
        
        # Create unique temp file
        temp_dir = Path("temp")
        temp_dir.mkdir(exist_ok=True)
        unique_id = str(uuid.uuid4())[:8]
        temp_path = temp_dir / f"working_{unique_id}_{file.filename}"
        
        # Save uploaded file
        content = await file.read()
        logger.info(f"File content size: {len(content)} bytes")
        
        with open(temp_path, "wb") as f:
            f.write(content)
        
        # Verify file was saved
        if not temp_path.exists():
            raise HTTPException(status_code=500, detail="Failed to save uploaded file")
        
        file_size = temp_path.stat().st_size
        logger.info(f"File saved successfully: {temp_path}, size: {file_size} bytes")
        
        # Import document processor in isolated context
        logger.info("Importing document processor...")
        try:
            # Import here to avoid any initialization conflicts
            import sys
            import importlib
            
            # Reload the module to ensure clean state
            if 'models.document_processor' in sys.modules:
                importlib.reload(sys.modules['models.document_processor'])
            
            from models.document_processor import DocumentProcessor
            logger.info("Document processor imported successfully")
            
        except Exception as import_error:
            logger.error(f"Failed to import document processor: {str(import_error)}")
            raise HTTPException(status_code=500, detail=f"Import error: {str(import_error)}")
        
        # Initialize processor
        logger.info("Initializing document processor...")
        try:
            processor = DocumentProcessor()
            logger.info("Document processor initialized successfully")
        except Exception as init_error:
            logger.error(f"Failed to initialize document processor: {str(init_error)}")
            raise HTTPException(status_code=500, detail=f"Initialization error: {str(init_error)}")
        
        # Process document
        logger.info(f"Processing document: {temp_path}")
        try:
            result = processor.process_document(str(temp_path))
            logger.info("Document processing completed successfully")
            
            # Add metadata
            result["api_metadata"] = {
                "original_filename": file.filename,
                "file_size": file_size,
                "temp_path": str(temp_path),
                "processing_method": "working_inference_endpoint"
            }
            
            return result
            
        except Exception as proc_error:
            logger.error(f"Document processing failed: {str(proc_error)}")
            logger.error(f"Processing traceback: {traceback.format_exc()}")
            raise HTTPException(
                status_code=500,
                detail=f"Document processing error: {str(proc_error)}"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        logger.error(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error: {str(e)}"
        )
    finally:
        # Cleanup temp file
        if temp_path and temp_path.exists():
            try:
                temp_path.unlink()
                logger.info(f"Cleaned up temp file: {temp_path}")
            except Exception as cleanup_error:
                logger.error(f"Cleanup error: {str(cleanup_error)}")
        
        logger.info(f"=== DOCUMENT PROCESSING COMPLETE ===")

@router.get("/health")
async def health_check():
    """Health check for the working inference endpoint"""
    return {
        "status": "healthy",
        "endpoint": "working_inference",
        "message": "Working inference endpoint is operational"
    }
