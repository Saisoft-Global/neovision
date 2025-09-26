#!/usr/bin/env python3
"""
Local development runner for IDP Backend
Automatically activates the neoidp virtual environment
"""

import os
import sys
import subprocess
from pathlib import Path

def activate_virtual_environment():
    """Activate the neoidp virtual environment"""
    venv_path = Path(__file__).parent / "neoidp"
    
    if not venv_path.exists():
        print("❌ Virtual environment 'neoidp' not found!")
        print("Please ensure the virtual environment is set up in backend/neoidp/")
        return False
    
    # Add virtual environment to Python path
    venv_site_packages = venv_path / "Lib" / "site-packages"
    if venv_site_packages.exists():
        sys.path.insert(0, str(venv_site_packages))
        print(f"✅ Added virtual environment to Python path: {venv_site_packages}")
    
    # Set environment variables
    os.environ["VIRTUAL_ENV"] = str(venv_path)
    os.environ["PYTHONPATH"] = str(Path(__file__).parent)
    
    return True

def check_dependencies():
    """Check if required packages are available"""
    required_packages = [
        "fastapi",
        "uvicorn",
        "torch",
        "transformers",
        "paddleocr"
    ]
    
    missing_packages = []
    for package in required_packages:
        try:
            __import__(package)
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        print(f"❌ Missing packages: {missing_packages}")
        print("Please install them in your virtual environment:")
        print("pip install -r requirements.txt")
        return False
    
    print("✅ All required packages are available")
    return True

def run_server():
    """Run the FastAPI server"""
    print("🚀 Starting IDP Backend Server...")
    print("=" * 50)
    
    # Change to backend directory
    backend_dir = Path(__file__).parent
    os.chdir(backend_dir)
    
    # Run the server
    try:
        subprocess.run([
            sys.executable, "-m", "uvicorn", 
            "main:app", 
            "--host", "0.0.0.0", 
            "--port", "8000", 
            "--reload"
        ], check=True)
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except subprocess.CalledProcessError as e:
        print(f"❌ Server failed to start: {e}")
        return False
    
    return True

def main():
    """Main function"""
    print("🔧 IDP Backend Local Development Runner")
    print("=" * 50)
    
    # Activate virtual environment
    if not activate_virtual_environment():
        return 1
    
    # Check dependencies
    if not check_dependencies():
        return 1
    
    # Run server
    if not run_server():
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
