"""
Default Agent Router - Ensures default agent exists for all users
Uses Supabase directly
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
from datetime import datetime
import logging
import os
from supabase import create_client, Client

from app.auth import verify_token_optional

router = APIRouter()
logger = logging.getLogger(__name__)

# Stable UUID for default agent (generated once, never changes)
DEFAULT_AGENT_ID = "00000000-0000-4000-8000-000000000001"
DEFAULT_AGENT_SLUG = "general_assistant"

# Initialize Supabase client
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL") or os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_ANON_KEY") or os.getenv("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    logger.warning("⚠️ Supabase credentials not configured for default agent")
    supabase: Client | None = None
else:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

@router.get("/ensure")
async def ensure_default_agent(user_id: str = Depends(verify_token_optional)):
    """
    Ensure default agent exists in Supabase and return its UUID.
    Idempotent - safe to call multiple times.
    """
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    try:
        # Check if default agent already exists
        result = supabase.table("agents").select("id, name, type").eq("id", DEFAULT_AGENT_ID).execute()
        
        if result.data and len(result.data) > 0:
            logger.info(f"✅ Default agent already exists: {DEFAULT_AGENT_ID}")
            return {
                "id": DEFAULT_AGENT_ID,
                "slug": DEFAULT_AGENT_SLUG,
                "name": "General AI Assistant",
                "type": "direct_execution",
                "existed": True
            }
        
        # Create default agent in Supabase
        now = datetime.utcnow().isoformat()
        
        # Insert main agent record
        agent_data = {
            "id": DEFAULT_AGENT_ID,
            "name": "General AI Assistant",
            "type": "direct_execution",
            "description": "A helpful general-purpose assistant with real action capability for all users",
            "status": "active",
            "created_by": "06cb0260-217e-4eff-b80a-7844cce8b8e2",  # System/first user
            "organization_id": "21fcd301-2aa4-4600-a8f8-7f95263f550b",  # XAgent Workspace
            "visibility": "organization",
            "shared_with": [],
            "created_at": now,
            "updated_at": now
        }
        
        supabase.table("agents").insert(agent_data).execute()
        
        # Insert personality traits
        personality_traits = [
            {"agent_id": DEFAULT_AGENT_ID, "trait_name": "friendliness", "trait_value": 0.8, "organization_id": "21fcd301-2aa4-4600-a8f8-7f95263f550b"},
            {"agent_id": DEFAULT_AGENT_ID, "trait_name": "formality", "trait_value": 0.5, "organization_id": "21fcd301-2aa4-4600-a8f8-7f95263f550b"},
            {"agent_id": DEFAULT_AGENT_ID, "trait_name": "proactiveness", "trait_value": 0.7, "organization_id": "21fcd301-2aa4-4600-a8f8-7f95263f550b"},
            {"agent_id": DEFAULT_AGENT_ID, "trait_name": "detail_orientation", "trait_value": 0.7, "organization_id": "21fcd301-2aa4-4600-a8f8-7f95263f550b"}
        ]
        
        supabase.table("agent_personality_traits").insert(personality_traits).execute()
        
        # Insert core skills
        core_skills = [
            {"agent_id": DEFAULT_AGENT_ID, "skill_name": "natural_language_understanding", "skill_level": 5, "config": {}, "organization_id": "21fcd301-2aa4-4600-a8f8-7f95263f550b"},
            {"agent_id": DEFAULT_AGENT_ID, "skill_name": "natural_language_generation", "skill_level": 5, "config": {}, "organization_id": "21fcd301-2aa4-4600-a8f8-7f95263f550b"},
            {"agent_id": DEFAULT_AGENT_ID, "skill_name": "task_comprehension", "skill_level": 5, "config": {}, "organization_id": "21fcd301-2aa4-4600-a8f8-7f95263f550b"},
            {"agent_id": DEFAULT_AGENT_ID, "skill_name": "reasoning", "skill_level": 4, "config": {}, "organization_id": "21fcd301-2aa4-4600-a8f8-7f95263f550b"},
            {"agent_id": DEFAULT_AGENT_ID, "skill_name": "context_retention", "skill_level": 4, "config": {}, "organization_id": "21fcd301-2aa4-4600-a8f8-7f95263f550b"}
        ]
        
        supabase.table("agent_skills").insert(core_skills).execute()
        
        logger.info(f"✅ Created default agent in Supabase: {DEFAULT_AGENT_ID}")
        
        return {
            "id": DEFAULT_AGENT_ID,
            "slug": DEFAULT_AGENT_SLUG,
            "name": "General AI Assistant",
            "type": "direct_execution",
            "existed": False
        }
        
    except Exception as e:
        logger.error(f"Failed to ensure default agent: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/default")
async def get_default_agent(user_id: str = Depends(verify_token_optional)):
    """
    Get default agent details (for frontend to auto-select)
    """
    return {
        "id": DEFAULT_AGENT_ID,
        "slug": DEFAULT_AGENT_SLUG,
        "name": "General AI Assistant",
        "type": "direct_execution",
        "description": "A helpful general-purpose assistant with real action capability",
        "expertise": ["general", "research", "productivity"],
        "isAvailable": True,
        "personality": {
            "friendliness": 0.8,
            "formality": 0.5,
            "proactiveness": 0.7,
            "detail_orientation": 0.7
        }
    }

