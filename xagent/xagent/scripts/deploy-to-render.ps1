# XAgent Render Deployment Script (PowerShell)
# This script helps prepare and deploy the XAgent platform to Render

param(
    [switch]$SkipChecks
)

Write-Host "🚀 XAgent Render Deployment Script" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

# Function to print colored output
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Check if we're in the right directory
if (-not (Test-Path "render.yaml")) {
    Write-Error "render.yaml not found. Please run this script from the project root."
    exit 1
}

Write-Status "Checking deployment prerequisites..."

# Check if git is available
try {
    $null = git --version
} catch {
    Write-Error "Git is not installed or not in PATH"
    exit 1
}

# Check if we're in a git repository
if (-not (Test-Path ".git")) {
    Write-Error "Not in a git repository. Please initialize git and push to GitHub first."
    exit 1
}

# Check if there are uncommitted changes
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Warning "You have uncommitted changes. Consider committing them first."
    $response = Read-Host "Continue anyway? (y/N)"
    if ($response -notmatch "^[Yy]$") {
        exit 1
    }
}

# Check required files
Write-Status "Checking required files..."

$requiredFiles = @(
    "render.yaml",
    "backend/Dockerfile",
    "Dockerfile",
    "neo4j/Dockerfile",
    "ollama/Dockerfile",
    "backend/requirements.txt",
    "package.json",
    "nginx.conf"
)

foreach ($file in $requiredFiles) {
    if (-not (Test-Path $file)) {
        Write-Error "Required file missing: $file"
        exit 1
    }
}

Write-Success "All required files found"

# Validate render.yaml syntax (basic check)
Write-Status "Validating render.yaml..."
$renderYamlContent = Get-Content "render.yaml" -Raw
if ($renderYamlContent -notmatch "services:") {
    Write-Error "Invalid render.yaml: missing 'services:' section"
    exit 1
}

if ($renderYamlContent -notmatch "type: web") {
    Write-Error "Invalid render.yaml: missing web services"
    exit 1
}

Write-Success "render.yaml validation passed"

# Check Docker files
Write-Status "Validating Dockerfiles..."

# Check backend Dockerfile
$backendDockerfile = Get-Content "backend/Dockerfile" -Raw
if ($backendDockerfile -notmatch "FROM python:3.11-slim") {
    Write-Warning "Backend Dockerfile may need updates"
}

if ($backendDockerfile -notmatch "curl") {
    Write-Warning "Backend Dockerfile missing curl for health checks"
}

# Check frontend Dockerfile
$frontendDockerfile = Get-Content "Dockerfile" -Raw
if ($frontendDockerfile -notmatch "FROM node:20-alpine") {
    Write-Warning "Frontend Dockerfile may need updates"
}

# Check Neo4j Dockerfile
$neo4jDockerfile = Get-Content "neo4j/Dockerfile" -Raw
if ($neo4jDockerfile -notmatch "FROM neo4j:5.15") {
    Write-Warning "Neo4j Dockerfile may need updates"
}

# Check Ollama Dockerfile
$ollamaDockerfile = Get-Content "ollama/Dockerfile" -Raw
if ($ollamaDockerfile -notmatch "FROM ollama/ollama:latest") {
    Write-Warning "Ollama Dockerfile may need updates"
}

Write-Success "Dockerfile validation completed"

# Environment variables check
Write-Status "Checking environment variables..."

if (-not (Test-Path "render.env.template")) {
    Write-Warning "render.env.template not found"
} else {
    Write-Success "Environment template found"
}

# Git status
Write-Status "Checking git status..."
$currentBranch = git branch --show-current
Write-Status "Current branch: $currentBranch"

# Check if remote exists
$remotes = git remote -v
if ($remotes -match "origin") {
    Write-Success "Git remote 'origin' configured"
    
    # Check if we can push
    if ($remotes -match "github.com") {
        Write-Success "GitHub remote detected"
    } else {
        Write-Warning "Remote is not GitHub. Render requires GitHub for Blueprint deployment."
    }
} else {
    Write-Warning "No git remote 'origin' found. You'll need to add GitHub remote for Render deployment."
}

Write-Host ""
Write-Status "Deployment preparation complete!"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Push your code to GitHub:"
Write-Host "   git add ."
Write-Host "   git commit -m 'Prepare for Render deployment'"
Write-Host "   git push origin $currentBranch"
Write-Host ""
Write-Host "2. Go to Render Dashboard: https://dashboard.render.com"
Write-Host "3. Click 'New +' → 'Blueprint'"
Write-Host "4. Connect your GitHub repository"
Write-Host "5. Deploy using the render.yaml file"
Write-Host ""
Write-Host "6. After deployment, set environment variables:"
Write-Host "   - Backend: DATABASE_URL, NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD"
Write-Host "   - Frontend: VITE_API_URL, VITE_OLLAMA_BASE_URL"
Write-Host ""
Write-Host "7. Test your deployment:"
Write-Host "   curl https://your-backend-service.onrender.com/health"
Write-Host ""
Write-Success "Ready for Render deployment! 🚀"
