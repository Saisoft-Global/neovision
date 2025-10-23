# ============================================
# START COMPLETE xAgent SYSTEM
# Starts both Frontend and Backend
# ============================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 Starting xAgent Complete System" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ============================================
# Check prerequisites
# ============================================

Write-Host "📋 Checking prerequisites..." -ForegroundColor Yellow

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  WARNING: .env file not found" -ForegroundColor Yellow
    Write-Host "   The backend may not work without environment variables" -ForegroundColor Yellow
    Write-Host "   Create .env from render.env.template if needed" -ForegroundColor Yellow
    Write-Host ""
}

# Check if Python is installed
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✅ Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python not found! Install Python 3.8+ first" -ForegroundColor Red
    exit 1
}

# Check if Node is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found! Install Node.js first" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🔧 Starting Backend (FastAPI)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Start backend in new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
    Write-Host '🐍 Starting Backend Server...' -ForegroundColor Cyan
    Write-Host ''
    cd '$PWD\backend'
    
    Write-Host '📦 Installing Python dependencies...' -ForegroundColor Yellow
    pip install -r requirements.txt --quiet
    
    Write-Host ''
    Write-Host '✅ Dependencies installed' -ForegroundColor Green
    Write-Host ''
    Write-Host '🚀 Starting FastAPI server on http://localhost:8000' -ForegroundColor Cyan
    Write-Host '📚 API Docs: http://localhost:8000/api/docs' -ForegroundColor Cyan
    Write-Host ''
    
    python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
"@

Write-Host "✅ Backend starting in new window..." -ForegroundColor Green
Write-Host ""
Write-Host "⏳ Waiting 5 seconds for backend to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "⚛️  Starting Frontend (React + Vite)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📦 Checking npm dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing npm dependencies..." -ForegroundColor Yellow
    npm install
}

Write-Host ""
Write-Host "🚀 Starting Vite dev server..." -ForegroundColor Cyan
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ SYSTEM STARTING" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "🔌 Backend:  http://localhost:8000" -ForegroundColor Cyan
Write-Host "📚 API Docs: http://localhost:8000/api/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "🛑 Press Ctrl+C to stop the frontend" -ForegroundColor Yellow
Write-Host "🛑 Close the backend window to stop the backend" -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Start frontend (this window)
npm run dev


