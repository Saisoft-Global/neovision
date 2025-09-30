"""
MCP (Model Context Protocol) Server for agentic AI integration
Provides tools and resources for AI agents to interact with the NeoCaptured IDP system
"""

import asyncio
import json
import logging
from typing import Dict, List, Any, Optional, Union
from datetime import datetime
import uuid
from pathlib import Path

from sqlalchemy.orm import Session
from config.database import get_db
from models.database import Document, DocumentExtraction, Organization, User
from services.ai_agent_client import AIAgentClient

logger = logging.getLogger(__name__)

class MCPServer:
    """MCP Server for agentic AI integration"""
    
    def __init__(self):
        self.tools = {}
        self.resources = {}
        self._register_tools()
        self._register_resources()
    
    def _register_tools(self):
        """Register available tools for AI agents"""
        self.tools = {
            "process_document": {
                "name": "process_document",
                "description": "Process a document using the IDP system",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "document_id": {"type": "string", "description": "ID of the document to process"},
                        "processing_options": {"type": "object", "description": "Processing configuration"}
                    },
                    "required": ["document_id"]
                }
            },
            "search_documents": {
                "name": "search_documents",
                "description": "Search for documents in the system",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "Search query"},
                        "filters": {"type": "object", "description": "Search filters"},
                        "limit": {"type": "integer", "description": "Maximum results"}
                    },
                    "required": ["query"]
                }
            },
            "get_document_insights": {
                "name": "get_document_insights",
                "description": "Get AI-generated insights for a document",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "document_id": {"type": "string", "description": "ID of the document"},
                        "insight_types": {"type": "array", "description": "Types of insights to generate"}
                    },
                    "required": ["document_id"]
                }
            },
            "create_workflow": {
                "name": "create_workflow",
                "description": "Create an automated workflow",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string", "description": "Workflow name"},
                        "trigger": {"type": "object", "description": "Workflow trigger configuration"},
                        "actions": {"type": "array", "description": "Workflow actions"}
                    },
                    "required": ["name", "trigger", "actions"]
                }
            },
            "vectorize_content": {
                "name": "vectorize_content",
                "description": "Vectorize content for knowledge base",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "content": {"type": "string", "description": "Content to vectorize"},
                        "metadata": {"type": "object", "description": "Content metadata"}
                    },
                    "required": ["content"]
                }
            },
            "search_knowledge_base": {
                "name": "search_knowledge_base",
                "description": "Search the knowledge base",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "Search query"},
                        "filters": {"type": "object", "description": "Search filters"}
                    },
                    "required": ["query"]
                }
            },
            "send_notification": {
                "name": "send_notification",
                "description": "Send a notification to users",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "user_id": {"type": "string", "description": "Target user ID"},
                        "message": {"type": "string", "description": "Notification message"},
                        "type": {"type": "string", "description": "Notification type"}
                    },
                    "required": ["user_id", "message"]
                }
            }
        }
    
    def _register_resources(self):
        """Register available resources for AI agents"""
        self.resources = {
            "documents": {
                "name": "documents",
                "description": "Access to document database",
                "type": "database"
            },
            "users": {
                "name": "users", 
                "description": "Access to user database",
                "type": "database"
            },
            "organizations": {
                "name": "organizations",
                "description": "Access to organization database", 
                "type": "database"
            },
            "knowledge_base": {
                "name": "knowledge_base",
                "description": "Access to vectorized knowledge base",
                "type": "vector_store"
            },
            "workflows": {
                "name": "workflows",
                "description": "Access to workflow configurations",
                "type": "configuration"
            }
        }
    
    async def list_tools(self) -> List[Dict[str, Any]]:
        """List available tools"""
        return list(self.tools.values())
    
    async def list_resources(self) -> List[Dict[str, Any]]:
        """List available resources"""
        return list(self.resources.values())
    
    async def call_tool(self, tool_name: str, arguments: Dict[str, Any], 
                       user_id: str, db: Session) -> Dict[str, Any]:
        """Execute a tool"""
        try:
            if tool_name not in self.tools:
                raise ValueError(f"Unknown tool: {tool_name}")
            
            if tool_name == "process_document":
                return await self._process_document(arguments, user_id, db)
            elif tool_name == "search_documents":
                return await self._search_documents(arguments, user_id, db)
            elif tool_name == "get_document_insights":
                return await self._get_document_insights(arguments, user_id, db)
            elif tool_name == "create_workflow":
                return await self._create_workflow(arguments, user_id, db)
            elif tool_name == "vectorize_content":
                return await self._vectorize_content(arguments, user_id, db)
            elif tool_name == "search_knowledge_base":
                return await self._search_knowledge_base(arguments, user_id, db)
            elif tool_name == "send_notification":
                return await self._send_notification(arguments, user_id, db)
            else:
                raise ValueError(f"Tool {tool_name} not implemented")
                
        except Exception as e:
            logger.error(f"Error executing tool {tool_name}: {e}", exc_info=True)
            return {
                "error": str(e),
                "tool": tool_name,
                "status": "failed"
            }
    
    async def _process_document(self, arguments: Dict[str, Any], 
                               user_id: str, db: Session) -> Dict[str, Any]:
        """Process a document"""
        document_id = arguments["document_id"]
        processing_options = arguments.get("processing_options", {})
        
        # Get document
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            return {"error": "Document not found", "status": "failed"}
        
        # Process with AI agent
        async with AIAgentClient() as client:
            insights = await client.get_document_insights(
                document_id=document_id,
                insight_types=["summary", "key_points", "entities"]
            )
        
        return {
            "status": "success",
            "document_id": document_id,
            "insights": insights,
            "processing_options": processing_options
        }
    
    async def _search_documents(self, arguments: Dict[str, Any], 
                               user_id: str, db: Session) -> Dict[str, Any]:
        """Search documents"""
        query = arguments["query"]
        filters = arguments.get("filters", {})
        limit = arguments.get("limit", 10)
        
        # Build search query
        search_query = db.query(Document).filter(Document.user_id == user_id)
        
        if filters.get("file_type"):
            search_query = search_query.filter(Document.file_type == filters["file_type"])
        
        if filters.get("date_from"):
            search_query = search_query.filter(Document.created_at >= filters["date_from"])
        
        documents = search_query.limit(limit).all()
        
        return {
            "status": "success",
            "query": query,
            "results": [
                {
                    "id": str(doc.id),
                    "name": doc.name,
                    "filename": doc.original_filename,
                    "created_at": doc.created_at.isoformat(),
                    "file_type": doc.file_type
                }
                for doc in documents
            ],
            "count": len(documents)
        }
    
    async def _get_document_insights(self, arguments: Dict[str, Any], 
                                    user_id: str, db: Session) -> Dict[str, Any]:
        """Get document insights"""
        document_id = arguments["document_id"]
        insight_types = arguments.get("insight_types", ["summary", "key_points"])
        
        async with AIAgentClient() as client:
            insights = await client.get_document_insights(
                document_id=document_id,
                insight_types=insight_types
            )
        
        return {
            "status": "success",
            "document_id": document_id,
            "insights": insights
        }
    
    async def _create_workflow(self, arguments: Dict[str, Any], 
                              user_id: str, db: Session) -> Dict[str, Any]:
        """Create a workflow"""
        name = arguments["name"]
        trigger = arguments["trigger"]
        actions = arguments["actions"]
        
        # Create workflow ID
        workflow_id = str(uuid.uuid4())
        
        # Store workflow (in a real implementation, this would be in the database)
        workflow_config = {
            "id": workflow_id,
            "name": name,
            "trigger": trigger,
            "actions": actions,
            "user_id": user_id,
            "created_at": datetime.utcnow().isoformat()
        }
        
        return {
            "status": "success",
            "workflow_id": workflow_id,
            "workflow": workflow_config
        }
    
    async def _vectorize_content(self, arguments: Dict[str, Any], 
                                user_id: str, db: Session) -> Dict[str, Any]:
        """Vectorize content"""
        content = arguments["content"]
        metadata = arguments.get("metadata", {})
        
        async with AIAgentClient() as client:
            result = await client.vectorize_document(
                document_id=str(uuid.uuid4()),
                content=content,
                metadata=metadata
            )
        
        return {
            "status": "success",
            "vector_id": result.get("vector_id"),
            "content_length": len(content)
        }
    
    async def _search_knowledge_base(self, arguments: Dict[str, Any], 
                                    user_id: str, db: Session) -> Dict[str, Any]:
        """Search knowledge base"""
        query = arguments["query"]
        filters = arguments.get("filters", {})
        
        async with AIAgentClient() as client:
            results = await client.search_knowledge_base(
                query=query,
                filters=filters,
                limit=10
            )
        
        return {
            "status": "success",
            "query": query,
            "results": results,
            "count": len(results)
        }
    
    async def _send_notification(self, arguments: Dict[str, Any], 
                                user_id: str, db: Session) -> Dict[str, Any]:
        """Send notification"""
        target_user_id = arguments["user_id"]
        message = arguments["message"]
        notification_type = arguments.get("type", "info")
        
        # In a real implementation, this would send actual notifications
        # For now, we'll just log it
        logger.info(f"Notification to {target_user_id}: {message}")
        
        return {
            "status": "success",
            "target_user": target_user_id,
            "message": message,
            "type": notification_type,
            "sent_at": datetime.utcnow().isoformat()
        }
    
    async def read_resource(self, resource_name: str, arguments: Dict[str, Any], 
                           user_id: str, db: Session) -> Dict[str, Any]:
        """Read a resource"""
        try:
            if resource_name not in self.resources:
                raise ValueError(f"Unknown resource: {resource_name}")
            
            if resource_name == "documents":
                return await self._read_documents_resource(arguments, user_id, db)
            elif resource_name == "users":
                return await self._read_users_resource(arguments, user_id, db)
            elif resource_name == "organizations":
                return await self._read_organizations_resource(arguments, user_id, db)
            elif resource_name == "knowledge_base":
                return await self._read_knowledge_base_resource(arguments, user_id, db)
            else:
                raise ValueError(f"Resource {resource_name} not implemented")
                
        except Exception as e:
            logger.error(f"Error reading resource {resource_name}: {e}", exc_info=True)
            return {
                "error": str(e),
                "resource": resource_name,
                "status": "failed"
            }
    
    async def _read_documents_resource(self, arguments: Dict[str, Any], 
                                      user_id: str, db: Session) -> Dict[str, Any]:
        """Read documents resource"""
        limit = arguments.get("limit", 50)
        offset = arguments.get("offset", 0)
        
        documents = db.query(Document).filter(
            Document.user_id == user_id
        ).offset(offset).limit(limit).all()
        
        return {
            "status": "success",
            "resource": "documents",
            "data": [
                {
                    "id": str(doc.id),
                    "name": doc.name,
                    "filename": doc.original_filename,
                    "file_type": doc.file_type,
                    "created_at": doc.created_at.isoformat(),
                    "status": doc.status
                }
                for doc in documents
            ],
            "count": len(documents)
        }
    
    async def _read_users_resource(self, arguments: Dict[str, Any], 
                                  user_id: str, db: Session) -> Dict[str, Any]:
        """Read users resource"""
        # Get current user's organization
        current_user = db.query(User).filter(User.id == user_id).first()
        if not current_user:
            return {"error": "User not found", "status": "failed"}
        
        users = db.query(User).filter(
            User.organization_id == current_user.organization_id
        ).all()
        
        return {
            "status": "success",
            "resource": "users",
            "data": [
                {
                    "id": str(user.id),
                    "email": user.email,
                    "full_name": user.full_name,
                    "role": user.role,
                    "is_active": user.is_active
                }
                for user in users
            ],
            "count": len(users)
        }
    
    async def _read_organizations_resource(self, arguments: Dict[str, Any], 
                                          user_id: str, db: Session) -> Dict[str, Any]:
        """Read organizations resource"""
        current_user = db.query(User).filter(User.id == user_id).first()
        if not current_user:
            return {"error": "User not found", "status": "failed"}
        
        organization = db.query(Organization).filter(
            Organization.id == current_user.organization_id
        ).first()
        
        if not organization:
            return {"error": "Organization not found", "status": "failed"}
        
        return {
            "status": "success",
            "resource": "organizations",
            "data": {
                "id": str(organization.id),
                "name": organization.name,
                "slug": organization.slug,
                "created_at": organization.created_at.isoformat()
            }
        }
    
    async def _read_knowledge_base_resource(self, arguments: Dict[str, Any], 
                                           user_id: str, db: Session) -> Dict[str, Any]:
        """Read knowledge base resource"""
        query = arguments.get("query", "")
        limit = arguments.get("limit", 10)
        
        async with AIAgentClient() as client:
            results = await client.search_knowledge_base(
                query=query,
                limit=limit
            )
        
        return {
            "status": "success",
            "resource": "knowledge_base",
            "data": results,
            "count": len(results)
        }

# Global MCP server instance
mcp_server = MCPServer()
