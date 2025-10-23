from dotenv import load_dotenv
from pathlib import Path
import os
import logging
import sys
import asyncio
import platform

# ✅ CRITICAL: Set Windows event loop policy FIRST (for Playwright)
if platform.system() == 'Windows':
    if sys.version_info >= (3, 8):
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
        print("✅ Set Windows ProactorEventLoop policy for Playwright compatibility")

# ⚠️ CRITICAL: Load environment variables FIRST before any other imports
# This ensures routers and services can access env vars when they're imported
root_dir = Path(__file__).parent.parent
load_dotenv(dotenv_path=root_dir / '.env')  # Load from root
load_dotenv()  # Load from backend directory (overrides if exists)

# Now import everything else after environment is loaded
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.auth import verify_token
from app.database import Base, engine
from routers import agents, knowledge, workflows, automation, health, vectors, openai_proxy, groq_proxy, browser_fallback, default_agent
from middleware.rate_limiter import RateLimitMiddleware

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Log loaded environment variables for debugging
logger.info("🔍 Checking environment variables...")
openai_key = os.getenv("VITE_OPENAI_API_KEY") or os.getenv("OPENAI_API_KEY")
if openai_key:
    logger.info(f"✅ OpenAI API key loaded: {openai_key[:20]}...")
else:
    logger.warning("⚠️ OpenAI API key NOT found in environment")

pinecone_key = os.getenv("VITE_PINECONE_API_KEY") or os.getenv("PINECONE_API_KEY")
if pinecone_key:
    logger.info(f"✅ Pinecone API key loaded: {pinecone_key[:20]}...")
else:
    logger.warning("⚠️ Pinecone API key NOT found in environment")

groq_key = os.getenv("VITE_GROQ_API_KEY") or os.getenv("GROQ_API_KEY")
if groq_key:
    logger.info(f"✅ Groq API key loaded: {groq_key[:20]}...")
else:
    logger.warning("⚠️ Groq API key NOT found in environment")

# Validate critical environment variables
required_env_vars = ["SECRET_KEY"]
missing_vars = [var for var in required_env_vars if not os.getenv(var)]
if missing_vars:
    logger.error(f"Missing required environment variables: {', '.join(missing_vars)}")
    raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")

app = FastAPI(
    title="Multi-Agent Platform API",
    version="1.0.0",
    description="Enterprise Multi-Agent AI Platform with Security",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# Initialize database
try:
    Base.metadata.create_all(bind=engine)
    logger.info("Database initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize database: {e}")
    # Continue anyway for development

# Add rate limiting middleware
app.add_middleware(RateLimitMiddleware)

# Configure CORS with security
allowed_origins = os.getenv("ALLOWED_ORIGINS", "").split(",")
if not allowed_origins or allowed_origins == [""]:
    logger.warning("ALLOWED_ORIGINS not set, using default localhost")
    allowed_origins = [
        "http://localhost:5173",
        "http://localhost:5174",  # Added port 5174 for Vite dev server
        "http://localhost:3000",
        "http://localhost:8080"
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["*"],
    max_age=3600,
)

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An internal error occurred. Please try again later.",
            "request_id": id(request)
        }
    )

# Include routers
app.include_router(health.router, tags=["health"])
app.include_router(agents.router, prefix="/api/agents", tags=["agents"])
app.include_router(knowledge.router, prefix="/api/knowledge", tags=["knowledge"])
app.include_router(workflows.router, prefix="/api/workflows", tags=["workflows"])
app.include_router(automation.router, prefix="/api", tags=["automation"])
app.include_router(vectors.router, prefix="/api/vectors", tags=["vectors"])
app.include_router(openai_proxy.router, prefix="/api/openai", tags=["openai"])
app.include_router(groq_proxy.router, prefix="/api/groq", tags=["groq"])
app.include_router(browser_fallback.router, prefix="/api/browser-fallback", tags=["browser-fallback"])
app.include_router(default_agent.router, prefix="/api/default-agent", tags=["default-agent"])

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