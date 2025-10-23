"""
Browser Fallback Router
API endpoints for intelligent browser automation fallback
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional
import logging

from app.auth import verify_token_optional
from services.browser_fallback_service import browser_fallback_service

router = APIRouter()
logger = logging.getLogger(__name__)

class FallbackRequest(BaseModel):
    task: str
    intent: str
    userContext: Dict[str, Any] = {}  # Accept camelCase from frontend
    userId: str  # Accept camelCase from frontend
    agentId: str  # Accept camelCase from frontend
    organizationId: Optional[str] = None  # Accept camelCase from frontend
    
    # Legacy snake_case support
    user_context: Optional[Dict[str, Any]] = None
    user_id: Optional[str] = None
    agent_id: Optional[str] = None
    organization_id: Optional[str] = None

@router.post("/execute")
async def execute_browser_fallback(
    request: FallbackRequest,
    user_id: str = Depends(verify_token_optional)
):
    """
    Execute task using browser automation fallback
    Used when no API tool is available
    """
    try:
        logger.info(f"🌐 Browser fallback requested: {request.task}")
        logger.info(f"📝 Intent: {request.intent}")
        logger.info(f"👤 User: {request.userId}")
        logger.info(f"🤖 Agent: {request.agentId}")
        
        # Use camelCase fields (primary) with snake_case fallback
        user_context = request.userContext or request.user_context or {}
        user_context['userId'] = request.userId or request.user_id
        user_context['agentId'] = request.agentId or request.agent_id
        user_context['organizationId'] = request.organizationId or request.organization_id
        user_context['intent'] = request.intent
        
        result = await browser_fallback_service.execute_fallback(
            task=request.task,
            user_context=user_context
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Browser fallback failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/search")
async def search_web(
    query: str,
    max_results: int = 10,
    user_id: str = Depends(verify_token_optional)
):
    """Search web using browser automation"""
    try:
        results = await browser_fallback_service.search_web(query, max_results)
        return {"results": results}
    except Exception as e:
        logger.error(f"Web search failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/cleanup")
async def cleanup_browser(user_id: str = Depends(verify_token_optional)):
    """Cleanup browser resources"""
    try:
        await browser_fallback_service.cleanup()
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Cleanup failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


