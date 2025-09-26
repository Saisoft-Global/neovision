#!/bin/bash

# IDP System Deployment Setup Script
# This script helps set up the deployment pipeline

echo "🚀 Setting up IDP System Deployment Pipeline"
echo "=============================================="

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Error: Not in a git repository. Please initialize git first."
    exit 1
fi

# Check if GitHub remote exists
if ! git remote get-url origin > /dev/null 2>&1; then
    echo "❌ Error: No GitHub remote found. Please add your GitHub repository:"
    echo "   git remote add origin https://github.com/yourusername/your-repo.git"
    exit 1
fi

echo "✅ Git repository detected"

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p backend/tests
mkdir -p backend/config
mkdir -p backend/logs
mkdir -p backend/models/trained
mkdir -p backend/uploads
mkdir -p backend/temp

echo "✅ Directories created"

# Make scripts executable
echo "🔧 Setting up permissions..."
chmod +x backend/deploy.py
chmod +x setup-deployment.sh

echo "✅ Permissions set"

# Check if virtual environment exists
if [ -d "backend/neoidp" ]; then
    echo "✅ Virtual environment 'neoidp' found in backend/"
else
    echo "⚠️  Virtual environment 'neoidp' not found in backend/"
    echo "   This is needed for local development"
fi

# Check if render.yaml exists
if [ -f "render.yaml" ]; then
    echo "✅ render.yaml found"
else
    echo "❌ render.yaml not found. Please ensure it exists."
    exit 1
fi

# Check if Dockerfile exists
if [ -f "backend/Dockerfile" ]; then
    echo "✅ Backend Dockerfile found"
else
    echo "❌ Backend Dockerfile not found. Please ensure it exists."
    exit 1
fi

# Check if GitHub Actions workflow exists
if [ -f ".github/workflows/deploy-to-render.yml" ]; then
    echo "✅ GitHub Actions workflow found"
else
    echo "❌ GitHub Actions workflow not found. Please ensure it exists."
    exit 1
fi

echo ""
echo "🏠 Local Development:"
echo "===================="
echo ""
echo "Full-Stack Development (Recommended):"
echo "  Windows:"
echo "    start-fullstack-dev.bat"
echo "  PowerShell:"
echo "    .\\start-fullstack-dev.ps1"
echo ""
echo "Backend Only:"
echo "  Windows:"
echo "    cd backend"
echo "    neoidp\\Scripts\\activate"
echo "    python main.py"
echo ""
echo "Frontend Only:"
echo "    npm run dev"
echo ""
echo "Development URLs:"
echo "  Frontend: http://localhost:5173"
echo "  Backend: http://localhost:8000"
echo "  API Docs: http://localhost:8000/docs"
echo ""
echo "🎯 Next Steps:"
echo "=============="
echo ""
echo "1. 🔑 Set up GitHub Secrets:"
echo "   - Go to your GitHub repository"
echo "   - Settings → Secrets and variables → Actions"
echo "   - Add RENDER_SERVICE_ID and RENDER_API_KEY"
echo ""
echo "2. 🏗️ Deploy to Render:"
echo "   - Go to render.com"
echo "   - Create new Web Service"
echo "   - Connect your GitHub repository"
echo "   - Use the render.yaml configuration"
echo ""
echo "3. 🗄️ Set up Database:"
echo "   - Create PostgreSQL service on Render"
echo "   - Add DATABASE_URL to environment variables"
echo ""
echo "4. 🚀 Push to Deploy:"
echo "   git add ."
echo "   git commit -m 'Setup deployment pipeline'"
echo "   git push origin main"
echo ""
echo "5. ✅ Verify Deployment:"
echo "   - Check Render dashboard for deployment status"
echo "   - Test health endpoint: https://your-service.onrender.com/health"
echo ""
echo "📖 For detailed instructions, see DEPLOYMENT_GUIDE.md"
echo ""
echo "🎉 Setup complete! Your IDP system is ready for deployment."
