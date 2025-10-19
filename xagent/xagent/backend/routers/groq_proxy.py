"""
Groq Proxy Router - Handles Groq API calls to avoid CORS
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import httpx
import os
import logging

from app.auth import verify_token_optional

router = APIRouter()
logger = logging.getLogger(__name__)

GROQ_API_KEY = os.getenv("VITE_GROQ_API_KEY") or os.getenv("GROQ_API_KEY")
GROQ_BASE_URL = "https://api.groq.com/openai/v1"

# Debug log
if GROQ_API_KEY:
    logger.info(f"✅ Groq API key loaded: {GROQ_API_KEY[:20]}...")
else:
    logger.warning("⚠️ Groq API key NOT loaded from environment variables")

class ChatCompletionRequest(BaseModel):
    model: str
    messages: List[Dict[str, str]]
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = None
    stream: Optional[bool] = False

@router.post("/chat/completions")
async def create_chat_completion(
    request: ChatCompletionRequest,
    user_id: str = Depends(verify_token_optional)
):
    """Proxy Groq chat completions to avoid CORS"""
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="Groq API key not configured")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{GROQ_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=request.dict(),
                timeout=60.0
            )
            
            if response.status_code != 200:
                logger.error(f"Groq API error: {response.status_code} {response.text}")
                raise HTTPException(status_code=response.status_code, detail=response.text)
            
            return response.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Groq API timeout")
    except Exception as e:
        logger.error(f"Groq proxy error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/models")
async def list_models(user_id: str = Depends(verify_token_optional)):
    """List available Groq models"""
    if not GROQ_API_KEY:
        return {"models": []}
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{GROQ_BASE_URL}/models",
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                },
                timeout=10.0
            )
            
            if response.status_code == 200:
                return response.json()
            return {"models": []}
    except Exception as e:
        logger.error(f"Failed to list Groq models: {e}")
        return {"models": []}


