import os
import torch
from transformers import (
    LayoutLMv3Processor, 
    LayoutLMv3ForTokenClassification
)
import spacy
from pathlib import Path
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def ensure_dir(path):
    """Create directory if it doesn't exist"""
    path = Path(path)
    if not path.exists():
        path.mkdir(parents=True)
        logger.info(f"Created directory: {path}")

def download_models():
    """Download and save models locally"""
    try:
        logger.info("Starting model download process...")
        
        # Create model directories
        model_dirs = {
            'base': Path('./models'),
            'layout': Path('./models/layout'),
            'spacy': Path('./models/spacy')
        }
        
        for name, dir_path in model_dirs.items():
            ensure_dir(dir_path)
        
        # Check if GPU is available
        use_gpu = torch.cuda.is_available() and os.getenv('CUDA_VISIBLE_DEVICES') != '-1'
        device = "cuda" if use_gpu else "cpu"
        logger.info(f"Using device: {device}")
        
        # Download LayoutLMv3 model
        logger.info("Downloading LayoutLMv3 model...")
        layout_model_name = "microsoft/layoutlmv3-base"
        layout_processor = LayoutLMv3Processor.from_pretrained(
            layout_model_name,
            cache_dir=model_dirs['layout']
        )
        layout_model = LayoutLMv3ForTokenClassification.from_pretrained(
            layout_model_name,
            cache_dir=model_dirs['layout']
        )
        
        # Download spaCy model
        logger.info("Downloading spaCy model...")
        spacy.cli.download("en_core_web_sm")
        
        if use_gpu:
            layout_model = layout_model.to(device)
        
        # Save models
        logger.info(f"Saving LayoutLMv3 model to {model_dirs['layout']}")
        layout_processor.save_pretrained(model_dirs['layout'])
        layout_model.save_pretrained(model_dirs['layout'])
        
        logger.info("All models downloaded and saved successfully!")
        
    except Exception as e:
        logger.error(f"Error downloading models: {str(e)}")
        raise

if __name__ == "__main__":
    download_models()