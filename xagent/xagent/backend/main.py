from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.auth import verify_token
from app.database import Base, engine
from routers import agents, knowledge
from dotenv import load_dotenv
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

app = FastAPI(title="Multi-Agent Platform API")

# Initialize database
try:
    Base.metadata.create_all(bind=engine)
    logger.info("Database initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize database: {e}")
    # Continue anyway for development

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # React dev server
        "https://xagent-frontend.onrender.com",  # Production frontend
        "https://*.onrender.com",  # Render domains
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(agents.router, prefix="/api/agents", tags=["agents"])
app.include_router(knowledge.router, prefix="/api/knowledge", tags=["knowledge"])
# app.include_router(workflows.router, prefix="/api/workflows", tags=["workflows"])  # TODO: Add workflows router

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/api/config")
async def get_config(user_id: str = Depends(verify_token)):
    """Get configuration for external services"""
    try:
        return {
            "neo4j": {
                "enabled": bool(os.getenv("NEO4J_URI")),
                "uri": os.getenv("NEO4J_URI"),
            },
            "pinecone": {
                "enabled": bool(os.getenv("PINECONE_API_KEY")),
                "environment": os.getenv("PINECONE_ENVIRONMENT"),
                "index": os.getenv("PINECONE_INDEX_NAME"),
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))