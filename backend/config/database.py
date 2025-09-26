"""
Database configuration supporting both Supabase and PostgreSQL
"""
import os
from typing import Optional
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Database configuration
DATABASE_TYPE = os.getenv("DATABASE_TYPE", "supabase").lower()

if DATABASE_TYPE == "supabase":
    # Supabase configuration
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
    SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not SUPABASE_URL:
        raise ValueError("SUPABASE_URL environment variable is required")
    
    # Extract database URL from Supabase URL
    # Supabase URL format: https://project-id.supabase.co
    # Database URL format: postgresql://postgres:password@db.project-id.supabase.co:5432/postgres
    project_id = SUPABASE_URL.split("//")[1].split(".")[0]
    DATABASE_URL = f"postgresql://postgres:{os.getenv('SUPABASE_DB_PASSWORD', 'your-password')}@db.{project_id}.supabase.co:5432/postgres"
    
    print(f"🔗 Using Supabase database: {project_id}")
    
elif DATABASE_TYPE == "postgresql":
    # Traditional PostgreSQL configuration
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://neocaptured_user:password@localhost/neocaptured_idp")
    print("🔗 Using traditional PostgreSQL database")
    
else:
    raise ValueError(f"Unsupported DATABASE_TYPE: {DATABASE_TYPE}. Use 'supabase' or 'postgresql'")

# Create database engine
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    echo=os.getenv("ENVIRONMENT") == "development"
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class for models
Base = declarative_base()

def get_database():
    """Get database engine and session"""
    return engine, SessionLocal

def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    """Create all database tables"""
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully")

def drop_tables():
    """Drop all database tables (use with caution!)"""
    Base.metadata.drop_all(bind=engine)
    print("⚠️  Database tables dropped")

# Database health check
def check_database_connection():
    """Check if database connection is working"""
    try:
        with engine.connect() as connection:
            result = connection.execute("SELECT 1")
            return True, "Database connection successful"
    except Exception as e:
        return False, f"Database connection failed: {str(e)}"

# Supabase specific functions
if DATABASE_TYPE == "supabase":
    try:
        from supabase import create_client, Client
        
        def get_supabase_client() -> Client:
            """Get Supabase client"""
            return create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        
        def get_supabase_admin_client() -> Client:
            """Get Supabase admin client (with service role key)"""
            if not SUPABASE_SERVICE_ROLE_KEY:
                raise ValueError("SUPABASE_SERVICE_ROLE_KEY is required for admin operations")
            return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        print("✅ Supabase client configured")
        
    except ImportError:
        print("⚠️  Supabase client not available. Install with: pip install supabase")
        
        def get_supabase_client():
            raise ImportError("Supabase client not installed")
        
        def get_supabase_admin_client():
            raise ImportError("Supabase client not installed")

# Database initialization
def init_database():
    """Initialize database with tables and basic data"""
    try:
        # Create tables
        create_tables()
        
        # Check connection
        is_connected, message = check_database_connection()
        if is_connected:
            print(f"✅ Database initialized: {message}")
        else:
            print(f"❌ Database initialization failed: {message}")
            
        return is_connected
        
    except Exception as e:
        print(f"❌ Database initialization error: {str(e)}")
        return False

if __name__ == "__main__":
    # Test database connection
    print("🧪 Testing database connection...")
    is_connected, message = check_database_connection()
    print(f"Result: {message}")
    
    if is_connected:
        print("✅ Database is ready!")
    else:
        print("❌ Database connection failed!")
