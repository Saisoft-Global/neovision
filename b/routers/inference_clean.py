from fastapi import APIRouter, File, UploadFile, HTTPException
from pathlib import Path
import os
import logging
import traceback

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize document processor
try:
    from models.document_processor import DocumentProcessor
    doc_processor = DocumentProcessor()
    logger.info("DocumentProcessor initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize DocumentProcessor: {str(e)}")
    doc_processor = None

@router.post("/process-document")
async def process_document(file: UploadFile = File(...)):
    """Process a document using ML models - Clean Version"""
    temp_path = None
    try:
        # Check if processor is available
        if doc_processor is None:
            raise HTTPException(status_code=500, detail="Document processor not available")
        
        # Validate file
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")
        
        # Get file extension
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext not in ['.pdf', '.jpg', '.jpeg', '.png', '.tiff', '.bmp', '.txt', '.doc', '.docx', '.xls', '.xlsx']:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {file_ext}"
            )
        
        # Create temp file
        temp_dir = Path("temp")
        temp_dir.mkdir(exist_ok=True)
        temp_path = temp_dir / f"clean_{file.filename}"
        
        # Save uploaded file
        content = await file.read()
        logger.info(f"Saving file to: {temp_path}, size: {len(content)} bytes")
        
        with open(temp_path, "wb") as f:
            f.write(content)
        
        # Verify file was saved correctly
        if not temp_path.exists():
            raise HTTPException(status_code=500, detail="Failed to save uploaded file")
        
        logger.info(f"File saved successfully, size: {temp_path.stat().st_size} bytes")
        
        # Process document
        logger.info(f"Processing document: {temp_path}")
        result = doc_processor.process_document(str(temp_path))
        
        logger.info("Document processing completed successfully")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing document: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing document: {str(e)}"
        )
    finally:
        # Cleanup temp file
        if temp_path and temp_path.exists():
            try:
                temp_path.unlink()
                logger.info(f"Cleaned up temp file: {temp_path}")
            except Exception as e:
                logger.error(f"Error cleaning up temp file: {str(e)}")
