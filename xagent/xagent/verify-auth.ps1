# Authentication Verification Script for Windows PowerShell
# This script helps verify the authentication setup

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║    Authentication System Verification Script              ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if .env file exists
Write-Host "Step 1: Checking for environment variables..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "✓ .env file found" -ForegroundColor Green
    
    # Check for required variables
    $envContent = Get-Content ".env"
    $hasSupabaseUrl = $envContent | Select-String "VITE_SUPABASE_URL"
    $hasSupabaseKey = $envContent | Select-String "VITE_SUPABASE_ANON_KEY"
    
    if ($hasSupabaseUrl) {
        Write-Host "✓ VITE_SUPABASE_URL is set" -ForegroundColor Green
    } else {
        Write-Host "✗ VITE_SUPABASE_URL is missing!" -ForegroundColor Red
        $missing = $true
    }
    
    if ($hasSupabaseKey) {
        Write-Host "✓ VITE_SUPABASE_ANON_KEY is set" -ForegroundColor Green
    } else {
        Write-Host "✗ VITE_SUPABASE_ANON_KEY is missing!" -ForegroundColor Red
        $missing = $true
    }
} else {
    Write-Host "✗ .env file not found!" -ForegroundColor Red
    Write-Host "  Creating template .env file..." -ForegroundColor Yellow
    
    $envTemplate = @"
# Supabase Configuration
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Optional: OpenAI Configuration
# VITE_OPENAI_API_KEY=your_openai_api_key
"@
    
    Set-Content -Path ".env" -Value $envTemplate
    Write-Host "✓ Template .env file created" -ForegroundColor Green
    Write-Host "  Please update it with your actual credentials" -ForegroundColor Yellow
    $missing = $true
}

Write-Host ""

# Step 2: Check if node_modules exists
Write-Host "Step 2: Checking dependencies..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "✓ node_modules found" -ForegroundColor Green
} else {
    Write-Host "✗ node_modules not found!" -ForegroundColor Red
    Write-Host "  Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Dependencies installed successfully" -ForegroundColor Green
    } else {
        Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# Step 3: Check critical files
Write-Host "Step 3: Checking critical auth files..." -ForegroundColor Yellow

$criticalFiles = @(
    "src/store/authStore.ts",
    "src/services/auth/AuthService.ts",
    "src/config/supabase/index.ts",
    "src/components/auth/LoginForm.tsx",
    "src/components/auth/ProtectedRoute.tsx"
)

$allFilesExist = $true
foreach ($file in $criticalFiles) {
    if (Test-Path $file) {
        Write-Host "✓ $file exists" -ForegroundColor Green
    } else {
        Write-Host "✗ $file is missing!" -ForegroundColor Red
        $allFilesExist = $false
    }
}

Write-Host ""

# Step 4: Check if auth fixes were applied
Write-Host "Step 4: Verifying auth fixes..." -ForegroundColor Yellow

# Check if authStore has signIn and signUp methods
$authStoreContent = Get-Content "src/store/authStore.ts" -Raw
if ($authStoreContent -match "signIn:") {
    Write-Host "✓ signIn method found in authStore" -ForegroundColor Green
} else {
    Write-Host "✗ signIn method missing in authStore!" -ForegroundColor Red
    $needsFix = $true
}

if ($authStoreContent -match "signUp:") {
    Write-Host "✓ signUp method found in authStore" -ForegroundColor Green
} else {
    Write-Host "✗ signUp method missing in authStore!" -ForegroundColor Red
    $needsFix = $true
}

Write-Host ""

# Summary
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "                    VERIFICATION SUMMARY                     " -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

if ($missing) {
    Write-Host "⚠ Please update the .env file with your Supabase credentials" -ForegroundColor Yellow
    Write-Host ""
}

if ($needsFix) {
    Write-Host "⚠ Auth fixes need to be applied" -ForegroundColor Yellow
    Write-Host "  The authStore is missing required methods" -ForegroundColor Yellow
    Write-Host ""
}

if (-not $missing -and -not $needsFix -and $allFilesExist) {
    Write-Host "✓ All checks passed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Cyan
    Write-Host "1. Start the dev server: npm run dev" -ForegroundColor White
    Write-Host "2. Open browser: http://localhost:5173/test/supabase" -ForegroundColor White
    Write-Host "3. Verify all tests pass" -ForegroundColor White
    Write-Host "4. Test login: http://localhost:5173/login" -ForegroundColor White
    Write-Host ""
    
    # Ask if user wants to start dev server
    $response = Read-Host "Would you like to start the dev server now? (y/n)"
    if ($response -eq 'y' -or $response -eq 'Y') {
        Write-Host ""
        Write-Host "Starting development server..." -ForegroundColor Yellow
        Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Gray
        Write-Host ""
        npm run dev
    }
} else {
    Write-Host "⚠ Some issues need to be resolved before testing" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please review the errors above and:" -ForegroundColor White
    Write-Host "1. Update .env file with Supabase credentials" -ForegroundColor White
    Write-Host "2. Review AUTH_VERIFICATION_REPORT.md for fixes" -ForegroundColor White
    Write-Host "3. Run this script again to verify" -ForegroundColor White
    Write-Host ""
}

Write-Host "For detailed testing instructions, see:" -ForegroundColor Cyan
Write-Host "- AUTH_TEST_CHECKLIST.md" -ForegroundColor White
Write-Host "- AUTH_VERIFICATION_REPORT.md" -ForegroundColor White
Write-Host "- FIX_EXISTING_AUTH.md" -ForegroundColor White
Write-Host ""

