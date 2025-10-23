#!/usr/bin/env python3
"""
Simple test script to verify backend setup
"""
import os
import sys

# Set environment variables
os.environ["SECRET_KEY"] = "test-secret-key"
os.environ["PINECONE_API_KEY"] = "pcsk_4CKprB_4TJYqHNrkrHg8DgPvPNdkpP7Jo1fVeGNHNBX1BwUoP1UQj3VC41rCB93z1WJEwk"
os.environ["PINECONE_ENVIRONMENT"] = "aped-4627-b74a"
os.environ["PINECONE_INDEX_NAME"] = "multi-agent-platform"

try:
    print("Testing backend imports...")
    
    # Test Pinecone
    from pinecone import Pinecone
    print("✅ Pinecone import successful")
    
    # Test Pinecone service
    from services.pinecone_service import PineconeService
    print("✅ PineconeService import successful")
    
    # Test vector router
    from routers.vectors import router
    print("✅ Vector router import successful")
    
    # Test main app
    from main import app
    print("✅ Main app import successful")
    
    print("\n🎉 All backend components are working!")
    print("You can now start the backend with:")
    print("python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload")
    
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
