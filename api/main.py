from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Dict, Any, Optional
import json
from PIL import Image
import io
from models.document_processor import DocumentProcessor
from models.template_processor import TemplateProcessor
from routers import feedback, training

app = FastAPI(
    title="IDP API",
    description="Intelligent Document Processing API",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize processors
doc_processor = DocumentProcessor()
template_processor = TemplateProcessor()

# Include routers
app.include_router(feedback.router, prefix="/feedback", tags=["feedback"])
app.include_router(training.router, prefix="/training", tags=["training"])

@app.post("/process-document")
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
        result = doc_processor.process_image(image)
        
        # Apply template if provided
        if template_data:
            result = template_processor.apply_template(result, template_data)
        
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing document: {str(e)}"
        )

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": "1.0.0"
    }