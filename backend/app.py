from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import shutil
import uuid
from pathlib import Path
import logging
from typing import Dict, Any, List, Optional
import json

from models.ocr_processor import OCRDocumentProcessor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Document Processing API",
    description="API for processing documents using OCR",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Create upload directory if it doesn't exist
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Initialize OCR processor
ocr_processor = OCRDocumentProcessor()

# Store processing results
processing_results = {}

@app.get("/")
async def root():
    """Root endpoint to check if the API is running."""
    return {"message": "Document Processing API is running"}

@app.post("/process-document/")
async def process_document(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None
) -> Dict[str, Any]:
    """
    Process a document using OCR.
    
    Args:
        file: The document file to process
        
    Returns:
        Dict containing processing results
    """
    try:
        # Generate a unique ID for this processing job
        job_id = str(uuid.uuid4())
        
        # Save the uploaded file
        file_extension = os.path.splitext(file.filename)[1]
        saved_file_path = UPLOAD_DIR / f"{job_id}{file_extension}"
        
        with open(saved_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Process the document
        logger.info(f"Processing document: {saved_file_path}")
        result = ocr_processor.process_document(saved_file_path)
        
        # Store the result
        processing_results[job_id] = {
            "status": "completed",
            "result": result
        }
        
        # Clean up the uploaded file
        os.remove(saved_file_path)
        
        return {
            "job_id": job_id,
            "status": "completed",
            "result": result
        }
        
    except Exception as e:
        logger.error(f"Error processing document: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/process-document-async/")
async def process_document_async(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None
) -> Dict[str, Any]:
    """
    Process a document asynchronously using OCR.
    
    Args:
        file: The document file to process
        
    Returns:
        Dict containing job ID for tracking
    """
    try:
        # Generate a unique ID for this processing job
        job_id = str(uuid.uuid4())
        
        # Save the uploaded file
        file_extension = os.path.splitext(file.filename)[1]
        saved_file_path = UPLOAD_DIR / f"{job_id}{file_extension}"
        
        with open(saved_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Initialize job status
        processing_results[job_id] = {
            "status": "processing",
            "result": None
        }
        
        # Process in background
        background_tasks.add_task(process_document_background, job_id, saved_file_path)
        
        return {
            "job_id": job_id,
            "status": "processing",
            "message": "Document processing started"
        }
        
    except Exception as e:
        logger.error(f"Error starting document processing: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def process_document_background(job_id: str, file_path: Path):
    """Background task to process a document."""
    try:
        # Process the document
        logger.info(f"Processing document in background: {file_path}")
        result = ocr_processor.process_document(file_path)
        
        # Update the result
        processing_results[job_id] = {
            "status": "completed",
            "result": result
        }
        
        # Clean up the uploaded file
        os.remove(file_path)
        
    except Exception as e:
        logger.error(f"Error in background processing: {str(e)}")
        processing_results[job_id] = {
            "status": "failed",
            "error": str(e)
        }

@app.get("/job-status/{job_id}")
async def get_job_status(job_id: str) -> Dict[str, Any]:
    """
    Get the status of a processing job.
    
    Args:
        job_id: The ID of the job to check
        
    Returns:
        Dict containing job status and result if available
    """
    if job_id not in processing_results:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return processing_results[job_id]

@app.get("/health")
async def health_check() -> Dict[str, str]:
    """Health check endpoint."""
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True) 