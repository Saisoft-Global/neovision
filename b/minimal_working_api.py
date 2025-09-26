#!/usr/bin/env python3
"""
Minimal working API to isolate the issue
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from pathlib import Path
import os
import logging
import traceback

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Minimal Document Processing API")

@app.post("/process")
async def process_document_minimal(file: UploadFile = File(...)):
    """Minimal document processing endpoint"""
    temp_path = None
    try:
        logger.info(f"Received file: {file.filename}")
        
        # Validate file
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")
        
        # Create temp file
        temp_dir = Path("temp")
        temp_dir.mkdir(exist_ok=True)
        temp_path = temp_dir / f"minimal_{file.filename}"
        
        # Save uploaded file
        content = await file.read()
        logger.info(f"File content size: {len(content)} bytes")
        
        with open(temp_path, "wb") as f:
            f.write(content)
        
        logger.info(f"File saved to: {temp_path}")
        
        # Import and initialize document processor HERE (not at module level)
        logger.info("Importing document processor...")
        from models.document_processor import DocumentProcessor
        
        logger.info("Initializing document processor...")
        processor = DocumentProcessor()
        
        logger.info("Processing document...")
        result = processor.process_document(str(temp_path))
        
        logger.info("Processing completed successfully")
        
        return {
            "status": "success",
            "filename": file.filename,
            "document_type": result.get('document_type', 'Unknown'),
            "confidence": result.get('confidence', 0),
            "fields_count": len(result.get('extracted_fields', {})),
            "fields": list(result.get('extracted_fields', {}).keys())
        }
        
    except Exception as e:
        logger.error(f"Error in minimal processing: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
        
    finally:
        # Cleanup
        if temp_path and temp_path.exists():
            try:
                temp_path.unlink()
                logger.info(f"Cleaned up: {temp_path}")
            except Exception as e:
                logger.error(f"Cleanup error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
