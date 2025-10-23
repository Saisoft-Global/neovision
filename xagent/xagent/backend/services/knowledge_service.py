from typing import List, Dict, Any, Optional
from fastapi import UploadFile
from app.schemas import Document, DocumentCreate
import uuid
import logging

logger = logging.getLogger(__name__)

class KnowledgeService:
    """Service for managing knowledge documents and processing"""
    
    def __init__(self):
        self.documents = []  # In-memory storage for now
    
    async def process_document(self, file: UploadFile) -> Document:
        """Process an uploaded document"""
        try:
            # Read file content
            content = await file.read()
            
            # Create document record
            document = Document(
                id=str(uuid.uuid4()),
                filename=file.filename,
                content=content.decode('utf-8', errors='ignore'),
                size=len(content),
                content_type=file.content_type or 'text/plain'
            )
            
            # Store document
            self.documents.append(document)
            
            logger.info(f"Processed document: {document.filename}")
            return document
            
        except Exception as e:
            logger.error(f"Error processing document: {e}")
            raise
    
    async def get_documents(self) -> List[Document]:
        """Get all documents"""
        return self.documents
    
    async def get_document(self, document_id: str) -> Optional[Document]:
        """Get document by ID"""
        for doc in self.documents:
            if doc.id == document_id:
                return doc
        return None
    
    async def delete_document(self, document_id: str) -> bool:
        """Delete document by ID"""
        for i, doc in enumerate(self.documents):
            if doc.id == document_id:
                del self.documents[i]
                return True
        return False
    
    async def search_documents(self, query: str) -> List[Document]:
        """Search documents by content"""
        results = []
        query_lower = query.lower()
        
        for doc in self.documents:
            if query_lower in doc.content.lower():
                results.append(doc)
        
        return results
