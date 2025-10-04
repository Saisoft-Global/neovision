from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from typing import List
from app.auth import verify_token
from app.schemas import Document, DocumentCreate
from services.knowledge_service import KnowledgeService
from services.pinecone_service import PineconeService
from services.neo4j_service import Neo4jService

router = APIRouter()
knowledge_service = KnowledgeService()
pinecone_service = PineconeService()
neo4j_service = Neo4jService()

@router.post("/documents", response_model=Document)
async def upload_document(
    file: UploadFile = File(...),
    user_id: str = Depends(verify_token)
):
    """Upload and process a document"""
    try:
        # Process document
        document = await knowledge_service.process_document(file)
        
        # Generate embeddings and store in Pinecone
        if pinecone_service.is_available():
            embeddings = await pinecone_service.generate_embeddings(document.content)
            await pinecone_service.store_embeddings(document.id, embeddings)
        
        # Extract knowledge graph and store in Neo4j
        if neo4j_service.is_available():
            await neo4j_service.extract_and_store_knowledge(document)
        
        return document
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/documents", response_model=List[Document])
async def get_documents(user_id: str = Depends(verify_token)):
    """Get all documents"""
    return await knowledge_service.get_documents()

@router.get("/documents/{document_id}", response_model=Document)
async def get_document(document_id: str, user_id: str = Depends(verify_token)):
    """Get document by ID"""
    document = await knowledge_service.get_document(document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document

@router.post("/search")
async def search_knowledge(
    query: str,
    user_id: str = Depends(verify_token)
):
    """Search knowledge base using vector similarity"""
    try:
        # Search Pinecone for similar documents
        vector_results = []
        if pinecone_service.is_available():
            embeddings = await pinecone_service.generate_embeddings(query)
            vector_results = await pinecone_service.search(embeddings)
        
        # Search Neo4j for related knowledge
        graph_results = []
        if neo4j_service.is_available():
            graph_results = await neo4j_service.search_knowledge(query)
        
        return {
            "vector_results": vector_results,
            "graph_results": graph_results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))