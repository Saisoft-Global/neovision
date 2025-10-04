# Deploy XAgent to Render - Complete Guide

## 🚀 Quick Deploy (Recommended)

### Step 1: Prepare Your Repository
1. **Push to GitHub**: Make sure your code is pushed to a GitHub repository
2. **Verify Files**: Ensure these files exist in your repo root:
   - `render.yaml` ✅
   - `backend/Dockerfile` ✅
   - `Dockerfile` (frontend) ✅
   - `neo4j/Dockerfile` ✅
   - `ollama/Dockerfile` ✅

### Step 2: Deploy via Render Blueprint
1. **Go to Render Dashboard**: https://dashboard.render.com
2. **Click "New +" → "Blueprint"**
3. **Connect GitHub**: Select your repository
4. **Deploy**: Render will detect `render.yaml` and deploy all services automatically
5. **Wait**: Deployment takes ~10-15 minutes

### Step 3: Configure Environment Variables
After deployment, set these environment variables in each service:

#### Backend Service (xagent-backend)
```
DATABASE_URL=sqlite:///./app.db
NEO4J_URI=bolt://xagent-neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password123
```

#### Frontend Service (xagent-frontend)
```
VITE_API_URL=https://xagent-backend.onrender.com
VITE_OLLAMA_BASE_URL=https://xagent-ollama.onrender.com
```

#### Optional API Keys (if you have them)
Add these to the backend service:
```
OPENAI_API_KEY=your_openai_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_ENVIRONMENT=your_pinecone_environment
PINECONE_INDEX_NAME=your_pinecone_index_name
```

## 🔧 Manual Deployment (Alternative)

If Blueprint deployment doesn't work, create services manually:

### 1. Backend Service
- **Type**: Web Service
- **Environment**: Docker
- **Dockerfile Path**: `./backend/Dockerfile`
- **Docker Context**: `./backend`
- **Plan**: Starter ($7/month)
- **Build Command**: (leave empty)
- **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### 2. Frontend Service
- **Type**: Web Service
- **Environment**: Docker
- **Dockerfile Path**: `./Dockerfile`
- **Docker Context**: `./`
- **Plan**: Starter ($7/month)

### 3. Neo4j Database
- **Type**: Private Service
- **Plan**: Starter ($7/month)
- **Dockerfile Path**: `./neo4j/Dockerfile`
- **Docker Context**: `./`

### 4. Ollama Service (Optional)
- **Type**: Web Service
- **Environment**: Docker
- **Dockerfile Path**: `./ollama/Dockerfile`
- **Docker Context**: `./`
- **Plan**: Starter ($7/month)
- **Health Check Path**: `/api/tags`

## 🧪 Testing Your Deployment

### 1. Health Checks
```bash
# Test backend
curl https://xagent-backend.onrender.com/health

# Test frontend
curl https://xagent-frontend.onrender.com

# Test Neo4j (browser)
https://xagent-neo4j.onrender.com:7474

# Test Ollama
curl https://xagent-ollama.onrender.com/api/tags
```

### 2. Expected Responses
- **Backend Health**: `{"status": "healthy"}`
- **Frontend**: HTML page loads
- **Neo4j**: Login page (neo4j/password123)
- **Ollama**: `{"models": []}` (empty initially)

## 💰 Cost Breakdown

**Monthly Cost**: ~$28
- Backend: $7
- Frontend: $7
- Neo4j: $7
- Ollama: $7 (optional)

## 🔍 Troubleshooting

### Common Issues & Solutions

#### 1. Build Failures
**Problem**: Service fails to build
**Solution**: 
- Check Dockerfile paths in render.yaml
- Verify all required files exist
- Check service logs in Render dashboard

#### 2. Service Communication Issues
**Problem**: Services can't communicate
**Solution**:
- Use internal service names (e.g., `xagent-neo4j:7687`)
- Check environment variables are set correctly
- Verify service dependencies in render.yaml

#### 3. Neo4j Connection Issues
**Problem**: Backend can't connect to Neo4j
**Solution**:
- Ensure NEO4J_URI uses internal name: `bolt://xagent-neo4j:7687`
- Check Neo4j service is running
- Verify password matches in both services

#### 4. Frontend API Calls Failing
**Problem**: Frontend can't reach backend
**Solution**:
- Set VITE_API_URL to your backend URL
- Check CORS configuration in backend
- Verify backend health endpoint

#### 5. Memory Issues
**Problem**: Services running out of memory
**Solution**:
- Monitor service logs
- Consider upgrading to Standard plan ($25/month)
- Optimize Neo4j memory settings

### Service Logs
Access logs in Render dashboard:
1. Go to your service
2. Click "Logs" tab
3. Check for error messages

### Database Issues
If SQLite issues occur:
1. Check DATABASE_URL environment variable
2. Verify file permissions
3. Consider using PostgreSQL instead

## 🚀 Scaling Up

### Production Recommendations
1. **Upgrade Plans**: Move to Standard ($25/month) for production
2. **Use PostgreSQL**: Replace SQLite with managed PostgreSQL
3. **Add Monitoring**: Set up health checks and monitoring
4. **SSL Certificates**: Ensure HTTPS is enabled
5. **Backup Strategy**: Set up regular database backups

### Performance Optimization
1. **Enable Caching**: Add Redis for session storage
2. **CDN**: Use CloudFront for static assets
3. **Database Indexing**: Optimize Neo4j queries
4. **Load Balancing**: Use multiple instances for high traffic

## 📞 Support

### Render Resources
- [Render Documentation](https://render.com/docs)
- [Render Community](https://community.render.com)
- [Render Status](https://status.render.com)

### Getting Help
1. Check service logs first
2. Verify environment variables
3. Test individual services
4. Check Render status page
5. Post in Render community with logs

## ✅ Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] render.yaml exists and is valid
- [ ] All Dockerfiles exist and are valid
- [ ] Services deployed via Blueprint or manually
- [ ] Environment variables set
- [ ] Backend health check passes
- [ ] Frontend loads correctly
- [ ] Neo4j accessible
- [ ] Services can communicate
- [ ] Optional: Ollama working
- [ ] Optional: API keys configured

## 🎉 Success!

Once all services are deployed and healthy, your XAgent platform will be available at:
- **Frontend**: https://xagent-frontend.onrender.com
- **Backend API**: https://xagent-backend.onrender.com
- **Neo4j Browser**: https://xagent-neo4j.onrender.com:7474
- **Ollama API**: https://xagent-ollama.onrender.com

Your multi-agent platform is now live! 🚀
