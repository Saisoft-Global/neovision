# Full-Stack IDP Development Environment Startup Script
Write-Host "🚀 Starting Full-Stack IDP Development Environment" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green

# Function to start backend
function Start-Backend {
    Write-Host "🔧 Starting Backend Server..." -ForegroundColor Yellow
    
    $backendJob = Start-Job -ScriptBlock {
        Set-Location "backend"
        & ".\neoidp\Scripts\Activate.ps1"
        python main.py
    }
    
    return $backendJob
}

# Function to start frontend
function Start-Frontend {
    Write-Host "⏳ Waiting for backend to start..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    
    Write-Host "🎨 Starting Frontend Development Server..." -ForegroundColor Yellow
    
    $frontendJob = Start-Job -ScriptBlock {
        npm run dev
    }
    
    return $frontendJob
}

try {
    # Start backend
    $backendJob = Start-Backend
    
    # Start frontend
    $frontendJob = Start-Frontend
    
    Write-Host "✅ Both servers are starting..." -ForegroundColor Green
    Write-Host "📱 Frontend: http://localhost:5173" -ForegroundColor Cyan
    Write-Host "🔧 Backend: http://localhost:8000" -ForegroundColor Cyan
    Write-Host "📚 API Docs: http://localhost:8000/docs" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Press Ctrl+C to stop both servers" -ForegroundColor Gray
    
    # Wait for user to stop
    while ($true) {
        Start-Sleep -Seconds 1
        
        # Check if jobs are still running
        if ($backendJob.State -ne "Running" -or $frontendJob.State -ne "Running") {
            Write-Host "❌ One or more servers stopped unexpectedly" -ForegroundColor Red
            break
        }
    }
    
} catch {
    Write-Host "❌ Error starting servers: $_" -ForegroundColor Red
} finally {
    # Clean up jobs
    if ($backendJob) {
        Stop-Job $backendJob -Force
        Remove-Job $backendJob
    }
    if ($frontendJob) {
        Stop-Job $frontendJob -Force
        Remove-Job $frontendJob
    }
    Write-Host "🛑 Servers stopped" -ForegroundColor Yellow
}
