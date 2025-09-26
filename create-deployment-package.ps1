# Create deployment package for clients (Windows PowerShell)
Write-Host "📦 Creating IDP Portal Deployment Package..." -ForegroundColor Blue

$PACKAGE_DIR = "idp-portal-deployment"
$PACKAGE_NAME = "idp-portal-$(Get-Date -Format 'yyyyMMdd-HHmmss').zip"

# Create package directory
if (Test-Path $PACKAGE_DIR) {
    Remove-Item -Recurse -Force $PACKAGE_DIR
}
New-Item -ItemType Directory -Path $PACKAGE_DIR | Out-Null

# Copy essential files
Write-Host "📋 Copying essential files..." -ForegroundColor Blue

# Core application files
Copy-Item -Recurse -Path "src" -Destination "$PACKAGE_DIR\src"
Copy-Item -Recurse -Path "backend" -Destination "$PACKAGE_DIR\backend"
Copy-Item "package*.json" -Destination $PACKAGE_DIR
Copy-Item "tsconfig*.json" -Destination $PACKAGE_DIR
Copy-Item "vite.config.ts" -Destination $PACKAGE_DIR
Copy-Item "tailwind.config.js" -Destination $PACKAGE_DIR
Copy-Item "postcss.config.js" -Destination $PACKAGE_DIR

# Docker files
Copy-Item "Dockerfile" -Destination $PACKAGE_DIR
Copy-Item "docker-compose.production.yml" -Destination $PACKAGE_DIR
Copy-Item "docker-compose.deploy.yml" -Destination $PACKAGE_DIR

# Deployment scripts
Copy-Item "deploy-client.sh" -Destination $PACKAGE_DIR
Copy-Item "deploy-ubuntu.sh" -Destination $PACKAGE_DIR
Copy-Item "deploy-windows.ps1" -Destination $PACKAGE_DIR

# Configuration files
Copy-Item "env.example" -Destination $PACKAGE_DIR
Copy-Item "render.yaml" -Destination $PACKAGE_DIR

# Documentation
Copy-Item "README-DEPLOYMENT.md" -Destination "$PACKAGE_DIR\README.md"
Copy-Item "CLIENT_DEPLOYMENT.md" -Destination $PACKAGE_DIR

# Create deployment instructions
$DEPLOYMENT_INSTRUCTIONS = @"
# 🚀 IDP Portal - Quick Deployment Instructions

## 📋 What's Included
- Complete IDP Portal application
- Docker deployment configuration
- Multiple deployment options
- Documentation and guides

## 🎯 Quick Start Options

### Option 1: Local Deployment (Recommended)
```bash
chmod +x deploy-client.sh
./deploy-client.sh
```
Access at: http://localhost

### Option 2: Ubuntu Server
```bash
chmod +x deploy-ubuntu.sh
./deploy-ubuntu.sh
```

### Option 3: Render.com Cloud
1. Upload to GitHub
2. Connect to Render.com
3. Auto-deploy with render.yaml

### Option 4: Docker Manual
```bash
docker-compose -f docker-compose.production.yml up -d
```

## 📞 Support
- Documentation: README.md
- Client Guide: CLIENT_DEPLOYMENT.md
- Issues: Contact support team

## 🎉 Features
- Document processing (PDF, Images)
- OCR text extraction
- Smart field detection
- Custom model training
- API integration
- Template management
- User feedback system

**Ready to deploy! 🚀**
"@

$DEPLOYMENT_INSTRUCTIONS | Out-File -FilePath "$PACKAGE_DIR\DEPLOYMENT-INSTRUCTIONS.md" -Encoding UTF8

# Create package
Write-Host "📦 Creating deployment package..." -ForegroundColor Blue
Compress-Archive -Path $PACKAGE_DIR -DestinationPath $PACKAGE_NAME -Force

# Clean up
Remove-Item -Recurse -Force $PACKAGE_DIR

$PACKAGE_SIZE = (Get-Item $PACKAGE_NAME).Length / 1MB

Write-Host "✅ Deployment package created: $PACKAGE_NAME" -ForegroundColor Green
Write-Host "📏 Package size: $([math]::Round($PACKAGE_SIZE, 2)) MB" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Package contents:" -ForegroundColor Blue
Write-Host "  - Complete IDP Portal application"
Write-Host "  - Docker deployment configuration"
Write-Host "  - Multiple deployment scripts"
Write-Host "  - Documentation and guides"
Write-Host "  - Environment configuration"
Write-Host ""
Write-Host "🎯 To deploy:" -ForegroundColor Blue
Write-Host "  1. Extract: Expand-Archive $PACKAGE_NAME"
Write-Host "  2. Run: cd idp-portal-deployment"
Write-Host "  3. Deploy: .\deploy-windows.ps1"
Write-Host ""
Write-Host "📧 Package ready for client delivery! 🚀" -ForegroundColor Green
