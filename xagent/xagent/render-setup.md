# Render Service Setup Guide

## Environment Variables to Add

Copy and paste these into your Render service environment variables:

### Required Variables
```
DATABASE_URL=sqlite:///./app.db
NEO4J_USER=neo4j
NEO4J_PASSWORD=password123
```

### Optional Variables (add if you have them)
```
OPENAI_API_KEY=your_openai_api_key_here
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_ENVIRONMENT=your_pinecone_environment
PINECONE_INDEX_NAME=your_pinecone_index_name
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

## Build Commands

### Build Command
```
pip install -r backend/requirements.txt
```

### Start Command
```
cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT
```

## Service URL
After deployment, your service will be available at:
**https://neocaptured-idp-app.onrender.com**

## Health Check
Test your deployment:
```bash
curl https://neocaptured-idp-app.onrender.com/health
```

Expected response:
```json
{"status": "healthy"}
```
