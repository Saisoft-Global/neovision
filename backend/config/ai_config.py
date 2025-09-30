"""
AI Configuration Management
Handles configuration for AI Agent API and related services
"""

import os
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
import logging

logger = logging.getLogger(__name__)

class AIConfig(BaseModel):
    """AI Configuration model"""
    
    # AI Agent API Configuration
    ai_agent_base_url: str = Field(
        default="https://0d18e20fd76f.ngrok-free.app",
        description="Base URL for the AI Agent API"
    )
    ai_agent_timeout: int = Field(
        default=30,
        description="Timeout for AI Agent API requests in seconds"
    )
    ai_agent_api_key: Optional[str] = Field(
        default=None,
        description="API key for AI Agent authentication"
    )
    
    # Chat Configuration
    chat_session_timeout: int = Field(
        default=3600,
        description="Chat session timeout in seconds"
    )
    max_chat_history: int = Field(
        default=100,
        description="Maximum number of messages to keep in chat history"
    )
    
    # Knowledge Base Configuration
    vector_dimensions: int = Field(
        default=768,
        description="Vector dimensions for embeddings"
    )
    similarity_threshold: float = Field(
        default=0.7,
        description="Minimum similarity threshold for knowledge base search"
    )
    max_search_results: int = Field(
        default=20,
        description="Maximum number of search results to return"
    )
    
    # Document Insights Configuration
    insight_types: list = Field(
        default=["summary", "key_points", "entities", "sentiment"],
        description="Default insight types to generate"
    )
    max_insight_length: int = Field(
        default=1000,
        description="Maximum length for generated insights"
    )
    
    # MCP Configuration
    mcp_enabled: bool = Field(
        default=True,
        description="Enable MCP (Model Context Protocol) server"
    )
    mcp_port: int = Field(
        default=8002,
        description="Port for MCP server"
    )
    
    # Feature Flags
    enable_ai_chat: bool = Field(
        default=True,
        description="Enable AI chat functionality"
    )
    enable_knowledge_base: bool = Field(
        default=True,
        description="Enable knowledge base functionality"
    )
    enable_document_insights: bool = Field(
        default=True,
        description="Enable document insights generation"
    )
    enable_ai_workflows: bool = Field(
        default=True,
        description="Enable AI-enhanced workflows"
    )

def load_ai_config() -> AIConfig:
    """Load AI configuration from environment variables"""
    try:
        config = AIConfig(
            # AI Agent API Configuration
            ai_agent_base_url=os.getenv("AI_AGENT_BASE_URL", "https://0d18e20fd76f.ngrok-free.app"),
            ai_agent_timeout=int(os.getenv("AI_AGENT_TIMEOUT", "30")),
            ai_agent_api_key=os.getenv("AI_AGENT_API_KEY"),
            
            # Chat Configuration
            chat_session_timeout=int(os.getenv("AI_CHAT_SESSION_TIMEOUT", "3600")),
            max_chat_history=int(os.getenv("AI_MAX_CHAT_HISTORY", "100")),
            
            # Knowledge Base Configuration
            vector_dimensions=int(os.getenv("AI_VECTOR_DIMENSIONS", "768")),
            similarity_threshold=float(os.getenv("AI_SIMILARITY_THRESHOLD", "0.7")),
            max_search_results=int(os.getenv("AI_MAX_SEARCH_RESULTS", "20")),
            
            # Document Insights Configuration
            insight_types=os.getenv("AI_INSIGHT_TYPES", "summary,key_points,entities,sentiment").split(","),
            max_insight_length=int(os.getenv("AI_MAX_INSIGHT_LENGTH", "1000")),
            
            # MCP Configuration
            mcp_enabled=os.getenv("AI_MCP_ENABLED", "true").lower() == "true",
            mcp_port=int(os.getenv("AI_MCP_PORT", "8002")),
            
            # Feature Flags
            enable_ai_chat=os.getenv("AI_ENABLE_CHAT", "true").lower() == "true",
            enable_knowledge_base=os.getenv("AI_ENABLE_KNOWLEDGE_BASE", "true").lower() == "true",
            enable_document_insights=os.getenv("AI_ENABLE_DOCUMENT_INSIGHTS", "true").lower() == "true",
            enable_ai_workflows=os.getenv("AI_ENABLE_WORKFLOWS", "true").lower() == "true"
        )
        
        logger.info(f"AI configuration loaded successfully")
        logger.info(f"AI Agent Base URL: {config.ai_agent_base_url}")
        logger.info(f"Features enabled - Chat: {config.enable_ai_chat}, KB: {config.enable_knowledge_base}, Insights: {config.enable_document_insights}, Workflows: {config.enable_ai_workflows}")
        
        return config
        
    except Exception as e:
        logger.error(f"Error loading AI configuration: {e}")
        # Return default configuration
        return AIConfig()

def get_ai_config() -> AIConfig:
    """Get the global AI configuration instance"""
    if not hasattr(get_ai_config, '_instance'):
        get_ai_config._instance = load_ai_config()
    return get_ai_config._instance

def update_ai_config(updates: Dict[str, Any]) -> AIConfig:
    """Update AI configuration with new values"""
    try:
        current_config = get_ai_config()
        updated_config = current_config.copy(update=updates)
        get_ai_config._instance = updated_config
        
        logger.info(f"AI configuration updated: {updates}")
        return updated_config
        
    except Exception as e:
        logger.error(f"Error updating AI configuration: {e}")
        return get_ai_config()

def validate_ai_config(config: AIConfig) -> bool:
    """Validate AI configuration"""
    try:
        # Check if AI Agent URL is accessible
        import httpx
        response = httpx.get(f"{config.ai_agent_base_url}/health", timeout=5)
        if response.status_code != 200:
            logger.warning(f"AI Agent API health check failed: {response.status_code}")
            return False
        
        logger.info("AI configuration validation passed")
        return True
        
    except Exception as e:
        logger.warning(f"AI configuration validation failed: {e}")
        return False

# Global configuration instance
ai_config = get_ai_config()
