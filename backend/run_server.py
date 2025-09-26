import uvicorn
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

if __name__ == "__main__":
    logger.info("Starting Document Processing API server...")
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)