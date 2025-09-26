# Document Processing API

This API provides endpoints for processing documents using OCR technology. It can extract text, fields, tables, and other structured information from various document types including invoices, receipts, and bank statements.

## Setup

1. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

2. Make sure Tesseract OCR is installed on your system:
   - Windows: Download and install from [https://github.com/UB-Mannheim/tesseract/wiki](https://github.com/UB-Mannheim/tesseract/wiki)
   - Linux: `sudo apt-get install tesseract-ocr`
   - macOS: `brew install tesseract`

3. Run the API server:
   ```
   python app.py
   ```

The server will start on http://localhost:8000

## API Endpoints

### 1. Process Document (Synchronous)
- **URL**: `/process-document/`
- **Method**: `POST`
- **Description**: Process a document and return the results immediately
- **Request**: Form data with a file upload
- **Response**: JSON with processing results

### 2. Process Document (Asynchronous)
- **URL**: `/process-document-async/`
- **Method**: `POST`
- **Description**: Start processing a document in the background
- **Request**: Form data with a file upload
- **Response**: JSON with job ID for tracking

### 3. Check Job Status
- **URL**: `/job-status/{job_id}`
- **Method**: `GET`
- **Description**: Check the status of an asynchronous processing job
- **Response**: JSON with job status and results if available

### 4. Health Check
- **URL**: `/health`
- **Method**: `GET`
- **Description**: Check if the API is running
- **Response**: JSON with status

## Example Usage

### Using cURL

```bash
# Process a document synchronously
curl -X POST -F "file=@/path/to/document.pdf" http://localhost:8000/process-document/

# Process a document asynchronously
curl -X POST -F "file=@/path/to/document.pdf" http://localhost:8000/process-document-async/

# Check job status
curl http://localhost:8000/job-status/{job_id}
```

### Using Python

```python
import requests

# Process a document
files = {'file': open('document.pdf', 'rb')}
response = requests.post('http://localhost:8000/process-document/', files=files)
result = response.json()
print(result)

# Process a document asynchronously
response = requests.post('http://localhost:8000/process-document-async/', files=files)
job_id = response.json()['job_id']

# Check job status
status_response = requests.get(f'http://localhost:8000/job-status/{job_id}')
status = status_response.json()
print(status)
```

## Response Format

The API returns JSON responses with the following structure:

```json
{
  "job_id": "uuid-string",
  "status": "completed",
  "result": {
    "document_type": "invoice",
    "extracted_text": "Full text extracted from the document",
    "fields": {
      "invoice_number": ["INV-12345"],
      "date": ["2023-01-01"],
      "amount": ["1000.00"],
      "vendor_name": ["Company Name"]
    },
    "layout": {
      "headers": [...],
      "body": [...],
      "footers": [...]
    },
    "tables": [
      [
        ["Item", "Description", "Quantity", "Price"],
        ["1", "Product A", "2", "100.00"],
        ["2", "Product B", "1", "200.00"]
      ]
    ],
    "confidence": 0.85
  }
}
```