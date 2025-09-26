# 🚀 IDP System Deployment Guide

This guide will help you deploy your IDP system to Render with automatic CI/CD pipeline.

## 📋 Prerequisites

1. **GitHub Repository** - Your code should be in a GitHub repository
2. **Render Account** - Sign up at [render.com](https://render.com)
3. **GitHub Secrets** - Configure secrets in your GitHub repository
4. **Virtual Environment** - Your `neoidp` virtual environment in `backend/neoidp/` (for local development)

---

## 🏠 Local Development Setup

### Full-Stack Development

Your IDP system includes both a React frontend and Python backend. You have several options for local development:

#### Option 1: Full-Stack Development (Recommended)
```bash
# Windows
start-fullstack-dev.bat

# PowerShell
.\start-fullstack-dev.ps1
```

This will start both frontend and backend servers automatically.

#### Option 2: Backend Only
```bash
cd backend
neoidp\Scripts\activate  # Windows
python main.py
```

#### Option 3: Frontend Only
```bash
npm run dev
```

### Development URLs

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

### Virtual Environment Notes

- The `neoidp` virtual environment contains all your ML dependencies
- For deployment, the Docker container will install dependencies fresh
- The virtual environment is excluded from Docker builds via `.dockerignore`
- Local development uses the virtual environment, production uses Docker

### Frontend Development

- **Framework**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **API Client**: Axios
- **Build Output**: `dist/` directory

---

## 🗄️ Step 1: Configure Supabase (You Already Have This!)

### **✅ Great News!**
You already have a comprehensive Supabase setup:
- **Supabase Client**: `backend/models/supabase_client.py`
- **Database Config**: `backend/config/database.py`
- **Setup Guides**: Multiple comprehensive guides

### **Quick Setup:**
1. **Run the setup script:**
   ```bash
   python setup-supabase.py
   ```

2. **Or manually create `backend/.env`:**
   ```bash
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   DATABASE_TYPE=supabase
   ```

3. **Get credentials from your Supabase Dashboard → Settings → API**

### **Alternative: PostgreSQL**
- Use the PostgreSQL service in `render.yaml`
- No additional setup needed

See `DATABASE_SETUP_GUIDE.md` for detailed instructions.

---

## 🔧 Step 2: Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:

```
RENDER_SERVICE_ID=your_render_service_id
RENDER_API_KEY=your_render_api_key
```

### **If using Supabase, also add:**
```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### How to get these values:

1. **RENDER_API_KEY:**
   - Go to Render Dashboard → Account Settings → API Keys
   - Create a new API key
   - Copy the key value

2. **RENDER_SERVICE_ID:**
   - After creating your service on Render
   - Go to your service → Settings → General
   - Copy the Service ID

---

## 🏗️ Step 2: Deploy to Render

### Option A: Automatic Deployment (Recommended)

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Initial deployment setup"
   git push origin main
   ```

2. **GitHub Actions will automatically:**
   - Run tests
   - Deploy to Render
   - Notify deployment status

### Option B: Manual Deployment

1. **Connect GitHub to Render:**
   - Go to [render.com](https://render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select your repository

2. **Configure Service:**
   - **Name:** `neocaptured-idp-backend`
   - **Environment:** `Docker`
   - **Dockerfile Path:** `./backend/Dockerfile`
   - **Plan:** `Starter` (or higher for production)
   - **Region:** `Oregon` (or closest to your users)

3. **Environment Variables:**
   ```
   ENVIRONMENT=production
   PYTHONPATH=/app
   OCR_LANG=en,ar
   FRONTEND_URL=https://your-service-name.onrender.com
   CORS_ORIGINS=https://your-service-name.onrender.com
   MAX_WORKERS=2
   LOG_LEVEL=INFO
   ```

4. **Deploy:**
   - Click "Create Web Service"
   - Render will automatically build and deploy

---

## 🗄️ Step 3: Set Up Database

1. **Create PostgreSQL Service:**
   - Go to Render Dashboard
   - Click "New +" → "PostgreSQL"
   - **Name:** `neocaptured-idp-db`
   - **Plan:** `Starter`
   - **Region:** Same as your web service

2. **Get Database URL:**
   - Go to your database service
   - Copy the "External Database URL"
   - Add it to your web service environment variables:
     ```
     DATABASE_URL=postgresql://user:password@host:port/database
     ```

---

## 🔄 Step 4: Set Up Redis (Optional)

1. **Create Redis Service:**
   - Go to Render Dashboard
   - Click "New +" → "Redis"
   - **Name:** `neocaptured-idp-redis`
   - **Plan:** `Starter`

2. **Add Redis URL to environment variables:**
   ```
   REDIS_URL=redis://user:password@host:port
   ```

---

## 🎯 Step 5: Configure Auto-Deployment

1. **Enable Auto-Deploy:**
   - Go to your web service on Render
   - Settings → Build & Deploy
   - Enable "Auto-Deploy"
   - Set branch to `main`

2. **Set up GitHub Actions:**
   - The `.github/workflows/deploy-to-render.yml` file is already configured
   - It will automatically deploy when you push to main branch

---

## 🔍 Step 6: Verify Deployment

1. **Check Health Endpoint:**
   ```
   https://your-service-name.onrender.com/health
   ```

2. **Test Document Processing:**
   ```bash
   curl -X POST https://your-service-name.onrender.com/inference/process-document \
     -F "file=@test_document.pdf"
   ```

3. **Check Logs:**
   - Go to your service on Render
   - Click "Logs" tab
   - Monitor for any errors

---

## 🚨 Troubleshooting

### Common Issues:

1. **Build Fails:**
   - Check Dockerfile path in render.yaml
   - Verify all dependencies in requirements.txt
   - Check build logs in Render dashboard

2. **Service Won't Start:**
   - Verify environment variables
   - Check health check endpoint
   - Review application logs

3. **Database Connection Issues:**
   - Verify DATABASE_URL format
   - Check database service status
   - Ensure database is accessible

4. **Memory Issues:**
   - Upgrade to higher plan
   - Optimize model loading
   - Use model caching

### Performance Optimization:

1. **Upgrade Plan:**
   - Starter plan has limited resources
   - Consider upgrading for production use

2. **Model Optimization:**
   - Use smaller models for faster startup
   - Implement model caching
   - Use CPU-optimized versions

3. **Caching:**
   - Enable Redis for caching
   - Cache processed results
   - Use CDN for static files

---

## 📊 Monitoring

1. **Health Checks:**
   - Monitor `/health` endpoint
   - Set up uptime monitoring
   - Configure alerts

2. **Logs:**
   - Review application logs regularly
   - Set up log aggregation
   - Monitor error rates

3. **Performance:**
   - Track response times
   - Monitor memory usage
   - Watch for timeouts

---

## 🔄 CI/CD Pipeline

Your deployment pipeline includes:

1. **Code Push** → GitHub
2. **GitHub Actions** → Run tests
3. **Render Deploy** → Automatic deployment
4. **Health Check** → Verify deployment
5. **Notification** → Success/failure status

### Pipeline Features:
- ✅ Automatic testing before deployment
- ✅ Code linting and quality checks
- ✅ Automatic deployment on main branch
- ✅ Health checks and monitoring
- ✅ Rollback capability

---

## 🎉 Success!

Once deployed, your IDP system will be available at:
```
https://your-service-name.onrender.com
```

### Available Endpoints:
- `/health` - Health check
- `/docs` - API documentation
- `/inference/process-document` - Document processing
- `/annotation/list` - List annotations
- `/training/models` - List trained models

### Next Steps:
1. Set up custom domain (optional)
2. Configure SSL certificates
3. Set up monitoring and alerts
4. Scale resources as needed

---

## 📞 Support

If you encounter issues:
1. Check Render documentation
2. Review GitHub Actions logs
3. Check application logs in Render dashboard
4. Verify environment variables and configuration

**Happy Deploying! 🚀**
