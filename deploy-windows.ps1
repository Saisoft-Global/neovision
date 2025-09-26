# IDP Portal Windows Deployment Script
param(
    [switch]$Clean
)

Write-Host "🚀 Starting IDP Portal Deployment..." -ForegroundColor Blue

# Check if Docker is installed
if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker is not installed. Please install Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Check if Docker Compose is installed
if (!(Get-Command docker-compose -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker Compose is not installed. Please install Docker Compose first." -ForegroundColor Red
    exit 1
}

# Check if .env file exists
if (!(Test-Path ".env")) {
    Write-Host "⚠️ .env file not found. Creating from example..." -ForegroundColor Yellow
    if (Test-Path "env.example") {
        Copy-Item "env.example" ".env"
        Write-Host "⚠️ Please edit .env file with your configuration before running again." -ForegroundColor Yellow
        exit 1
    } else {
        Write-Host "❌ env.example file not found. Please create .env file manually." -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ Environment validation passed" -ForegroundColor Green

# Stop existing containers
Write-Host "🛑 Stopping existing containers..." -ForegroundColor Blue
docker-compose -f docker-compose.deploy.yml down 2>$null

# Clean up if requested
if ($Clean) {
    Write-Host "🧹 Cleaning up old images..." -ForegroundColor Blue
    docker-compose -f docker-compose.deploy.yml down --rmi all 2>$null
}

# Build and start services
Write-Host "🔨 Building and starting services..." -ForegroundColor Blue
docker-compose -f docker-compose.deploy.yml up --build -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start services" -ForegroundColor Red
    exit 1
}

# Wait for services to be healthy
Write-Host "⏳ Waiting for services to be healthy..." -ForegroundColor Blue
Start-Sleep -Seconds 30

# Check service health
Write-Host "🔍 Checking service health..." -ForegroundColor Blue

# Check backend
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Backend is healthy" -ForegroundColor Green
    } else {
        throw "Backend health check failed"
    }
} catch {
    Write-Host "❌ Backend health check failed" -ForegroundColor Red
    docker-compose -f docker-compose.deploy.yml logs backend
    exit 1
}

# Check frontend
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Frontend is healthy" -ForegroundColor Green
    } else {
        throw "Frontend health check failed"
    }
} catch {
    Write-Host "❌ Frontend health check failed" -ForegroundColor Red
    docker-compose -f docker-compose.deploy.yml logs frontend
    exit 1
}

Write-Host "🎉 Deployment completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Application URLs:" -ForegroundColor Blue
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "  Backend API: http://localhost:8000" -ForegroundColor White
Write-Host "  API Documentation: http://localhost:8000/docs" -ForegroundColor White
Write-Host "  Database: localhost:5432" -ForegroundColor White
Write-Host "  Redis: localhost:6379" -ForegroundColor White
Write-Host ""
Write-Host "🛠️ Useful commands:" -ForegroundColor Blue
Write-Host "  View logs: docker-compose -f docker-compose.deploy.yml logs -f" -ForegroundColor White
Write-Host "  Stop services: docker-compose -f docker-compose.deploy.yml down" -ForegroundColor White
Write-Host "  Restart services: docker-compose -f docker-compose.deploy.yml restart" -ForegroundColor White
Write-Host "  Update services: .\deploy-windows.ps1 -Clean" -ForegroundColor White
