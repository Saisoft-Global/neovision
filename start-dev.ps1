# IDP Backend Development Server Startup Script
Write-Host "🚀 Starting IDP Backend Development Server" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green

# Change to backend directory
Set-Location backend

# Activate virtual environment
Write-Host "🔧 Activating virtual environment..." -ForegroundColor Yellow
& ".\neoidp\Scripts\Activate.ps1"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Virtual environment activated" -ForegroundColor Green
    Write-Host "🏃 Starting server..." -ForegroundColor Yellow
    
    # Start the server
    python main.py
} else {
    Write-Host "❌ Failed to activate virtual environment" -ForegroundColor Red
    Write-Host "Please ensure neoidp virtual environment exists in backend/neoidp/" -ForegroundColor Red
}

Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
