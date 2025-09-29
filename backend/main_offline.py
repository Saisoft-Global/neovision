"""
Offline version of main.py that doesn't require internet connectivity
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

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager - offline mode"""
    logger.info("🚀 Starting NeoVision IDP Backend (Offline Mode)")
    logger.info("📝 No internet connectivity required")
    yield
    logger.info("🛑 Shutting down NeoVision IDP Backend")

# Create FastAPI app
app = FastAPI(
    title="NeoVision IDP API (Offline)",
    description="Intelligent Document Processing API - Offline Mode",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "NeoVision IDP API (Offline Mode)",
        "status": "running",
        "mode": "offline",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check() -> Dict[str, Any]:
    """Health check endpoint"""
    return {
        "status": "healthy",
        "message": "NeoVision IDP Backend is running in offline mode",
        "mode": "offline",
        "network": "disconnected"
    }

@app.post("/process/document")
async def process_document(file_data: Dict[str, Any]):
    """Process a document (offline mode - basic processing only)"""
    try:
        # Basic document processing without ML models
        return {
            "message": "Document processing in offline mode",
            "status": "processed",
            "mode": "offline",
            "note": "Limited functionality - no ML models available"
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
            "/process/document",
            "/docs"
        ],
        "mode": "offline"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
