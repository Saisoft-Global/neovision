"""
Document management router for per-user document persistence
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime
import hashlib
import logging
from pathlib import Path

from config.database import get_db
from models.database import Document, DocumentPage, DocumentExtraction

router = APIRouter()
logger = logging.getLogger(__name__)

# Global document processor instance (will be injected from main.py)
document_processor = None

def get_document_processor():
    """Dependency to get the document processor instance"""
    global document_processor
    if document_processor is None:
        from models.document_processor import DocumentProcessor
        document_processor = DocumentProcessor()
    return document_processor

def calculate_file_hash(content: bytes) -> str:
    """Calculate SHA256 hash of file content"""
    return hashlib.sha256(content).hexdigest()

def save_document_to_db(
    db: Session,
    user_id: str,
    organization_id: str,
    filename: str,
    content: bytes,
    mime_type: str,
    processing_result: Dict[str, Any],
    model_name: Optional[str] = None
) -> Document:
    """Save document and extraction results to database"""
    try:
        # Calculate file hash for deduplication
        file_hash = calculate_file_hash(content)
        
        # Check if document already exists (deduplication)
        existing_doc = db.query(Document).filter(
            Document.sha256_hash == file_hash,
            Document.user_id == user_id
        ).first()
        
        if existing_doc:
            logger.info(f"Document already exists: {existing_doc.id}")
            # Update the existing document with new extraction
            document = existing_doc
        else:
            # Create new document
            document = Document(
                organization_id=organization_id,
                user_id=user_id,
                name=filename,
                original_filename=filename,
                file_type=Path(filename).suffix.lower(),
                file_size=len(content),
                mime_type=mime_type,
                sha256_hash=file_hash,
                num_pages=processing_result.get("num_pages", 1),
                status="completed"
            )
            db.add(document)
            db.flush()  # Get the ID
        
        # Create document page(s)
        num_pages = processing_result.get("num_pages", 1)
        for page_idx in range(num_pages):
            page = DocumentPage(
                document_id=document.id,
                page_index=page_idx,
                width=processing_result.get("page_width", 0),
                height=processing_result.get("page_height", 0)
            )
            db.add(page)
        
        # Create extraction record
        extraction = DocumentExtraction(
            document_id=document.id,
            model_name=model_name or "unknown",
            fields_json=processing_result.get("extracted_fields", {}),
            confidence=float(processing_result.get("confidence", 0.0)),
            pipeline_used=processing_result.get("pipeline_used", {}),
            processing_time_ms=processing_result.get("processing_time_ms", 0)
        )
        db.add(extraction)
        
        db.commit()
        logger.info(f"Saved document {document.id} with extraction {extraction.id}")
        return document
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error saving document to DB: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save document: {str(e)}"
        )

@router.get("/documents")
async def list_documents(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """List user's documents with pagination"""
    try:
        # Get documents for the specified user
        documents_query = db.query(Document).filter(Document.user_id == user_id).order_by(Document.created_at.desc())
        
        total_count = documents_query.count()
        documents = documents_query.offset(offset).limit(limit).all()
        
        # Get latest extraction for each document
        result_documents = []
        for doc in documents:
            latest_extraction = db.query(DocumentExtraction).filter(
                DocumentExtraction.document_id == doc.id
            ).order_by(DocumentExtraction.created_at.desc()).first()
            
            result_documents.append({
                "id": str(doc.id),
                "name": doc.name,
                "original_filename": doc.original_filename,
                "file_type": doc.file_type,
                "file_size": doc.file_size,
                "num_pages": doc.num_pages,
                "status": doc.status,
                "created_at": doc.created_at.isoformat(),
                "updated_at": doc.updated_at.isoformat(),
                "latest_extraction": {
                    "id": str(latest_extraction.id) if latest_extraction else None,
                    "model_name": latest_extraction.model_name if latest_extraction else None,
                    "confidence": float(latest_extraction.confidence) if latest_extraction else None,
                    "created_at": latest_extraction.created_at.isoformat() if latest_extraction else None
                } if latest_extraction else None
            })
        
        return {
            "documents": result_documents,
            "total_count": total_count,
            "limit": limit,
            "offset": offset,
            "has_more": offset + limit < total_count
        }
        
    except Exception as e:
        logger.error(f"Error listing documents: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list documents: {str(e)}"
        )

@router.get("/documents/{document_id}")
async def get_document(
    document_id: str,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get document details with latest extraction"""
    try:
        # Get document (for now, no user filtering)
        # TODO: Add proper auth and user filtering
        document = db.query(Document).filter(
            Document.id == document_id
        ).first()
        
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )
        
        # Get latest extraction
        latest_extraction = db.query(DocumentExtraction).filter(
            DocumentExtraction.document_id == document.id
        ).order_by(DocumentExtraction.created_at.desc()).first()
        
        # Get all pages
        pages = db.query(DocumentPage).filter(
            DocumentPage.document_id == document.id
        ).order_by(DocumentPage.page_index).all()
        
        return {
            "id": str(document.id),
            "name": document.name,
            "original_filename": document.original_filename,
            "file_type": document.file_type,
            "file_size": document.file_size,
            "mime_type": document.mime_type,
            "num_pages": document.num_pages,
            "status": document.status,
            "created_at": document.created_at.isoformat(),
            "updated_at": document.updated_at.isoformat(),
            "pages": [
                {
                    "id": str(page.id),
                    "page_index": page.page_index,
                    "width": page.width,
                    "height": page.height
                }
                for page in pages
            ],
            "latest_extraction": {
                "id": str(latest_extraction.id),
                "model_name": latest_extraction.model_name,
                "fields": latest_extraction.fields_json,
                "confidence": float(latest_extraction.confidence),
                "pipeline_used": latest_extraction.pipeline_used,
                "processing_time_ms": latest_extraction.processing_time_ms,
                "created_at": latest_extraction.created_at.isoformat()
            } if latest_extraction else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting document: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get document: {str(e)}"
        )

@router.get("/documents/{document_id}/extractions")
async def list_document_extractions(
    document_id: str,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """List all extractions for a document"""
    try:
        # Verify document exists (for now, no user filtering)
        # TODO: Add proper auth and user filtering
        document = db.query(Document).filter(
            Document.id == document_id
        ).first()
        
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )
        
        # Get extractions
        extractions_query = db.query(DocumentExtraction).filter(
            DocumentExtraction.document_id == document.id
        ).order_by(DocumentExtraction.created_at.desc())
        
        total_count = extractions_query.count()
        extractions = extractions_query.offset(offset).limit(limit).all()
        
        return {
            "extractions": [
                {
                    "id": str(extraction.id),
                    "model_name": extraction.model_name,
                    "fields": extraction.fields_json,
                    "confidence": float(extraction.confidence),
                    "pipeline_used": extraction.pipeline_used,
                    "processing_time_ms": extraction.processing_time_ms,
                    "created_at": extraction.created_at.isoformat()
                }
                for extraction in extractions
            ],
            "total_count": total_count,
            "limit": limit,
            "offset": offset,
            "has_more": offset + limit < total_count
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing extractions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list extractions: {str(e)}"
        )

@router.post("/documents/{document_id}/reprocess")
async def reprocess_document(
    document_id: str,
    db: Session = Depends(get_db),
    processor = Depends(get_document_processor)
) -> Dict[str, Any]:
    """Reprocess document with current active model"""
    try:
        # Get document (for now, no user filtering)
        # TODO: Add proper auth and user filtering
        document = db.query(Document).filter(
            Document.id == document_id
        ).first()
        
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )
        
        # Get active model
        active_model_manager = ActiveModelManager()
        active_model_info = active_model_manager.get_active_model()
        model_name = active_model_info.get("model_name", "unknown")
        
        # Reprocess document (you'll need to implement file retrieval)
        # For now, return a placeholder response
        return {
            "message": "Reprocessing initiated",
            "document_id": document_id,
            "model_name": model_name,
            "status": "processing"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reprocessing document: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reprocess document: {str(e)}"
        )

@router.delete("/documents/{document_id}")
async def delete_document(
    document_id: str,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Delete document (soft delete by updating status)"""
    try:
        # Get document (for now, no user filtering)
        # TODO: Add proper auth and user filtering
        document = db.query(Document).filter(
            Document.id == document_id
        ).first()
        
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )
        
        # Soft delete by updating status
        document.status = "deleted"
        document.updated_at = datetime.utcnow()
        db.commit()
        
        return {
            "message": "Document deleted successfully",
            "document_id": document_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete document: {str(e)}"
        )
