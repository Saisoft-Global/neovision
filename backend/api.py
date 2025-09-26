from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import tempfile
import logging
from pathlib import Path
from models.ocr_processor import OCRDocumentProcessor

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="Document Processing API", description="API for processing documents and extracting information")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Initialize the document processor
processor = OCRDocumentProcessor()

@app.get("/")
async def root():
    """Root endpoint to check if the API is running."""
    return {"message": "Document Processing API is running"}

@app.post("/process-document")
async def process_document(file: UploadFile = File(...)):
    """
    Process a document and extract information.
    
    Args:
        file: The document file to process (PDF, image)
        
    Returns:
        JSON response with the processing results
    """
    try:
        # Create a temporary file to save the uploaded file
        with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix) as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        logger.info(f"Processing document: {file.filename}")
        
        # Process the document
        results = processor.process_document(temp_file_path)
        
        # Clean up the temporary file
        os.unlink(temp_file_path)
        
        return JSONResponse(content=results)
    
    except Exception as e:
        logger.error(f"Error processing document: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"} 