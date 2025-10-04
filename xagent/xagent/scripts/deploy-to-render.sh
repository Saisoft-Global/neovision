#!/bin/bash

# XAgent Render Deployment Script
# This script helps prepare and deploy the XAgent platform to Render

set -e

echo "🚀 XAgent Render Deployment Script"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "render.yaml" ]; then
    print_error "render.yaml not found. Please run this script from the project root."
    exit 1
fi

print_status "Checking deployment prerequisites..."

# Check if git is available
if ! command -v git &> /dev/null; then
    print_error "Git is not installed or not in PATH"
    exit 1
fi

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    print_error "Not in a git repository. Please initialize git and push to GitHub first."
    exit 1
fi

# Check if there are uncommitted changes
if ! git diff-index --quiet HEAD --; then
    print_warning "You have uncommitted changes. Consider committing them first."
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check required files
print_status "Checking required files..."

required_files=(
    "render.yaml"
    "backend/Dockerfile"
    "Dockerfile"
    "neo4j/Dockerfile"
    "ollama/Dockerfile"
    "backend/requirements.txt"
    "package.json"
    "nginx.conf"
)

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        print_error "Required file missing: $file"
        exit 1
    fi
done

print_success "All required files found"

# Validate render.yaml syntax (basic check)
print_status "Validating render.yaml..."
if ! grep -q "services:" render.yaml; then
    print_error "Invalid render.yaml: missing 'services:' section"
    exit 1
fi

if ! grep -q "type: web" render.yaml; then
    print_error "Invalid render.yaml: missing web services"
    exit 1
fi

print_success "render.yaml validation passed"

# Check Docker files
print_status "Validating Dockerfiles..."

# Check backend Dockerfile
if ! grep -q "FROM python:3.11-slim" backend/Dockerfile; then
    print_warning "Backend Dockerfile may need updates"
fi

if ! grep -q "curl" backend/Dockerfile; then
    print_warning "Backend Dockerfile missing curl for health checks"
fi

# Check frontend Dockerfile
if ! grep -q "FROM node:20-alpine" Dockerfile; then
    print_warning "Frontend Dockerfile may need updates"
fi

# Check Neo4j Dockerfile
if ! grep -q "FROM neo4j:5.15" neo4j/Dockerfile; then
    print_warning "Neo4j Dockerfile may need updates"
fi

# Check Ollama Dockerfile
if ! grep -q "FROM ollama/ollama:latest" ollama/Dockerfile; then
    print_warning "Ollama Dockerfile may need updates"
fi

print_success "Dockerfile validation completed"

# Environment variables check
print_status "Checking environment variables..."

if [ ! -f "render.env.template" ]; then
    print_warning "render.env.template not found"
else
    print_success "Environment template found"
fi

# Git status
print_status "Checking git status..."
current_branch=$(git branch --show-current)
print_status "Current branch: $current_branch"

# Check if remote exists
if git remote -v | grep -q "origin"; then
    print_success "Git remote 'origin' configured"
    
    # Check if we can push
    if git remote get-url origin | grep -q "github.com"; then
        print_success "GitHub remote detected"
    else
        print_warning "Remote is not GitHub. Render requires GitHub for Blueprint deployment."
    fi
else
    print_warning "No git remote 'origin' found. You'll need to add GitHub remote for Render deployment."
fi

echo
print_status "Deployment preparation complete!"
echo
echo "Next steps:"
echo "1. Push your code to GitHub:"
echo "   git add ."
echo "   git commit -m 'Prepare for Render deployment'"
echo "   git push origin $current_branch"
echo
echo "2. Go to Render Dashboard: https://dashboard.render.com"
echo "3. Click 'New +' → 'Blueprint'"
echo "4. Connect your GitHub repository"
echo "5. Deploy using the render.yaml file"
echo
echo "6. After deployment, set environment variables:"
echo "   - Backend: DATABASE_URL, NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD"
echo "   - Frontend: VITE_API_URL, VITE_OLLAMA_BASE_URL"
echo
echo "7. Test your deployment:"
echo "   curl https://your-backend-service.onrender.com/health"
echo
print_success "Ready for Render deployment! 🚀"
