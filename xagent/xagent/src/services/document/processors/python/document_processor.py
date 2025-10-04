import magic
import pytesseract
from pdf2image import convert_from_bytes
from docx import Document as DocxDocument
from pdfminer.high_level import extract_text
import pandas as pd
import io
import json

def process_file(file_bytes, file_type):
    """Process different file types and extract text content."""
    try:
        mime = magic.Magic(mime=True)
        detected_type = mime.from_buffer(file_bytes)

        if 'pdf' in detected_type:
            return process_pdf(file_bytes)
        elif 'image' in detected_type:
            return process_image(file_bytes)
        elif 'excel' in detected_type or 'spreadsheet' in detected_type:
            return process_excel(file_bytes)
        elif 'word' in detected_type:
            return process_word(file_bytes)
        else:
            return {'error': f'Unsupported file type: {detected_type}'}

    except Exception as e:
        return {'error': str(e)}

def process_pdf(file_bytes):
    """Extract text from PDF using both text extraction and OCR."""
    try:
        # Try text extraction first
        text = extract_text(io.BytesIO(file_bytes))
        
        # If no text found, try OCR
        if not text.strip():
            images = convert_from_bytes(file_bytes)
            text = '\n'.join([pytesseract.image_to_string(img) for img in images])

        return {'content': text}
    except Exception as e:
        return {'error': f'PDF processing error: {str(e)}'}

def process_image(file_bytes):
    """Extract text from images using OCR."""
    try:
        from PIL import Image
        image = Image.open(io.BytesIO(file_bytes))
        text = pytesseract.image_to_string(image)
        return {'content': text}
    except Exception as e:
        return {'error': f'Image processing error: {str(e)}'}

def process_excel(file_bytes):
    """Extract text from Excel files."""
    try:
        df = pd.read_excel(io.BytesIO(file_bytes))
        # Convert DataFrame to formatted string
        text = df.to_string(index=False)
        return {'content': text}
    except Exception as e:
        return {'error': f'Excel processing error: {str(e)}'}

def process_word(file_bytes):
    """Extract text from Word documents."""
    try:
        doc = DocxDocument(io.BytesIO(file_bytes))
        text = '\n'.join([paragraph.text for paragraph in doc.paragraphs])
        return {'content': text}
    except Exception as e:
        return {'error': f'Word processing error: {str(e)}'}

if __name__ == '__main__':
    import sys
    import base64
    
    # Read input from stdin
    input_data = json.loads(sys.stdin.read())
    file_bytes = base64.b64decode(input_data['file'])
    file_type = input_data['type']
    
    # Process file and return result
    result = process_file(file_bytes, file_type)
    print(json.dumps(result))