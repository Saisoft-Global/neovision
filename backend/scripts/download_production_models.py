#!/usr/bin/env python3
"""
Download essential models for production deployment
"""
import os
import sys
import logging
from pathlib import Path
from transformers import AutoProcessor, AutoModelForTokenClassification
import torch

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def download_layoutlmv3_model():
    """Download LayoutLMv3 model for document understanding"""
    try:
        logger.info("Downloading LayoutLMv3 model...")
        model_name = "microsoft/layoutlmv3-base"
        
        # Download processor and model
        processor = AutoProcessor.from_pretrained(model_name)
        model = AutoModelForTokenClassification.from_pretrained(
            model_name,
            num_labels=10,  # Adjust based on your use case
            ignore_mismatched_sizes=True
        )
        
        # Save to models directory
        model_dir = Path("models/layout")
        model_dir.mkdir(parents=True, exist_ok=True)
        
        processor.save_pretrained(model_dir / "layoutlmv3-processor")
        model.save_pretrained(model_dir / "layoutlmv3-model")
        
        logger.info(f"LayoutLMv3 model saved to {model_dir}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to download LayoutLMv3 model: {e}")
        return False

def download_donut_model():
    """Download Donut model for document understanding"""
    try:
        logger.info("Downloading Donut model...")
        from transformers import DonutProcessor, VisionEncoderDecoderModel
        
        model_name = "naver-clova-ix/donut-base-finetuned-cord-v2"
        
        processor = DonutProcessor.from_pretrained(model_name)
        model = VisionEncoderDecoderModel.from_pretrained(model_name)
        
        # Save to models directory
        model_dir = Path("models/trained")
        model_dir.mkdir(parents=True, exist_ok=True)
        
        processor.save_pretrained(model_dir / "donut-processor")
        model.save_pretrained(model_dir / "donut-model")
        
        logger.info(f"Donut model saved to {model_dir}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to download Donut model: {e}")
        return False

def main():
    """Download all essential models"""
    logger.info("Starting model download for production deployment...")
    
    # Create models directory
    Path("models").mkdir(exist_ok=True)
    Path("models/trained").mkdir(exist_ok=True)
    Path("models/layout").mkdir(exist_ok=True)
    Path("models/spacy").mkdir(exist_ok=True)
    
    success_count = 0
    total_models = 2
    
    # Download models
    if download_layoutlmv3_model():
        success_count += 1
    
    if download_donut_model():
        success_count += 1
    
    logger.info(f"Successfully downloaded {success_count}/{total_models} models")
    
    if success_count == total_models:
        logger.info("All models downloaded successfully!")
        return 0
    else:
        logger.warning("Some models failed to download")
        return 1

if __name__ == "__main__":
    sys.exit(main())
