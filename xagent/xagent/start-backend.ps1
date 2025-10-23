# Start Backend Server Script
# This script starts the FastAPI backend with all required environment variables

Write-Host "🚀 Starting XAgent Backend Server..." -ForegroundColor Green

# Check for .env file
$envFile = Join-Path $PSScriptRoot ".env"
if (Test-Path $envFile) {
    Write-Host "✅ Found .env file - Python dotenv will load it automatically" -ForegroundColor Green
} else {
    Write-Host "⚠️  WARNING: No .env file found at $envFile" -ForegroundColor Red
    Write-Host "   Create .env file with your OpenAI and other API keys" -ForegroundColor Yellow
    Write-Host "   You can copy from env.caddy.template or .env_bkp" -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit 1
    }
}

# Navigate to backend directory
Set-Location -Path "backend"

Write-Host ""
Write-Host "📝 Note: Backend will load environment variables from:" -ForegroundColor Cyan
Write-Host "   1. Root .env file" -ForegroundColor Gray
Write-Host "   2. backend/.env file (if exists)" -ForegroundColor Gray
Write-Host "   The backend will log which keys are loaded on startup" -ForegroundColor Gray
Write-Host ""

Write-Host "🌐 Starting server on http://localhost:8000" -ForegroundColor Cyan
Write-Host "📚 API Docs will be available at http://localhost:8000/api/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Start the server
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
