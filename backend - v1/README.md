# IDP Backend Setup

## Prerequisites

- Python 3.8 or higher
- pip (Python package installer)
- Virtual environment (recommended)

## Installation

1. Create and activate a virtual environment:

```bash
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

## Running the Server

Start the FastAPI server:

```bash
uvicorn main:app --reload --port 8000
```

The backend will be available at http://localhost:8000

## API Endpoints

- POST /api/process-document
  - Accepts multipart/form-data with a file
  - Returns extracted fields and confidence scores

## Environment Variables

Create a `.env` file in the backend directory:

```
MODEL_PATH=naver-clova-ix/donut-base-finetuned-cord-v2
CUDA_VISIBLE_DEVICES=0  # Set to -1 for CPU only
```

## Testing the API

You can test the API using curl:

```bash
curl -X POST -F "file=@/path/to/your/document.pdf" http://localhost:8000/api/process-document
```

Or use the Swagger UI at http://localhost:8000/docs