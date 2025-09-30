"""
MCP (Model Context Protocol) Integration Router
Exposes MCP server functionality for agentic AI integration
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, List, Any, Optional
from pydantic import BaseModel
import logging
from datetime import datetime

from config.database import get_db
from services.mcp_server import mcp_server

logger = logging.getLogger(__name__)
router = APIRouter()

# Pydantic models
class ToolCall(BaseModel):
    tool_name: str
    arguments: Dict[str, Any]

class ResourceRead(BaseModel):
    resource_name: str
    arguments: Optional[Dict[str, Any]] = None

@router.get("/mcp/tools")
async def list_mcp_tools() -> Dict[str, Any]:
    """List available MCP tools"""
    try:
        tools = await mcp_server.list_tools()
        
        return {
            "status": "success",
            "tools": tools,
            "count": len(tools),
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error listing MCP tools: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list MCP tools: {str(e)}"
        )

@router.get("/mcp/resources")
async def list_mcp_resources() -> Dict[str, Any]:
    """List available MCP resources"""
    try:
        resources = await mcp_server.list_resources()
        
        return {
            "status": "success",
            "resources": resources,
            "count": len(resources),
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error listing MCP resources: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list MCP resources: {str(e)}"
        )

@router.post("/mcp/tools/call")
async def call_mcp_tool(
    tool_call: ToolCall,
    user_id: str,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Call an MCP tool"""
    try:
        result = await mcp_server.call_tool(
            tool_name=tool_call.tool_name,
            arguments=tool_call.arguments,
            user_id=user_id,
            db=db
        )
        
        return {
            "status": "success",
            "tool": tool_call.tool_name,
            "result": result,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error calling MCP tool: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to call MCP tool: {str(e)}"
        )

@router.post("/mcp/resources/read")
async def read_mcp_resource(
    resource_read: ResourceRead,
    user_id: str,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Read an MCP resource"""
    try:
        result = await mcp_server.read_resource(
            resource_name=resource_read.resource_name,
            arguments=resource_read.arguments or {},
            user_id=user_id,
            db=db
        )
        
        return {
            "status": "success",
            "resource": resource_read.resource_name,
            "data": result,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error reading MCP resource: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to read MCP resource: {str(e)}"
        )

@router.get("/mcp/capabilities")
async def get_mcp_capabilities() -> Dict[str, Any]:
    """Get MCP server capabilities"""
    try:
        tools = await mcp_server.list_tools()
        resources = await mcp_server.list_resources()
        
        return {
            "status": "success",
            "capabilities": {
                "tools": {
                    "count": len(tools),
                    "available": [tool["name"] for tool in tools]
                },
                "resources": {
                    "count": len(resources),
                    "available": [resource["name"] for resource in resources]
                }
            },
            "protocol_version": "2024-11-05",
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting MCP capabilities: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get MCP capabilities: {str(e)}"
        )

@router.post("/mcp/agent/session")
async def create_agent_session(
    agent_config: Dict[str, Any],
    user_id: str,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Create an agent session with MCP access"""
    try:
        session_id = f"agent_session_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        
        # Store agent session configuration
        agent_session = {
            "session_id": session_id,
            "user_id": user_id,
            "agent_config": agent_config,
            "created_at": datetime.utcnow().isoformat(),
            "status": "active"
        }
        
        # In a real implementation, this would be stored in the database
        if not hasattr(create_agent_session, 'sessions'):
            create_agent_session.sessions = {}
        create_agent_session.sessions[session_id] = agent_session
        
        return {
            "status": "success",
            "session_id": session_id,
            "agent_config": agent_config,
            "mcp_access": {
                "tools_available": len(await mcp_server.list_tools()),
                "resources_available": len(await mcp_server.list_resources())
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error creating agent session: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create agent session: {str(e)}"
        )

@router.post("/mcp/agent/execute")
async def execute_agent_task(
    session_id: str,
    task_description: str,
    user_id: str,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Execute an agent task using MCP tools and resources"""
    try:
        # Get agent session
        if not hasattr(create_agent_session, 'sessions'):
            raise HTTPException(status_code=404, detail="No agent sessions found")
        
        session = create_agent_session.sessions.get(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Agent session not found")
        
        # This is a simplified agent execution
        # In a real implementation, this would use the AI agent to:
        # 1. Understand the task
        # 2. Plan which tools/resources to use
        # 3. Execute the plan
        # 4. Return results
        
        # For now, we'll demonstrate with a simple document search
        if "search" in task_description.lower() and "document" in task_description.lower():
            # Use the search_documents tool
            result = await mcp_server.call_tool(
                tool_name="search_documents",
                arguments={"query": task_description, "limit": 5},
                user_id=user_id,
                db=db
            )
            
            return {
                "status": "success",
                "session_id": session_id,
                "task": task_description,
                "execution_result": result,
                "timestamp": datetime.utcnow().isoformat()
            }
        
        # Default response for other tasks
        return {
            "status": "success",
            "session_id": session_id,
            "task": task_description,
            "message": "Task received and queued for execution",
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error executing agent task: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to execute agent task: {str(e)}"
        )
