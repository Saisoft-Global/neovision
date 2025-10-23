# Quick script to add Groq API key to .env
# Usage: .\add_groq_to_env.ps1

Write-Host "Adding Groq API Key to .env" -ForegroundColor Cyan
Write-Host ""

# Check if GROQ key is already in .env
$envContent = Get-Content .env -Raw -ErrorAction SilentlyContinue

if ($envContent -match "VITE_GROQ_API_KEY") {
    Write-Host "GROQ key already exists in .env" -ForegroundColor Green
    Write-Host ""
    Write-Host "Current value:" -ForegroundColor Yellow
    Get-Content .env | Select-String "GROQ"
    Write-Host ""
    $update = Read-Host "Do you want to update it? (y/n)"
    
    if ($update -eq "y") {
        Write-Host ""
        Write-Host "Enter your Groq API key (starts with gsk_):" -ForegroundColor Cyan
        $groqKey = Read-Host
        
        # Replace existing key
        $envContent -replace "VITE_GROQ_API_KEY=.*", "VITE_GROQ_API_KEY=$groqKey" | Set-Content .env
        
        Write-Host ""
        Write-Host "Groq API key updated!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "Skipped update" -ForegroundColor Yellow
    }
} else {
    Write-Host "Adding Groq API key to .env..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Enter your Groq API key (starts with gsk_):" -ForegroundColor Cyan
    $groqKey = Read-Host
    
    # Add to .env
    Add-Content .env "`n# Groq API (for ultra-fast responses)"
    Add-Content .env "VITE_GROQ_API_KEY=$groqKey"
    
    Write-Host ""
    Write-Host "Groq API key added to .env!" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "NEXT STEPS:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Restart your frontend:" -ForegroundColor Yellow
Write-Host "   Press Ctrl+C to stop npm run dev" -ForegroundColor Gray
Write-Host "   Then run: npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Check browser console for:" -ForegroundColor Yellow
Write-Host "   Available: openai, groq" -ForegroundColor Green
Write-Host ""
Write-Host "3. Send a test message" -ForegroundColor Yellow
Write-Host "   Should respond in about 1 second!" -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

