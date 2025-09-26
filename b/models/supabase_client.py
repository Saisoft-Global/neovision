"""
Supabase client for production-grade IDP solution
"""

import os
from supabase import create_client, Client
from typing import Optional, Dict, Any, List
import logging

logger = logging.getLogger(__name__)

class SupabaseClient:
    def __init__(self):
        self.url = os.getenv("SUPABASE_URL")
        self.key = os.getenv("SUPABASE_ANON_KEY")
        
        if not self.url or not self.key:
            raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY must be set")
        
        self.supabase: Client = create_client(self.url, self.key)
        logger.info("Supabase client initialized successfully")
    
    # Organization methods
    async def create_organization(self, name: str, slug: str, settings: Dict = None) -> Dict[str, Any]:
        """Create a new organization"""
        try:
            result = self.supabase.table("organizations").insert({
                "name": name,
                "slug": slug,
                "settings": settings or {}
            }).execute()
            
            if result.data:
                logger.info(f"Organization created: {name}")
                return result.data[0]
            else:
                raise Exception("Failed to create organization")
                
        except Exception as e:
            logger.error(f"Error creating organization: {str(e)}")
            raise
    
    async def get_organization(self, org_id: str) -> Optional[Dict[str, Any]]:
        """Get organization by ID"""
        try:
            result = self.supabase.table("organizations").select("*").eq("id", org_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error getting organization: {str(e)}")
            return None
    
    # User methods
    async def create_user_profile(self, user_id: str, organization_id: str, 
                                username: str, avatar_url: str = None, role: str = "user") -> Dict[str, Any]:
        """Create user profile after Supabase auth signup"""
        try:
            result = self.supabase.table("profiles").insert({
                "id": user_id,
                "organization_id": organization_id,
                "username": username,
                "avatar_url": avatar_url,
                "role": role
            }).execute()
            
            if result.data:
                logger.info(f"User profile created: {user_id}")
                return result.data[0]
            else:
                raise Exception("Failed to create user profile")
                
        except Exception as e:
            logger.error(f"Error creating user profile: {str(e)}")
            raise
    
    async def get_user_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user profile by ID"""
        try:
            result = self.supabase.table("profiles").select("*, organizations(*)").eq("id", user_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error getting user profile: {str(e)}")
            return None
    
    async def get_organization_users(self, organization_id: str) -> List[Dict[str, Any]]:
        """Get all users in an organization"""
        try:
            result = self.supabase.table("profiles").select("*").eq("organization_id", organization_id).execute()
            return result.data or []
        except Exception as e:
            logger.error(f"Error getting organization users: {str(e)}")
            return []
    
    # Document methods
    async def create_document(self, organization_id: str, user_id: str, name: str, 
                            file_path: str, file_type: str, file_size: int) -> Dict[str, Any]:
        """Create a new document record"""
        try:
            result = self.supabase.table("documents").insert({
                "organization_id": organization_id,
                "user_id": user_id,
                "name": name,
                "file_path": file_path,
                "file_type": file_type,
                "file_size": file_size,
                "status": "processing"
            }).execute()
            
            if result.data:
                logger.info(f"Document created: {name}")
                return result.data[0]
            else:
                raise Exception("Failed to create document")
                
        except Exception as e:
            logger.error(f"Error creating document: {str(e)}")
            raise
    
    async def update_document_results(self, document_id: str, extracted_fields: Dict[str, Any], 
                                    confidence_score: float, processing_method: str) -> Dict[str, Any]:
        """Update document with extraction results"""
        try:
            result = self.supabase.table("documents").update({
                "extracted_fields": extracted_fields,
                "confidence_score": confidence_score,
                "processing_method": processing_method,
                "status": "completed"
            }).eq("id", document_id).execute()
            
            if result.data:
                logger.info(f"Document updated: {document_id}")
                return result.data[0]
            else:
                raise Exception("Failed to update document")
                
        except Exception as e:
            logger.error(f"Error updating document: {str(e)}")
            raise
    
    async def get_document(self, document_id: str) -> Optional[Dict[str, Any]]:
        """Get document by ID"""
        try:
            result = self.supabase.table("documents").select("*").eq("id", document_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error getting document: {str(e)}")
            return None
    
    async def get_organization_documents(self, organization_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Get documents for an organization"""
        try:
            result = self.supabase.table("documents").select("*").eq("organization_id", organization_id).order("created_at", desc=True).limit(limit).execute()
            return result.data or []
        except Exception as e:
            logger.error(f"Error getting organization documents: {str(e)}")
            return []
    
    # API Key methods
    async def create_api_key(self, organization_id: str, name: str, key_hash: str, 
                           permissions: Dict = None, expires_at: str = None) -> Dict[str, Any]:
        """Create API key"""
        try:
            result = self.supabase.table("api_keys").insert({
                "organization_id": organization_id,
                "name": name,
                "key_hash": key_hash,
                "permissions": permissions or {},
                "expires_at": expires_at
            }).execute()
            
            if result.data:
                logger.info(f"API key created: {name}")
                return result.data[0]
            else:
                raise Exception("Failed to create API key")
                
        except Exception as e:
            logger.error(f"Error creating API key: {str(e)}")
            raise
    
    async def get_api_key(self, key_hash: str) -> Optional[Dict[str, Any]]:
        """Get API key by hash"""
        try:
            result = self.supabase.table("api_keys").select("*, organizations(*)").eq("key_hash", key_hash).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error getting API key: {str(e)}")
            return None
    
    async def get_organization_api_keys(self, organization_id: str) -> List[Dict[str, Any]]:
        """Get API keys for an organization"""
        try:
            result = self.supabase.table("api_keys").select("*").eq("organization_id", organization_id).execute()
            return result.data or []
        except Exception as e:
            logger.error(f"Error getting organization API keys: {str(e)}")
            return []
    
    # Processing Job methods
    async def create_processing_job(self, organization_id: str, document_id: str, 
                                  priority: int = 0) -> Dict[str, Any]:
        """Create processing job"""
        try:
            result = self.supabase.table("processing_jobs").insert({
                "organization_id": organization_id,
                "document_id": document_id,
                "priority": priority,
                "status": "pending"
            }).execute()
            
            if result.data:
                logger.info(f"Processing job created: {document_id}")
                return result.data[0]
            else:
                raise Exception("Failed to create processing job")
                
        except Exception as e:
            logger.error(f"Error creating processing job: {str(e)}")
            raise
    
    async def update_processing_job(self, job_id: str, status: str, 
                                  error_message: str = None) -> Dict[str, Any]:
        """Update processing job status"""
        try:
            update_data = {"status": status}
            
            if status == "processing":
                update_data["started_at"] = "NOW()"
            elif status in ["completed", "failed"]:
                update_data["completed_at"] = "NOW()"
            
            if error_message:
                update_data["error_message"] = error_message
            
            result = self.supabase.table("processing_jobs").update(update_data).eq("id", job_id).execute()
            
            if result.data:
                logger.info(f"Processing job updated: {job_id}")
                return result.data[0]
            else:
                raise Exception("Failed to update processing job")
                
        except Exception as e:
            logger.error(f"Error updating processing job: {str(e)}")
            raise

# Global Supabase client instance (lazy initialization)
supabase_client = None

def get_supabase_client():
    """Get or create Supabase client instance"""
    global supabase_client
    if supabase_client is None:
        supabase_client = SupabaseClient()
    return supabase_client
