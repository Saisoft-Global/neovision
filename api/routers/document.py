from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from typing import Dict, Any, Optional
import json
from PIL import Image
import io
from models.document_processor import DocumentProcessor
from models.template_processor import TemplateProcessor

router = APIRouter()
processor = DocumentProcessor()
template_processor = TemplateProcessor()

@router.post("/process-document")
async def process_document(
    file: UploadFile = File(...),
    template: Optional[str] = Form(None)
) -> Dict[str, Any]:
    """Process document with optional template"""
    try:
        content = await file.read()
        image = Image.open(io.BytesIO(content))
        
        # Process template if provided
        template_data = None
        if template:
            template_data = json.loads(template)
            
        # Process document
        result = processor.process_image(image)
        
        # Apply template if provided
        if template_data:
            result = template_processor.apply_template(result, template_data)
        
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing document: {str(e)}"
        )