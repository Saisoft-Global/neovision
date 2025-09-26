#!/usr/bin/env python3
"""
Supabase Setup Script for NeoCaptured IDP
Helps you configure your Supabase credentials
"""

import os
import sys
from pathlib import Path

def create_env_file():
    """Create .env file with Supabase configuration"""
    
    print("🔧 Supabase Configuration Setup")
    print("=" * 40)
    
    # Get Supabase credentials from user
    print("\n📋 Please provide your Supabase credentials:")
    print("(Get these from your Supabase Dashboard → Settings → API)")
    
    supabase_url = input("\n🌐 Supabase URL (https://your-project-id.supabase.co): ").strip()
    if not supabase_url:
        print("❌ Supabase URL is required!")
        return False
    
    supabase_anon_key = input("🔑 Supabase Anon Key: ").strip()
    if not supabase_anon_key:
        print("❌ Supabase Anon Key is required!")
        return False
    
    supabase_service_key = input("🔐 Supabase Service Role Key (optional): ").strip()
    
    # Create .env file content
    env_content = f"""# Supabase Configuration
SUPABASE_URL={supabase_url}
SUPABASE_ANON_KEY={supabase_anon_key}
SUPABASE_SERVICE_ROLE_KEY={supabase_service_key}

# Database Configuration
DATABASE_TYPE=supabase

# Application Configuration
SECRET_KEY=your-super-secret-key-change-in-production
ENVIRONMENT=development

# API Configuration
VITE_API_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Application Settings
VITE_APP_NAME=NeoCaptured IDP

# OCR Languages
OCR_LANG=en,ar

# File Upload Settings
MAX_FILE_SIZE=52428800
ALLOWED_FILE_TYPES=pdf,jpg,jpeg,png,tiff,doc,docx,txt

# Model Settings
MODEL_CACHE_DIR=models
UPLOAD_DIR=uploads
TEMP_DIR=temp
"""
    
    # Write .env file
    env_file = Path("backend/.env")
    try:
        with open(env_file, "w") as f:
            f.write(env_content)
        print(f"\n✅ Created {env_file}")
        return True
    except Exception as e:
        print(f"❌ Error creating .env file: {e}")
        return False

def test_supabase_connection():
    """Test Supabase connection"""
    print("\n🧪 Testing Supabase Connection...")
    
    try:
        # Load environment variables
        from dotenv import load_dotenv
        load_dotenv("backend/.env")
        
        # Test Supabase client
        from backend.models.supabase_client import get_supabase_client
        
        client = get_supabase_client()
        print("✅ Supabase client created successfully")
        
        # Test database connection
        from backend.config.database import check_database_connection
        is_connected, message = check_database_connection()
        
        if is_connected:
            print(f"✅ Database connection successful: {message}")
            return True
        else:
            print(f"❌ Database connection failed: {message}")
            return False
            
    except ImportError as e:
        print(f"❌ Missing dependencies: {e}")
        print("Please install requirements: pip install -r backend/requirements.txt")
        return False
    except Exception as e:
        print(f"❌ Connection test failed: {e}")
        return False

def main():
    """Main setup function"""
    print("🚀 NeoCaptured IDP - Supabase Setup")
    print("=" * 50)
    
    # Check if .env already exists
    env_file = Path("backend/.env")
    if env_file.exists():
        print(f"⚠️  {env_file} already exists")
        overwrite = input("Do you want to overwrite it? (y/N): ").strip().lower()
        if overwrite != 'y':
            print("Setup cancelled")
            return
    
    # Create .env file
    if not create_env_file():
        print("❌ Setup failed")
        return
    
    # Test connection
    if test_supabase_connection():
        print("\n🎉 Supabase setup completed successfully!")
        print("\n📋 Next steps:")
        print("1. Update your render.yaml with the same credentials")
        print("2. Deploy to Render")
        print("3. Start building your IDP features!")
    else:
        print("\n⚠️  Setup completed but connection test failed")
        print("Please check your Supabase credentials and try again")

if __name__ == "__main__":
    main()
