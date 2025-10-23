from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from app.auth import verify_token_optional
from services.pinecone_service import PineconeService

router = APIRouter()
pinecone_service = PineconeService()

class VectorQuery(BaseModel):
    query: str
    top_k: int = 10
    filter: Optional[Dict[str, Any]] = None
    organization_id: Optional[str] = None  # Organization context for multi-tenancy

class VectorUpsert(BaseModel):
    vectors: List[Dict[str, Any]]
    organization_id: Optional[str] = None  # Organization context for multi-tenancy

class VectorSearch(BaseModel):
    vector: List[float]
    top_k: int = 10
    filter: Optional[Dict[str, Any]] = None
    organization_id: Optional[str] = None  # Organization context for multi-tenancy

@router.post("/query")
async def query_vectors(
    query_data: VectorQuery,
    user_id: str = Depends(verify_token_optional)
):
    """Query vectors using text search"""
    try:
        if not pinecone_service.is_available():
            return {"matches": []}
        
        # Generate embeddings for the query
        embeddings = await pinecone_service.generate_embeddings(query_data.query)
        
        # Add organization context to filter
        filter_dict = query_data.filter or {}
        if query_data.organization_id:
            filter_dict["organization_id"] = query_data.organization_id
        
        # Search Pinecone with organization filtering
        results = await pinecone_service.search(
            query_embeddings=embeddings,
            top_k=query_data.top_k,
            filter=filter_dict if filter_dict else None
        )
        
        return {"matches": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/search")
async def search_vectors(
    search_data: VectorSearch,
    user_id: str = Depends(verify_token_optional)
):
    """Search vectors using pre-computed embeddings"""
    try:
        if not pinecone_service.is_available():
            return {"matches": []}
        
        # Add organization context to filter
        filter_dict = search_data.filter or {}
        if search_data.organization_id:
            filter_dict["organization_id"] = search_data.organization_id
        
        # Search Pinecone with organization filtering
        results = await pinecone_service.search(
            query_embeddings=search_data.vector,
            top_k=search_data.top_k,
            filter=filter_dict if filter_dict else None
        )
        
        return {"matches": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upsert")
async def upsert_vectors(
    upsert_data: VectorUpsert,
    user_id: str = Depends(verify_token_optional)
):
    """Upsert vectors to Pinecone"""
    try:
        if not pinecone_service.is_available():
            return {"status": "success", "message": "Pinecone not available"}
        
        # Store each vector with organization context
        for vector_data in upsert_data.vectors:
            # Add organization context to metadata; omit nulls for Pinecone
            metadata = vector_data.get("metadata", {}) or {}
            if upsert_data.organization_id is not None:
                metadata["organization_id"] = upsert_data.organization_id

            # Remove any keys with None values to satisfy Pinecone constraints
            clean_metadata = {k: v for k, v in metadata.items() if v is not None}

            await pinecone_service.store_embeddings(
                document_id=vector_data.get("id"),
                embeddings=vector_data.get("values", []),
                metadata=clean_metadata
            )
        
        return {"status": "success", "upserted": len(upsert_data.vectors)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
async def get_pinecone_status(user_id: str = Depends(verify_token_optional)):
    """Get Pinecone service status"""
    return {
        "available": pinecone_service.is_available(),
        "index_name": pinecone_service.index_name if pinecone_service.is_available() else None
    }
