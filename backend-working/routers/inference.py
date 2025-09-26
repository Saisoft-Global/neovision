from fastapi import APIRouter, File, UploadFile, HTTPException
from PIL import Image
import io
from models.document_processor import DocumentProcessor
from typing import Dict, Any

router = APIRouter()

# Initialize document processor
doc_processor = DocumentProcessor()

@router.post("/process-document")
async def process_document(file: UploadFile = File(...)) -> Dict[str, Any]:
    """Process a document using ML models"""
    try:
        # Read and convert to PIL Image
        content = await file.read()
        image = Image.open(io.BytesIO(content))
        
        # Process document
        result = doc_processor.process_image(image)
        
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing document: {str(e)}"
        )