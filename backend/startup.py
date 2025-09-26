#!/usr/bin/env python3
"""
Startup script for NeoVision IDP
Downloads essential models if they don't exist
"""
import os
import sys
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def download_essential_models():
    """Download essential models for IDP functionality"""
    try:
        logger.info("Checking for essential models...")
        
        # Check if models directory exists
        models_dir = Path("models")
        models_dir.mkdir(exist_ok=True)
        
        # Check if we need to download models
        if not (models_dir / "layout").exists():
            logger.info("Downloading LayoutLMv3 model...")
            from transformers import AutoProcessor, AutoModelForTokenClassification
            
            model_name = "microsoft/layoutlmv3-base"
            processor = AutoProcessor.from_pretrained(model_name)
            model = AutoModelForTokenClassification.from_pretrained(
                model_name,
                num_labels=10,
                ignore_mismatched_sizes=True
            )
            
            layout_dir = models_dir / "layout"
            layout_dir.mkdir(exist_ok=True)
            
            processor.save_pretrained(layout_dir / "layoutlmv3-processor")
            model.save_pretrained(layout_dir / "layoutlmv3-model")
            
            logger.info("LayoutLMv3 model downloaded successfully")
        
        logger.info("Essential models check completed")
        return True
        
    except Exception as e:
        logger.warning(f"Model download failed: {e}")
        logger.info("Continuing without pre-downloaded models...")
        return False

def main():
    """Main startup function"""
    logger.info("🚀 Starting NeoVision IDP...")
    
    # Download models if needed
    download_essential_models()
    
    # Start the FastAPI application
    import uvicorn
    from main import app
    
    logger.info("Starting FastAPI server...")
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        workers=1,
        log_level="info"
    )

if __name__ == "__main__":
    main()
