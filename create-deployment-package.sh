#!/bin/bash

# Create deployment package for clients
set -e

echo "📦 Creating IDP Portal Deployment Package..."

PACKAGE_DIR="idp-portal-deployment"
PACKAGE_NAME="idp-portal-$(date +%Y%m%d-%H%M%S).tar.gz"

# Create package directory
rm -rf $PACKAGE_DIR
mkdir -p $PACKAGE_DIR

# Copy essential files
echo "📋 Copying essential files..."

# Core application files
cp -r src $PACKAGE_DIR/
cp -r backend $PACKAGE_DIR/
cp package*.json $PACKAGE_DIR/
cp tsconfig*.json $PACKAGE_DIR/
cp vite.config.ts $PACKAGE_DIR/
cp tailwind.config.js $PACKAGE_DIR/
cp postcss.config.js $PACKAGE_DIR/

# Docker files
cp Dockerfile $PACKAGE_DIR/
cp docker-compose.production.yml $PACKAGE_DIR/
cp docker-compose.deploy.yml $PACKAGE_DIR/

# Deployment scripts
cp deploy-client.sh $PACKAGE_DIR/
cp deploy-ubuntu.sh $PACKAGE_DIR/
cp deploy-windows.ps1 $PACKAGE_DIR/

# Configuration files
cp env.example $PACKAGE_DIR/
cp render.yaml $PACKAGE_DIR/

# Documentation
cp README-DEPLOYMENT.md $PACKAGE_DIR/README.md
cp CLIENT_DEPLOYMENT.md $PACKAGE_DIR/

# Create deployment instructions
cat > $PACKAGE_DIR/DEPLOYMENT-INSTRUCTIONS.md << 'EOF'
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
EOF

# Create package
echo "📦 Creating deployment package..."
tar -czf $PACKAGE_NAME $PACKAGE_DIR

# Clean up
rm -rf $PACKAGE_DIR

echo "✅ Deployment package created: $PACKAGE_NAME"
echo "📏 Package size: $(du -h $PACKAGE_NAME | cut -f1)"
echo ""
echo "📋 Package contents:"
echo "  - Complete IDP Portal application"
echo "  - Docker deployment configuration"
echo "  - Multiple deployment scripts"
echo "  - Documentation and guides"
echo "  - Environment configuration"
echo ""
echo "🎯 To deploy:"
echo "  1. Extract: tar -xzf $PACKAGE_NAME"
echo "  2. Run: cd idp-portal-deployment"
echo "  3. Deploy: ./deploy-client.sh"
echo ""
echo "📧 Package ready for client delivery! 🚀"
