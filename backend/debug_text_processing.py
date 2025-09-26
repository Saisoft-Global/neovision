#!/usr/bin/env python3
"""
Debug text document processing
"""

import sys
import os
from pathlib import Path

# Add the backend directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def debug_text_processing():
    """Debug text document processing"""
    try:
        from models.document_processor import DocumentProcessor
        
        print("🔍 Debugging Text Document Processing")
        print("=" * 50)
        
        # Initialize processor
        processor = DocumentProcessor()
        print("✅ DocumentProcessor initialized successfully")
        
        # Create test data directory
        test_data_dir = Path("test_data")
        test_data_dir.mkdir(exist_ok=True)
        
        # Create a simple test document
        test_doc_path = test_data_dir / "debug_test.txt"
        test_content = """
        INVOICE
        Invoice Number: INV-DEBUG-001
        Date: 2024-01-15
        Bill To: Debug Company Inc.
        Total Amount: $1,500.00
        """
        
        with open(test_doc_path, 'w') as f:
            f.write(test_content)
        
        print(f"✅ Created test document: {test_doc_path}")
        
        # Test the file type detection
        file_type = processor._get_file_type(str(test_doc_path))
        print(f"📄 Detected file type: {file_type}")
        
        # Test the process_document method
        print("\n🔄 Testing process_document method...")
        result = processor.process_document(str(test_doc_path))
        
        print("✅ Text document processing completed successfully!")
        print(f"   Document Type: {result.get('document_type', 'Unknown')}")
        print(f"   Confidence: {result.get('confidence', 0):.2f}")
        print(f"   Fields Extracted: {len(result.get('extracted_fields', {}))}")
        print(f"   Fields: {list(result.get('extracted_fields', {}).keys())}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error in text processing: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Main debug function"""
    print("🚀 DEBUGGING TEXT DOCUMENT PROCESSING")
    print("=" * 50)
    
    success = debug_text_processing()
    
    if success:
        print("\n✅ Text processing is working correctly!")
        return True
    else:
        print("\n❌ Text processing has issues!")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
