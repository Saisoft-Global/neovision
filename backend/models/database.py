"""
Database models for production-grade IDP solution
"""

from sqlalchemy import create_engine, Column, String, Integer, DateTime, Boolean, Text, JSON, ForeignKey, UUID, DECIMAL, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
import uuid
from datetime import datetime

Base = declarative_base()

class Organization(Base):
    __tablename__ = "organizations"
    
    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    settings = Column(JSON, default={})
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    users = relationship("User", back_populates="organization")
    documents = relationship("Document", back_populates="organization")
    api_keys = relationship("ApiKey", back_populates="organization")

class User(Base):
    __tablename__ = "users"
    
    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(PostgresUUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100))
    last_name = Column(String(100))
    role = Column(String(50), default="user")  # admin, manager, user, viewer
    status = Column(String(20), default="active")  # active, inactive, suspended
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    organization = relationship("Organization", back_populates="users")
    documents = relationship("Document", back_populates="user")

class ApiKey(Base):
    __tablename__ = "api_keys"
    
    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(PostgresUUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    name = Column(String(255), nullable=False)
    key_hash = Column(String(255), unique=True, nullable=False)
    permissions = Column(JSON, default={})
    expires_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    organization = relationship("Organization", back_populates="api_keys")

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(PostgresUUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    user_id = Column(PostgresUUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    original_filename = Column(String(500), nullable=False)
    file_path = Column(String(500))  # Optional: path to stored file
    file_type = Column(String(50))
    file_size = Column(Integer)
    mime_type = Column(String(100))
    sha256_hash = Column(String(64), unique=True, nullable=True)  # For deduplication
    num_pages = Column(Integer, default=1)
    status = Column(String(20), default="processing")  # processing, completed, error
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    organization = relationship("Organization", back_populates="documents")
    user = relationship("User", back_populates="documents")
    processing_jobs = relationship("ProcessingJob", back_populates="document")
    pages = relationship("DocumentPage", back_populates="document", cascade="all, delete-orphan")
    extractions = relationship("DocumentExtraction", back_populates="document", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index('idx_documents_user_created', 'user_id', 'created_at'),
        Index('idx_documents_org_created', 'organization_id', 'created_at'),
        Index('idx_documents_hash', 'sha256_hash'),
    )

class DocumentPage(Base):
    __tablename__ = "document_pages"
    
    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(PostgresUUID(as_uuid=True), ForeignKey("documents.id"), nullable=False)
    page_index = Column(Integer, nullable=False)  # 0-based page number
    width = Column(Integer)
    height = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    document = relationship("Document", back_populates="pages")
    
    # Indexes
    __table_args__ = (
        Index('idx_document_pages_doc_page', 'document_id', 'page_index'),
    )

class DocumentExtraction(Base):
    __tablename__ = "document_extractions"
    
    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(PostgresUUID(as_uuid=True), ForeignKey("documents.id"), nullable=False)
    model_name = Column(String(100))  # Which model was used (e.g., "inv_pdf_v1", "layoutlmv3-base")
    fields_json = Column(JSON, default={})  # Extracted fields as JSON
    confidence = Column(DECIMAL(3, 2))  # Overall confidence score
    pipeline_used = Column(JSON, default={})  # Which components were used (OCR, NER, etc.)
    processing_time_ms = Column(Integer)  # Processing time in milliseconds
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    document = relationship("Document", back_populates="extractions")
    
    # Indexes
    __table_args__ = (
        Index('idx_extractions_doc_created', 'document_id', 'created_at'),
        Index('idx_extractions_model', 'model_name'),
    )

class ProcessingJob(Base):
    __tablename__ = "processing_jobs"
    
    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(PostgresUUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    document_id = Column(PostgresUUID(as_uuid=True), ForeignKey("documents.id"), nullable=False)
    status = Column(String(20), default="pending")  # pending, processing, completed, failed
    priority = Column(Integer, default=0)
    retry_count = Column(Integer, default=0)
    error_message = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    
    # Relationships
    document = relationship("Document", back_populates="processing_jobs")

# Database configuration
DATABASE_URL = "postgresql://username:password@localhost/neocaptured_db"

def get_database():
    """Get database engine and session"""
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    return engine, SessionLocal

def get_db():
    """Dependency to get database session"""
    engine, SessionLocal = get_database()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
