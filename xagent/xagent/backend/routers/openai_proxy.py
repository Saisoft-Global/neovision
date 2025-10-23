"""
OpenAI Proxy Router - Handles OpenAI API calls to avoid CORS
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

OPENAI_API_KEY = os.getenv("VITE_OPENAI_API_KEY") or os.getenv("OPENAI_API_KEY")
OPENAI_BASE_URL = "https://api.openai.com/v1"

# Debug log
if OPENAI_API_KEY:
    logger.info(f"✅ OpenAI API key loaded: {OPENAI_API_KEY[:20]}...")
else:
    logger.warning("⚠️ OpenAI API key NOT loaded from environment variables")

class ChatCompletionRequest(BaseModel):
    model: str
    messages: List[Dict[str, str]]
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = None
    stream: Optional[bool] = False

class EmbeddingRequest(BaseModel):
    input: str | List[str]
    model: str = "text-embedding-ada-002"

@router.post("/chat/completions")
async def create_chat_completion(
    request: ChatCompletionRequest,
    user_id: str = Depends(verify_token_optional)
):
    """Proxy OpenAI chat completions to avoid CORS"""
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{OPENAI_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=request.dict(),
                timeout=60.0
            )
            
            if response.status_code != 200:
                logger.error(f"OpenAI API error: {response.status_code} {response.text}")
                raise HTTPException(status_code=response.status_code, detail=response.text)
            
            return response.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="OpenAI API timeout")
    except Exception as e:
        logger.error(f"OpenAI proxy error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/embeddings")
async def create_embeddings(
    request: EmbeddingRequest,
    user_id: str = Depends(verify_token_optional)
):
    """Proxy OpenAI embeddings to avoid CORS with retries/backoff"""
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")

    # Basic validation to avoid empty inputs causing 500s downstream
    if (isinstance(request.input, str) and not request.input.strip()) or \
       (isinstance(request.input, list) and len(request.input) == 0):
        raise HTTPException(status_code=400, detail="Embedding input cannot be empty")

    max_attempts = 3
    backoffs = [0.5, 1.5, 3.0]

    try:
        async with httpx.AsyncClient() as client:
            last_error_text = None
            for attempt in range(1, max_attempts + 1):
                try:
                    response = await client.post(
                        f"{OPENAI_BASE_URL}/embeddings",
                        headers={
                            "Authorization": f"Bearer {OPENAI_API_KEY}",
                            "Content-Type": "application/json",
                        },
                        json=request.dict(),
                        timeout=45.0  # allow a bit longer to reduce 504s
                    )

                    if response.status_code == 200:
                        return response.json()

                    # Transient errors -> retry
                    if response.status_code in (429, 500, 502, 503, 504):
                        last_error_text = response.text
                        logger.warning(
                            f"OpenAI embeddings transient error (attempt {attempt}/{max_attempts}): "
                            f"{response.status_code} {response.text[:200]}"
                        )
                        if attempt < max_attempts:
                            await _async_sleep(backoffs[attempt - 1])
                            continue
                    # Non-retryable
                    logger.error(f"OpenAI embeddings error: {response.status_code} {response.text}")
                    raise HTTPException(status_code=response.status_code, detail=response.text)

                except httpx.TimeoutException:
                    logger.warning(f"OpenAI embeddings timeout (attempt {attempt}/{max_attempts})")
                    if attempt < max_attempts:
                        await _async_sleep(backoffs[attempt - 1])
                        continue
                    raise HTTPException(status_code=504, detail="OpenAI API timeout")

            # If we exhaust retries with transient errors
            raise HTTPException(status_code=502, detail=last_error_text or "Upstream error")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OpenAI embeddings error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Simple async sleep without importing asyncio at top-level to keep file tidy
async def _async_sleep(seconds: float):
    import asyncio
    await asyncio.sleep(seconds)

@router.get("/models")
async def list_models(user_id: str = Depends(verify_token_optional)):
    """List available OpenAI models"""
    if not OPENAI_API_KEY:
        return {"models": []}
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{OPENAI_BASE_URL}/models",
                headers={
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
                },
                timeout=10.0
            )
            
            if response.status_code == 200:
                return response.json()
            return {"models": []}
    except Exception as e:
        logger.error(f"Failed to list models: {e}")
        return {"models": []}


