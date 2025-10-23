"""
Pinecone Service - Server-side Pinecone operations
"""

from pinecone import Pinecone, ServerlessSpec
import os
import logging
from typing import List, Dict, Any, Optional
import httpx

logger = logging.getLogger(__name__)

class PineconeService:
    def __init__(self):
        self.api_key = os.getenv("PINECONE_API_KEY") or os.getenv("VITE_PINECONE_API_KEY")
        self.index_name = os.getenv("PINECONE_INDEX_NAME") or os.getenv("VITE_PINECONE_INDEX_NAME")
        self.client = None
        self.index = None
        
        if self.api_key and self.index_name:
            try:
                self.client = Pinecone(api_key=self.api_key)
                self.index = self.client.Index(self.index_name)
                logger.info(f"✅ Pinecone service initialized: {self.index_name}")
            except Exception as e:
                logger.error(f"❌ Failed to initialize Pinecone: {e}")
                self.client = None
                self.index = None
        else:
            logger.warning("⚠️ Pinecone not configured - missing API key or index name")
    
    def is_available(self) -> bool:
        """Check if Pinecone is available"""
        return self.client is not None and self.index is not None
    
    async def search(
        self,
        query_embeddings: List[float],
        top_k: int = 10,
        filter: Optional[Dict[str, Any]] = None,
        include_metadata: bool = True
    ) -> List[Dict[str, Any]]:
        """Search vectors (alias for query that returns list format)"""
        if not self.is_available():
            return []
        
        try:
            result = self.index.query(
                vector=query_embeddings,
                top_k=top_k,
                filter=filter,
                include_metadata=include_metadata
            )
            
            return [
                {
                    "id": match.id,
                    "score": match.score,
                    "metadata": match.metadata if include_metadata else {}
                }
                for match in result.matches
            ]
        except Exception as e:
            logger.error(f"Pinecone search error: {e}")
            return []
    
    async def query(
        self,
        vector: List[float],
        top_k: int = 10,
        filter: Optional[Dict[str, Any]] = None,
        include_metadata: bool = True
    ) -> Dict[str, Any]:
        """Query vectors"""
        matches = await self.search(vector, top_k, filter, include_metadata)
        return {"matches": matches}
    
    async def upsert(
        self,
        vectors: List[Dict[str, Any]],
        namespace: Optional[str] = None
    ) -> Dict[str, Any]:
        """Upsert vectors"""
        if not self.is_available():
            return {"status": "error", "message": "Pinecone not available"}
        
        try:
            # Convert to Pinecone format
            pinecone_vectors = [
                {
                    "id": v["id"],
                    "values": v["values"],
                    "metadata": v.get("metadata", {})
                }
                for v in vectors
            ]
            
            result = self.index.upsert(vectors=pinecone_vectors, namespace=namespace)
            
            return {
                "status": "success",
                "upserted": result.upserted_count if hasattr(result, 'upserted_count') else len(vectors)
            }
        except Exception as e:
            logger.error(f"Pinecone upsert error: {e}")
            return {"status": "error", "message": str(e)}
    
    async def delete(
        self,
        ids: List[str],
        namespace: Optional[str] = None
    ) -> Dict[str, Any]:
        """Delete vectors"""
        if not self.is_available():
            return {"status": "error", "message": "Pinecone not available"}
        
        try:
            self.index.delete(ids=ids, namespace=namespace)
            return {"status": "success", "deleted": len(ids)}
        except Exception as e:
            logger.error(f"Pinecone delete error: {e}")
            return {"status": "error", "message": str(e)}
    
    async def describe_index_stats(self) -> Optional[Dict[str, Any]]:
        """Get index statistics"""
        if not self.is_available():
            return None
        
        try:
            stats = self.index.describe_index_stats()
            return {
                "dimension": stats.dimension,
                "index_fullness": stats.index_fullness,
                "total_vector_count": stats.total_vector_count,
                "namespaces": stats.namespaces
            }
        except Exception as e:
            logger.error(f"Pinecone stats error: {e}")
            return None
    
    async def generate_embeddings(self, text: str) -> List[float]:
        """Generate embeddings using OpenAI API"""
        openai_key = os.getenv("OPENAI_API_KEY") or os.getenv("VITE_OPENAI_API_KEY")
        
        if not openai_key:
            logger.error("OpenAI API key not available for embeddings")
            raise ValueError("OpenAI API key not configured")
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.openai.com/v1/embeddings",
                    headers={
                        "Authorization": f"Bearer {openai_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "input": text,
                        "model": "text-embedding-ada-002"
                    },
                    timeout=30.0
                )
                
                if response.status_code != 200:
                    logger.error(f"OpenAI embeddings error: {response.status_code} {response.text}")
                    raise Exception(f"OpenAI API error: {response.status_code}")
                
                data = response.json()
                return data["data"][0]["embedding"]
        except Exception as e:
            logger.error(f"Failed to generate embeddings: {e}")
            raise
    
    async def store_embeddings(
        self,
        document_id: str,
        embeddings: List[float],
        metadata: Optional[Dict[str, Any]] = None,
        namespace: Optional[str] = None
    ) -> Dict[str, Any]:
        """Store embeddings in Pinecone"""
        if not self.is_available():
            return {"status": "error", "message": "Pinecone not available"}
        
        try:
            vector_data = {
                "id": document_id,
                "values": embeddings,
                "metadata": metadata or {}
            }
            
            result = self.index.upsert(
                vectors=[vector_data],
                namespace=namespace
            )
            
            return {
                "status": "success",
                "id": document_id,
                "upserted": 1
            }
        except Exception as e:
            logger.error(f"Failed to store embeddings: {e}")
            return {"status": "error", "message": str(e)}
