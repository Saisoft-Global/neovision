from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.auth import verify_token
from app.schemas import Agent, AgentCreate, AgentUpdate
from services.agent_service import AgentService

router = APIRouter()
agent_service = AgentService()

@router.get("/", response_model=List[Agent])
async def get_agents(user_id: str = Depends(verify_token)):
    """Get all available agents"""
    return await agent_service.get_agents()

@router.post("/", response_model=Agent)
async def create_agent(agent: AgentCreate, user_id: str = Depends(verify_token)):
    """Create a new agent"""
    return await agent_service.create_agent(agent)

@router.get("/{agent_id}", response_model=Agent)
async def get_agent(agent_id: str, user_id: str = Depends(verify_token)):
    """Get agent by ID"""
    agent = await agent_service.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent

@router.put("/{agent_id}", response_model=Agent)
async def update_agent(
    agent_id: str, 
    agent_update: AgentUpdate, 
    user_id: str = Depends(verify_token)
):
    """Update an agent"""
    agent = await agent_service.update_agent(agent_id, agent_update)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent

@router.delete("/{agent_id}")
async def delete_agent(agent_id: str, user_id: str = Depends(verify_token)):
    """Delete an agent"""
    success = await agent_service.delete_agent(agent_id)
    if not success:
        raise HTTPException(status_code=404, detail="Agent not found")
    return {"status": "success"}