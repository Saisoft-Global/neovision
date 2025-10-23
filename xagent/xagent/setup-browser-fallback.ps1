# Setup Browser Fallback Feature
# Run this script to install dependencies and test the feature

Write-Host "🚀 Setting up Intelligent Browser Fallback..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Install backend dependencies
Write-Host "📦 Step 1/3: Installing backend dependencies..." -ForegroundColor Yellow
cd backend
pip install -r requirements.txt

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install backend dependencies" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Backend dependencies installed" -ForegroundColor Green
Write-Host ""

# Step 2: Install Playwright browsers
Write-Host "🌐 Step 2/3: Installing Playwright browsers (one-time, ~300MB)..." -ForegroundColor Yellow
playwright install chromium

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install Playwright browsers" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Chromium browser installed" -ForegroundColor Green
Write-Host ""

# Step 3: Verify installation
Write-Host "🔍 Step 3/3: Verifying installation..." -ForegroundColor Yellow
playwright --version

Write-Host "✅ Installation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🎉 BROWSER FALLBACK READY!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "🚀 Next steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Terminal 1 (Backend):" -ForegroundColor Yellow
Write-Host "  cd backend" -ForegroundColor White
Write-Host "  python -m uvicorn main:app --reload --port 8000" -ForegroundColor White
Write-Host ""
Write-Host "Terminal 2 (Frontend):" -ForegroundColor Yellow
Write-Host "  cd .." -ForegroundColor White
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Then open:" -ForegroundColor Yellow
Write-Host "  http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "Test by chatting:" -ForegroundColor Yellow
Write-Host '  "Find flights to Paris"' -ForegroundColor White
Write-Host ""
Write-Host "✨ Watch the browser automation magic!" -ForegroundColor Cyan
Write-Host ""




