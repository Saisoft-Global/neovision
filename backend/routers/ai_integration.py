"""
AI Integration Router for generative AI capabilities
Integrates with the AI Agent API for chat, knowledge base, and vectorization
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Dict, List, Any, Optional
from pydantic import BaseModel
import logging
from datetime import datetime

from config.database import get_db
from config.ai_config import get_ai_config
from services.ai_agent_client import AIAgentClient
from models.database import Document, DocumentExtraction

logger = logging.getLogger(__name__)
router = APIRouter()

# Pydantic models
class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None
    document_context: Optional[Dict[str, Any]] = None

class ChatResponse(BaseModel):
    response: str
    session_id: str
    timestamp: str
    context: Optional[Dict[str, Any]] = None

class KnowledgeBaseSearch(BaseModel):
    query: str
    filters: Optional[Dict[str, Any]] = None
    limit: int = 10

class DocumentInsights(BaseModel):
    document_id: str
    insight_types: Optional[List[str]] = None

class AgentTask(BaseModel):
    task_type: str
    parameters: Dict[str, Any]
    context: Optional[Dict[str, Any]] = None

@router.post("/chat/start", response_model=Dict[str, Any])
async def start_chat_session(
    user_id: str,
    context: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Start a new AI chat session"""
    try:
        # Check if AI chat is enabled
        config = get_ai_config()
        if not config.enable_ai_chat:
            raise HTTPException(
                status_code=503,
                detail="AI chat functionality is disabled"
            )
        
        async with AIAgentClient() as client:
            session_id = await client.start_chat_session(user_id, context)
            
            return {
                "status": "success",
                "session_id": session_id,
                "message": "Chat session started successfully",
                "timestamp": datetime.utcnow().isoformat(),
                "config": {
                    "base_url": config.ai_agent_base_url,
                    "session_timeout": config.chat_session_timeout
                }
            }
            
    except Exception as e:
        logger.error(f"Error starting chat session: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start chat session: {str(e)}"
        )

@router.post("/chat/message", response_model=ChatResponse)
async def send_chat_message(
    message_data: ChatMessage,
    user_id: str
) -> ChatResponse:
    """Send a message to the AI agent"""
    try:
        async with AIAgentClient() as client:
            # If no session_id provided, start a new session
            if not message_data.session_id:
                message_data.session_id = await client.start_chat_session(user_id)
            
            response = await client.send_message(
                message=message_data.message,
                session_id=message_data.session_id,
                document_context=message_data.document_context
            )
            
            return ChatResponse(
                response=response.get("response", ""),
                session_id=message_data.session_id,
                timestamp=response.get("timestamp", datetime.utcnow().isoformat()),
                context=response.get("context")
            )
            
    except Exception as e:
        logger.error(f"Error sending chat message: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send message: {str(e)}"
        )

@router.get("/chat/history/{session_id}")
async def get_chat_history(
    session_id: str,
    limit: int = 50
) -> Dict[str, Any]:
    """Get chat history for a session"""
    try:
        async with AIAgentClient() as client:
            messages = await client.get_chat_history(session_id, limit)
            
            return {
                "status": "success",
                "session_id": session_id,
                "messages": messages,
                "count": len(messages)
            }
            
    except Exception as e:
        logger.error(f"Error getting chat history: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get chat history: {str(e)}"
        )

@router.post("/knowledge/vectorize")
async def vectorize_document(
    document_id: str,
    content: str,
    metadata: Optional[Dict[str, Any]] = None,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Vectorize a document for knowledge base"""
    try:
        # Get document from database
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise HTTPException(
                status_code=404,
                detail="Document not found"
            )
        
        async with AIAgentClient() as client:
            result = await client.vectorize_document(
                document_id=document_id,
                content=content,
                metadata=metadata
            )
            
            return {
                "status": "success",
                "document_id": document_id,
                "vector_id": result.get("vector_id"),
                "message": "Document vectorized successfully"
            }
            
    except Exception as e:
        logger.error(f"Error vectorizing document: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to vectorize document: {str(e)}"
        )

@router.post("/knowledge/search")
async def search_knowledge_base(
    search_data: KnowledgeBaseSearch
) -> Dict[str, Any]:
    """Search the knowledge base using vector similarity"""
    try:
        async with AIAgentClient() as client:
            results = await client.search_knowledge_base(
                query=search_data.query,
                filters=search_data.filters,
                limit=search_data.limit
            )
            
            return {
                "status": "success",
                "query": search_data.query,
                "results": results,
                "count": len(results)
            }
            
    except Exception as e:
        logger.error(f"Error searching knowledge base: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to search knowledge base: {str(e)}"
        )

@router.post("/knowledge/add")
async def add_to_knowledge_base(
    document_id: str,
    title: str,
    content: str,
    category: str = "general",
    tags: Optional[List[str]] = None,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Add document to knowledge base"""
    try:
        # Verify document exists
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise HTTPException(
                status_code=404,
                detail="Document not found"
            )
        
        async with AIAgentClient() as client:
            result = await client.add_to_knowledge_base(
                document_id=document_id,
                title=title,
                content=content,
                category=category,
                tags=tags
            )
            
            return {
                "status": "success",
                "document_id": document_id,
                "knowledge_id": result.get("knowledge_id"),
                "message": "Document added to knowledge base successfully"
            }
            
    except Exception as e:
        logger.error(f"Error adding to knowledge base: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to add to knowledge base: {str(e)}"
        )

@router.post("/document/insights")
async def get_document_insights(
    insights_data: DocumentInsights,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get AI-generated insights for a document"""
    try:
        # Get document and latest extraction
        document = db.query(Document).filter(Document.id == insights_data.document_id).first()
        if not document:
            raise HTTPException(
                status_code=404,
                detail="Document not found"
            )
        
        latest_extraction = db.query(DocumentExtraction).filter(
            DocumentExtraction.document_id == document.id
        ).order_by(DocumentExtraction.created_at.desc()).first()
        
        # Prepare document context
        document_context = {
            "document_id": str(document.id),
            "filename": document.original_filename,
            "extracted_fields": latest_extraction.fields_json if latest_extraction else {},
            "document_type": document.file_type
        }
        
        async with AIAgentClient() as client:
            insights = await client.get_document_insights(
                document_id=insights_data.document_id,
                insight_types=insights_data.insight_types
            )
            
            return {
                "status": "success",
                "document_id": insights_data.document_id,
                "insights": insights,
                "timestamp": datetime.utcnow().isoformat()
            }
            
    except Exception as e:
        logger.error(f"Error getting document insights: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get document insights: {str(e)}"
        )

@router.get("/agent/capabilities")
async def get_agent_capabilities() -> Dict[str, Any]:
    """Get available AI agent capabilities"""
    try:
        async with AIAgentClient() as client:
            capabilities = await client.get_agent_capabilities()
            
            return {
                "status": "success",
                "capabilities": capabilities,
                "timestamp": datetime.utcnow().isoformat()
            }
            
    except Exception as e:
        logger.error(f"Error getting agent capabilities: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get agent capabilities: {str(e)}"
        )

@router.post("/agent/execute")
async def execute_agent_task(
    task_data: AgentTask,
    user_id: str
) -> Dict[str, Any]:
    """Execute a specific AI agent task"""
    try:
        async with AIAgentClient() as client:
            result = await client.execute_agent_task(
                task_type=task_data.task_type,
                parameters=task_data.parameters,
                context=task_data.context
            )
            
            return {
                "status": "success",
                "task_type": task_data.task_type,
                "result": result,
                "timestamp": datetime.utcnow().isoformat()
            }
            
    except Exception as e:
        logger.error(f"Error executing agent task: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to execute agent task: {str(e)}"
        )

@router.post("/workflow/ai-enhanced")
async def create_ai_enhanced_workflow(
    workflow_name: str,
    ai_tasks: List[Dict[str, Any]],
    user_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Create a workflow enhanced with AI capabilities"""
    try:
        # This would integrate with the existing workflow system
        # but add AI-powered steps
        
        workflow_id = f"ai_workflow_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        
        # Store AI workflow configuration
        ai_workflow_config = {
            "workflow_id": workflow_id,
            "name": workflow_name,
            "ai_tasks": ai_tasks,
            "user_id": user_id,
            "created_at": datetime.utcnow().isoformat()
        }
        
        # In a real implementation, you'd save this to the database
        # For now, we'll use a simple in-memory store
        if not hasattr(create_ai_enhanced_workflow, 'ai_workflows'):
            create_ai_enhanced_workflow.ai_workflows = {}
        create_ai_enhanced_workflow.ai_workflows[workflow_id] = ai_workflow_config
        
        return {
            "status": "success",
            "workflow_id": workflow_id,
            "message": "AI-enhanced workflow created successfully",
            "ai_tasks": ai_tasks
        }
        
    except Exception as e:
        logger.error(f"Error creating AI-enhanced workflow: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create AI-enhanced workflow: {str(e)}"
        )

@router.get("/config")
async def get_ai_configuration() -> Dict[str, Any]:
    """Get current AI configuration"""
    try:
        config = get_ai_config()
        
        return {
            "status": "success",
            "configuration": {
                "ai_agent_base_url": config.ai_agent_base_url,
                "ai_agent_timeout": config.ai_agent_timeout,
                "chat_session_timeout": config.chat_session_timeout,
                "max_chat_history": config.max_chat_history,
                "vector_dimensions": config.vector_dimensions,
                "similarity_threshold": config.similarity_threshold,
                "max_search_results": config.max_search_results,
                "insight_types": config.insight_types,
                "max_insight_length": config.max_insight_length,
                "mcp_enabled": config.mcp_enabled,
                "mcp_port": config.mcp_port,
                "features": {
                    "enable_ai_chat": config.enable_ai_chat,
                    "enable_knowledge_base": config.enable_knowledge_base,
                    "enable_document_insights": config.enable_document_insights,
                    "enable_ai_workflows": config.enable_ai_workflows
                }
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting AI configuration: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get AI configuration: {str(e)}"
        )

@router.post("/config/update")
async def update_ai_configuration(
    updates: Dict[str, Any]
) -> Dict[str, Any]:
    """Update AI configuration"""
    try:
        from config.ai_config import update_ai_config
        
        # Validate updates
        allowed_updates = {
            "ai_agent_base_url", "ai_agent_timeout", "chat_session_timeout",
            "max_chat_history", "vector_dimensions", "similarity_threshold",
            "max_search_results", "insight_types", "max_insight_length",
            "mcp_enabled", "mcp_port", "enable_ai_chat", "enable_knowledge_base",
            "enable_document_insights", "enable_ai_workflows"
        }
        
        filtered_updates = {k: v for k, v in updates.items() if k in allowed_updates}
        
        if not filtered_updates:
            raise HTTPException(
                status_code=400,
                detail="No valid configuration updates provided"
            )
        
        updated_config = update_ai_config(filtered_updates)
        
        return {
            "status": "success",
            "message": "AI configuration updated successfully",
            "updated_fields": list(filtered_updates.keys()),
            "configuration": {
                "ai_agent_base_url": updated_config.ai_agent_base_url,
                "features": {
                    "enable_ai_chat": updated_config.enable_ai_chat,
                    "enable_knowledge_base": updated_config.enable_knowledge_base,
                    "enable_document_insights": updated_config.enable_document_insights,
                    "enable_ai_workflows": updated_config.enable_ai_workflows
                }
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error updating AI configuration: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update AI configuration: {str(e)}"
        )

@router.post("/knowledge/add-document")
async def add_document_to_knowledge_base(
    document_id: str,
    user_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Manually add a document to the AI knowledge base"""
    try:
        # Check if knowledge base integration is enabled
        config = get_ai_config()
        if not config.enable_knowledge_base:
            raise HTTPException(
                status_code=503,
                detail="Knowledge base functionality is disabled"
            )
        
        # Get document from database
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise HTTPException(
                status_code=404,
                detail="Document not found"
            )
        
        # Get document extraction data
        extraction = db.query(DocumentExtraction).filter(
            DocumentExtraction.document_id == document_id
        ).order_by(DocumentExtraction.created_at.desc()).first()
        
        if not extraction:
            raise HTTPException(
                status_code=404,
                detail="Document extraction not found"
            )
        
        # Prepare document data
        document_data = {
            "document_id": str(document.id),
            "user_id": user_id,
            "filename": document.original_filename,
            "extracted_fields": extraction.fields_json or [],
            "processing_result": {
                "confidence": float(extraction.confidence) if extraction.confidence else 0.0,
                "model_name": extraction.model_name or "unknown",
                "pipeline_used": extraction.pipeline_used or {}
            }
        }
        
        # Add to AI knowledge base in background
        background_tasks.add_task(
            add_document_to_ai_kb_task,
            document_data
        )
        
        return {
            "status": "success",
            "message": "Document queued for knowledge base addition",
            "document_id": document_id,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error adding document to knowledge base: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to add document to knowledge base: {str(e)}"
        )

async def add_document_to_ai_kb_task(document_data: Dict[str, Any]):
    """Background task to add document to AI knowledge base"""
    try:
        from services.ai_agent_client import AIAgentClient
        
        async with AIAgentClient() as client:
            # Read document file if available
            content = ""
            if document_data.get("filename"):
                # In a real implementation, you'd read the actual file
                # For now, we'll use the extracted fields as content
                content = str(document_data.get("extracted_fields", []))
            
            # Add to knowledge base
            kb_result = await client.add_to_knowledge_base(
                document_id=document_data["document_id"],
                title=document_data["filename"],
                content=content,
                category="document",
                tags=["neocaptured", "idp"],
                metadata={
                    "user_id": document_data["user_id"],
                    "extracted_fields": document_data["extracted_fields"],
                    "processing_result": document_data["processing_result"]
                }
            )
            
            logger.info(f"Document {document_data['document_id']} added to AI KB: {kb_result}")
            
    except Exception as e:
        logger.error(f"Error in background KB task: {e}", exc_info=True)

@router.get("/health")
async def check_ai_health() -> Dict[str, Any]:
    """Check AI service health"""
    try:
        config = get_ai_config()
        
        # Test AI Agent API connectivity
        async with AIAgentClient() as client:
            try:
                capabilities = await client.get_agent_capabilities()
                ai_agent_status = "healthy"
                ai_agent_message = "AI Agent API is accessible"
            except Exception as e:
                ai_agent_status = "unhealthy"
                ai_agent_message = f"AI Agent API error: {str(e)}"
        
        return {
            "status": "success",
            "health": {
                "ai_agent_api": {
                    "status": ai_agent_status,
                    "message": ai_agent_message,
                    "base_url": config.ai_agent_base_url
                },
                "features": {
                    "ai_chat": "enabled" if config.enable_ai_chat else "disabled",
                    "knowledge_base": "enabled" if config.enable_knowledge_base else "disabled",
                    "document_insights": "enabled" if config.enable_document_insights else "disabled",
                    "ai_workflows": "enabled" if config.enable_ai_workflows else "disabled",
                    "mcp_server": "enabled" if config.mcp_enabled else "disabled"
                }
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error checking AI health: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to check AI health: {str(e)}"
        )
