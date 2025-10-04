# Deploy to Render

This guide will help you deploy the Multi-Agent Platform to Render.

## Prerequisites

1. **Render Account**: Sign up at [render.com](https://render.com)
2. **GitHub Repository**: Push your code to GitHub
3. **API Keys** (Optional): OpenAI, Pinecone, Supabase keys

## Quick Deploy

### Option 1: One-Click Deploy with render.yaml

1. **Prepare Your Code**:
   ```bash
   # Run the deployment preparation script
   .\scripts\deploy-to-render.ps1  # Windows PowerShell
   # or
   ./scripts/deploy-to-render.sh   # Linux/Mac
   ```

2. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Prepare for Render deployment"
   git push origin main
   ```

3. **Deploy via Render**:
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New +" → "Blueprint"
   - Connect your GitHub repository
   - Render will automatically detect `render.yaml`
   - Click "Apply" to deploy all services
   - Wait for deployment to complete (~10-15 minutes)

### Option 2: Manual Service Creation

If you prefer manual setup:

#### 1. Backend Service
- **Type**: Web Service
- **Environment**: Docker
- **Dockerfile**: `./backend/Dockerfile`
- **Docker Context**: `./backend`
- **Plan**: Starter ($7/month)

#### 2. Frontend Service
- **Type**: Web Service  
- **Environment**: Docker
- **Dockerfile**: `./Dockerfile`
- **Docker Context**: `./`
- **Plan**: Starter ($7/month)

#### 3. Neo4j Database
- **Type**: Private Service
- **Plan**: Starter ($7/month)
- **Dockerfile**: `./neo4j/Dockerfile`

#### 4. Ollama Service (Optional)
- **Type**: Web Service
- **Environment**: Docker
- **Dockerfile**: `./ollama/Dockerfile`
- **Plan**: Starter ($7/month)

## Environment Variables

Set these in each service's environment variables section:

### Backend Service
```
DATABASE_URL=sqlite:///./app.db
NEO4J_URI=bolt://xagent-neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password123
OPENAI_API_KEY=your_openai_key (optional)
PINECONE_API_KEY=your_pinecone_key (optional)
```

### Frontend Service
```
VITE_API_URL=https://your-backend-service.onrender.com
VITE_OLLAMA_BASE_URL=https://your-ollama-service.onrender.com
VITE_SUPABASE_URL=your_supabase_url (optional)
VITE_SUPABASE_ANON_KEY=your_supabase_key (optional)
```

## Service URLs

After deployment, you'll get these URLs:

- **Frontend**: `https://xagent-frontend.onrender.com`
- **Backend API**: `https://xagent-backend.onrender.com`
- **Neo4j Browser**: `https://xagent-neo4j.onrender.com:7474`
- **Ollama API**: `https://xagent-ollama.onrender.com`

## Cost Estimate

**Monthly Cost**: ~$28-35
- Backend: $7
- Frontend: $7  
- Neo4j: $7
- Ollama: $7 (optional)

## Post-Deployment

1. **Test Services**:
   ```bash
   # Test backend health
   curl https://your-backend.onrender.com/health
   
   # Test frontend
   # Visit https://your-frontend.onrender.com
   ```

2. **Initialize Neo4j**:
   - Visit Neo4j Browser
   - Login with neo4j/password123
   - Run initialization scripts

3. **Configure Ollama Models** (if using):
   ```bash
   curl https://your-ollama.onrender.com/api/pull -d '{"name":"llama2"}'
   ```

## Troubleshooting

### Common Issues:

1. **Build Failures**:
   - Check Dockerfile paths
   - Verify environment variables
   - Check service dependencies

2. **Service Communication**:
   - Use internal service names for communication
   - Check network configuration

3. **Memory Issues**:
   - Monitor service logs
   - Consider upgrading plans if needed

## Scaling

- **Starter Plan**: Good for development/testing
- **Standard Plan**: Better for production use
- **Pro Plan**: High-traffic applications

## Support

- Render Documentation: [render.com/docs](https://render.com/docs)
- Render Community: [community.render.com](https://community.render.com)
