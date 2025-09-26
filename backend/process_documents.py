import os
import json
import argparse
from pathlib import Path
from typing import List, Dict, Any, Union
from models.donut_processor import DonutDocumentProcessor
import logging
import shutil
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class DocumentProcessor:
    def __init__(self):
        self.processor = DonutDocumentProcessor()
        self.supported_extensions = {'.pdf', '.jpg', '.jpeg', '.png', '.tiff', '.bmp'}
        
    def process_single_document(self, file_path: Union[str, Path]) -> Dict[str, Any]:
        """Process a single document and return the results."""
        try:
            file_path = Path(file_path)
            if not file_path.exists():
                raise FileNotFoundError(f"File not found: {file_path}")
                
            if file_path.suffix.lower() not in self.supported_extensions:
                raise ValueError(f"Unsupported file type: {file_path.suffix}")
                
            logger.info(f"Processing document: {file_path}")
            result = self.processor.process_document(str(file_path))
            
            return {
                'document_type': result.get('document_type', 'unknown'),
                'extracted_text': result.get('extracted_text', ''),
                'extracted_fields': result.get('extracted_fields', {}),
                'tables': result.get('tables', []),
                'headers': result.get('headers', []),
                'footers': result.get('footers', []),
                'confidence': result.get('confidence', 0.0)
            }
            
        except Exception as e:
            logger.error(f"Error processing {file_path}: {str(e)}")
            return {
                'error': str(e),
                'status': 'failed'
            }
    
    def process_folder(self, folder_path: Union[str, Path]) -> Dict[str, Any]:
        """Process all documents in a folder."""
        try:
            folder = Path(folder_path)
            if not folder.exists():
                raise FileNotFoundError(f"Folder not found: {folder_path}")
            
            results = {}
            for file_path in folder.glob('**/*'):
                if file_path.suffix.lower() in self.supported_extensions:
                    results[str(file_path)] = self.process_single_document(file_path)
            
            return results
            
        except Exception as e:
            logger.error(f"Error processing folder: {str(e)}")
            raise
    
    def process_uploaded_file(self, file_path: Union[str, Path], upload_dir: Union[str, Path] = None) -> Dict[str, Any]:
        """Process an uploaded file and optionally save it to a specific directory."""
        try:
            file_path = Path(file_path)
            if not file_path.exists():
                raise FileNotFoundError(f"File not found: {file_path}")
            
            # If upload directory is specified, copy the file there
            if upload_dir:
                upload_dir = Path(upload_dir)
                upload_dir.mkdir(parents=True, exist_ok=True)
                
                # Create a unique filename
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                new_filename = f"{timestamp}_{file_path.name}"
                new_path = upload_dir / new_filename
                
                # Copy the file
                shutil.copy2(file_path, new_path)
                file_path = new_path
                logger.info(f"File copied to: {file_path}")
            
            # Process the document
            return self.process_single_document(file_path)
            
        except Exception as e:
            logger.error(f"Error processing uploaded file: {str(e)}")
            raise

def save_results(results: Dict[str, Any], output_path: Union[str, Path]) -> None:
    """Save processing results to a JSON file."""
    try:
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        logger.info(f"Results saved to: {output_path}")
        
    except Exception as e:
        logger.error(f"Error saving results: {str(e)}")
        raise

def main():
    parser = argparse.ArgumentParser(description='Process documents using Donut Document Processor')
    parser.add_argument('--folder', type=str, help='Path to folder containing documents to process')
    parser.add_argument('--file', type=str, help='Path to single file to process')
    parser.add_argument('--upload-dir', type=str, help='Directory to save uploaded files')
    parser.add_argument('--output', type=str, help='Path to save results JSON file')
    
    args = parser.parse_args()
    
    # Initialize processor
    doc_processor = DocumentProcessor()
    
    try:
        if args.folder:
            # Process folder
            results = doc_processor.process_folder(args.folder)
            print(f"\nProcessing folder: {args.folder}")
            
        elif args.file:
            # Process single file
            results = {args.file: doc_processor.process_uploaded_file(args.file, args.upload_dir)}
            print(f"\nProcessing file: {args.file}")
            
        else:
            print("Please specify either --folder or --file")
            return
        
        # Save results if output path is provided
        if args.output:
            save_results(results, args.output)
        
        # Print summary
        print("\nProcessing Summary:")
        print(f"Total documents processed: {len(results)}")
        successful = sum(1 for r in results.values() if 'error' not in r)
        print(f"Successfully processed: {successful}")
        print(f"Failed: {len(results) - successful}")
        
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    main() 