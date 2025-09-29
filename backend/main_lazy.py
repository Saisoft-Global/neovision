"""
Lazy-loading version of main.py that doesn't initialize heavy ML models at startup
"""
import os
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from typing import Dict, Any

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global variable to store the document processor (lazy loaded)
document_processor = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager - no heavy initialization at startup"""
    logger.info("🚀 Starting NeoVision IDP Backend (Lazy Loading Mode)")
    logger.info("📝 Heavy ML models will be loaded on first use")
    yield
    logger.info("🛑 Shutting down NeoVision IDP Backend")

# Create FastAPI app
app = FastAPI(
    title="NeoVision IDP API",
    description="Intelligent Document Processing API with lazy loading",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_document_processor():
    """Lazy load the document processor only when needed"""
    global document_processor
    if document_processor is None:
        try:
            logger.info("🔄 Loading document processor (first use)...")
            from models.document_processor import DocumentProcessor
            document_processor = DocumentProcessor()
            logger.info("✅ Document processor loaded successfully")
        except Exception as e:
            logger.error(f"❌ Failed to load document processor: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to initialize document processor: {str(e)}")
    return document_processor

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "NeoVision IDP API",
        "status": "running",
        "mode": "lazy_loading",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check() -> Dict[str, Any]:
    """Health check endpoint"""
    return {
        "status": "healthy",
        "message": "NeoVision IDP Backend is running",
        "mode": "lazy_loading",
        "models_loaded": document_processor is not None
    }

@app.get("/models/status")
async def models_status():
    """Check if models are loaded"""
    return {
        "document_processor_loaded": document_processor is not None,
        "status": "ready" if document_processor else "loading_on_demand"
    }

@app.post("/process/document")
async def process_document(file_data: Dict[str, Any]):
    """Process a document (lazy loads models on first use)"""
    try:
        processor = get_document_processor()
        # Add your document processing logic here
        return {
            "message": "Document processing endpoint",
            "models_loaded": True,
            "status": "ready"
        }
    except Exception as e:
        logger.error(f"Document processing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/docs")
async def get_docs():
    """API documentation"""
    return {
        "message": "API documentation available at /docs",
        "endpoints": [
            "/",
            "/health",
            "/models/status",
            "/process/document",
            "/docs"
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
