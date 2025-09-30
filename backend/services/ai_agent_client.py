"""
AI Agent Client for integrating with the generative AI system
Based on the API documentation at https://0d18e20fd76f.ngrok-free.app/docs
"""

import httpx
import json
import logging
import os
from typing import Dict, List, Any, Optional
from datetime import datetime
import asyncio

from config.ai_config import get_ai_config

logger = logging.getLogger(__name__)

class AIAgentClient:
    """Client for interacting with the AI Agent API"""
    
    def __init__(self, base_url: Optional[str] = None):
        # Get configuration
        self.config = get_ai_config()
        
        # Use provided base_url or get from config
        self.base_url = (base_url or self.config.ai_agent_base_url).rstrip('/')
        self.client = httpx.AsyncClient(
            timeout=self.config.ai_agent_timeout,
            headers=self._get_headers()
        )
        self.session_id = None
        
        logger.info(f"AI Agent Client initialized with base URL: {self.base_url}")
    
    def _get_headers(self) -> Dict[str, str]:
        """Get headers for API requests"""
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "NeoCaptured-IDP/1.0"
        }
        
        if self.config.ai_agent_api_key:
            headers["Authorization"] = f"Bearer {self.config.ai_agent_api_key}"
        
        return headers
        
    async def __aenter__(self):
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()
    
    async def start_chat_session(self, user_id: str, context: Optional[Dict] = None) -> str:
        """Start a new chat session with the AI agent"""
        try:
            payload = {
                "user_id": user_id,
                "context": context or {},
                "timestamp": datetime.utcnow().isoformat()
            }
            
            response = await self.client.post(
                f"{self.base_url}/chat/session/start",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()
            
            data = response.json()
            self.session_id = data.get("session_id")
            logger.info(f"Started chat session: {self.session_id}")
            return self.session_id
            
        except Exception as e:
            logger.error(f"Error starting chat session: {e}")
            raise
    
    async def send_message(self, message: str, session_id: Optional[str] = None, 
                          document_context: Optional[Dict] = None) -> Dict[str, Any]:
        """Send a message to the AI agent"""
        try:
            session_id = session_id or self.session_id
            if not session_id:
                raise ValueError("No active session. Start a chat session first.")
            
            payload = {
                "message": message,
                "session_id": session_id,
                "document_context": document_context,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            response = await self.client.post(
                f"{self.base_url}/chat/message",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()
            
            return response.json()
            
        except Exception as e:
            logger.error(f"Error sending message: {e}")
            raise
    
    async def get_chat_history(self, session_id: Optional[str] = None, 
                              limit: int = 50) -> List[Dict[str, Any]]:
        """Get chat history for a session"""
        try:
            session_id = session_id or self.session_id
            if not session_id:
                raise ValueError("No active session")
            
            response = await self.client.get(
                f"{self.base_url}/chat/history/{session_id}",
                params={"limit": limit}
            )
            response.raise_for_status()
            
            return response.json().get("messages", [])
            
        except Exception as e:
            logger.error(f"Error getting chat history: {e}")
            raise
    
    async def vectorize_document(self, document_id: str, content: str, 
                                metadata: Optional[Dict] = None) -> Dict[str, Any]:
        """Vectorize a document for knowledge base"""
        try:
            payload = {
                "document_id": document_id,
                "content": content,
                "metadata": metadata or {},
                "timestamp": datetime.utcnow().isoformat()
            }
            
            response = await self.client.post(
                f"{self.base_url}/vectorize/document",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()
            
            return response.json()
            
        except Exception as e:
            logger.error(f"Error vectorizing document: {e}")
            raise
    
    async def search_knowledge_base(self, query: str, filters: Optional[Dict] = None,
                                   limit: int = 10) -> List[Dict[str, Any]]:
        """Search the knowledge base using vector similarity"""
        try:
            payload = {
                "query": query,
                "filters": filters or {},
                "limit": limit,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            response = await self.client.post(
                f"{self.base_url}/knowledge/search",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()
            
            return response.json().get("results", [])
            
        except Exception as e:
            logger.error(f"Error searching knowledge base: {e}")
            raise
    
    async def add_to_knowledge_base(self, document_id: str, title: str, 
                                   content: str, category: str = "general",
                                   tags: Optional[List[str]] = None) -> Dict[str, Any]:
        """Add document to knowledge base"""
        try:
            # First vectorize the document
            vector_result = await self.vectorize_document(
                document_id=document_id,
                content=content,
                metadata={
                    "title": title,
                    "category": category,
                    "tags": tags or []
                }
            )
            
            # Then add to knowledge base
            payload = {
                "document_id": document_id,
                "title": title,
                "content": content,
                "category": category,
                "tags": tags or [],
                "vector_id": vector_result.get("vector_id"),
                "timestamp": datetime.utcnow().isoformat()
            }
            
            response = await self.client.post(
                f"{self.base_url}/knowledge/add",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()
            
            return response.json()
            
        except Exception as e:
            logger.error(f"Error adding to knowledge base: {e}")
            raise
    
    async def get_agent_capabilities(self) -> Dict[str, Any]:
        """Get available agent capabilities"""
        try:
            response = await self.client.get(f"{self.base_url}/agent/capabilities")
            response.raise_for_status()
            return response.json()
            
        except Exception as e:
            logger.error(f"Error getting agent capabilities: {e}")
            raise

    async def add_to_knowledge_base(
        self,
        document_id: str,
        title: str,
        content: str,
        category: str = "general",
        tags: List[str] = None,
        metadata: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Add document to AI solution's knowledge base"""
        try:
            payload = {
                "document_id": document_id,
                "title": title,
                "content": content,
                "category": category,
                "tags": tags or [],
                "metadata": metadata or {}
            }
            
            response = await self.client.post(
                f"{self.base_url}/knowledge/add",
                json=payload
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error adding to knowledge base: {e}")
            raise

    async def vectorize_document(
        self,
        document_id: str,
        content: str,
        metadata: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Vectorize document for semantic search"""
        try:
            payload = {
                "document_id": document_id,
                "content": content,
                "metadata": metadata or {}
            }
            
            response = await self.client.post(
                f"{self.base_url}/knowledge/vectorize",
                json=payload
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error vectorizing document: {e}")
            raise

    async def search_knowledge_base(
        self,
        query: str,
        filters: Dict[str, Any] = None,
        limit: int = 10
    ) -> Dict[str, Any]:
        """Search the knowledge base"""
        try:
            payload = {
                "query": query,
                "filters": filters or {},
                "limit": limit
            }
            
            response = await self.client.post(
                f"{self.base_url}/knowledge/search",
                json=payload
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error searching knowledge base: {e}")
            raise
    
    async def execute_agent_task(self, task_type: str, parameters: Dict[str, Any],
                                context: Optional[Dict] = None) -> Dict[str, Any]:
        """Execute a specific agent task"""
        try:
            payload = {
                "task_type": task_type,
                "parameters": parameters,
                "context": context or {},
                "timestamp": datetime.utcnow().isoformat()
            }
            
            response = await self.client.post(
                f"{self.base_url}/agent/execute",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()
            
            return response.json()
            
        except Exception as e:
            logger.error(f"Error executing agent task: {e}")
            raise
    
    async def get_document_insights(self, document_id: str, 
                                   insight_types: Optional[List[str]] = None) -> Dict[str, Any]:
        """Get AI-generated insights for a document"""
        try:
            payload = {
                "document_id": document_id,
                "insight_types": insight_types or ["summary", "key_points", "entities"],
                "timestamp": datetime.utcnow().isoformat()
            }
            
            response = await self.client.post(
                f"{self.base_url}/document/insights",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()
            
            return response.json()
            
        except Exception as e:
            logger.error(f"Error getting document insights: {e}")
            raise

# Global client instance
ai_agent_client = AIAgentClient()
