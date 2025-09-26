import sys
import pkg_resources
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def verify_environment():
    """Verify Python environment and dependencies."""
    try:
        # Check Python version
        logger.info(f"Python version: {sys.version}")
        
        # Required packages
        required_packages = [
            'fastapi',
            'uvicorn',
            'python-multipart',
            'pydantic',
            'opencv-python',
            'pytesseract',
            'numpy',
            'Pillow',
            'PyMuPDF',
            'spacy',
            'transformers',
            'torch'
        ]
        
        # Check installed packages
        logger.info("Checking installed packages...")
        for package in required_packages:
            try:
                version = pkg_resources.get_distribution(package).version
                logger.info(f"{package} version: {version}")
            except pkg_resources.DistributionNotFound:
                logger.error(f"{package} is not installed")
        
        # Check spaCy model
        try:
            import spacy
            nlp = spacy.load("en_core_web_sm")
            logger.info("spaCy model 'en_core_web_sm' loaded successfully")
        except Exception as e:
            logger.error(f"Error loading spaCy model: {str(e)}")
        
        # Check Tesseract
        try:
            import pytesseract
            version = pytesseract.get_tesseract_version()
            logger.info(f"Tesseract version: {version}")
        except Exception as e:
            logger.error(f"Error checking Tesseract: {str(e)}")
        
        logger.info("Environment verification completed")
        return True
        
    except Exception as e:
        logger.error(f"Error verifying environment: {str(e)}")
        return False

if __name__ == "__main__":
    verify_environment() 