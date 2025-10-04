from pinecone import Pinecone, Index
from typing import List, Dict, Any, Optional
import os
import numpy as np

class PineconeService:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(PineconeService, cls).__new__(cls)
            cls._instance.initialize()
        return cls._instance
    
    def initialize(self):
        """Initialize Pinecone client"""
        self.api_key = os.getenv("PINECONE_API_KEY")
        self.environment = os.getenv("PINECONE_ENVIRONMENT")
        self.index_name = os.getenv("PINECONE_INDEX_NAME")
        self.client = None
        self.index = None
        
        if all([self.api_key, self.environment, self.index_name]):
            try:
                self.client = Pinecone(
                    api_key=self.api_key,
                    environment=self.environment
                )
                self.index = self.client.Index(self.index_name)
            except Exception as e:
                print(f"Failed to initialize Pinecone: {e}")
    
    def is_available(self) -> bool:
        """Check if Pinecone is available"""
        return self.client is not None and self.index is not None
    
    async def generate_embeddings(self, text: str) -> List[float]:
        """
        Generate embeddings for text
        In production, use OpenAI or another embedding model
        """
        # This is a placeholder implementation
        # In production, use proper embedding generation
        return list(np.random.rand(1536))  # OpenAI embedding size
    
    async def store_embeddings(
        self,
        document_id: str,
        embeddings: List[float],
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """Store embeddings in Pinecone"""
        if not self.is_available():
            return
        
        try:
            self.index.upsert(
                vectors=[{
                    'id': document_id,
                    'values': embeddings,
                    'metadata': metadata or {}
                }]
            )
        except Exception as e:
            print(f"Failed to store embeddings: {e}")
    
    async def search(
        self,
        query_embeddings: List[float],
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """Search for similar vectors"""
        if not self.is_available():
            return []
        
        try:
            results = self.index.query(
                vector=query_embeddings,
                top_k=top_k,
                include_metadata=True
            )
            
            return [
                {
                    'id': match.id,
                    'score': match.score,
                    'metadata': match.metadata
                }
                for match in results.matches
            ]
        except Exception as e:
            print(f"Failed to search Pinecone: {e}")
            return []