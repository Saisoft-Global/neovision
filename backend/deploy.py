#!/usr/bin/env python3
"""
Deployment script for IDP Backend
Handles production setup and initialization
"""

import os
import sys
import logging
import subprocess
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def create_directories():
    """Create necessary directories for production"""
    directories = [
        "models/trained",
        "models/layout", 
        "models/spacy",
        "uploads",
        "temp",
        "logs",
        "static"
    ]
    
    for directory in directories:
        Path(directory).mkdir(parents=True, exist_ok=True)
        logger.info(f"Created directory: {directory}")

def download_spacy_model():
    """Download spaCy English model"""
    try:
        logger.info("Downloading spaCy English model...")
        subprocess.run([
            sys.executable, "-m", "spacy", "download", "en_core_web_sm"
        ], check=True)
        logger.info("spaCy model downloaded successfully")
    except subprocess.CalledProcessError as e:
        logger.error(f"Failed to download spaCy model: {e}")
        # Continue without spaCy model - it will be downloaded on first use

def setup_environment():
    """Set up production environment"""
    logger.info("Setting up production environment...")
    
    # Set environment variables
    os.environ.setdefault("ENVIRONMENT", "production")
    os.environ.setdefault("LOG_LEVEL", "INFO")
    os.environ.setdefault("PYTHONPATH", "/app")
    
    # Check if we're in a virtual environment
    if hasattr(sys, 'real_prefix') or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix):
        logger.info("Running in virtual environment")
    else:
        logger.info("Running in system Python environment")
    
    # Create directories
    create_directories()
    
    # Download spaCy model
    download_spacy_model()
    
    logger.info("Production environment setup complete")

def check_dependencies():
    """Check if all required dependencies are installed"""
    required_packages = [
        "fastapi",
        "uvicorn", 
        "torch",
        "transformers",
        "paddleocr",
        "spacy"
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package)
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        logger.error(f"Missing required packages: {missing_packages}")
        return False
    
    logger.info("All required dependencies are installed")
    return True

def main():
    """Main deployment function"""
    logger.info("Starting IDP Backend deployment...")
    
    # Check dependencies
    if not check_dependencies():
        logger.error("Dependency check failed")
        sys.exit(1)
    
    # Setup environment
    setup_environment()
    
    logger.info("Deployment setup complete!")
    logger.info("Starting FastAPI application...")

if __name__ == "__main__":
    main()
