#!/bin/bash

# Multi-Agent Platform Ubuntu Deployment Script
# This script will transfer files via SCP and deploy the application

set -e  # Exit on any error

# Configuration
UBUNTU_SERVER="your-server-ip-or-domain"
UBUNTU_USER="ubuntu"
REMOTE_PATH="/home/$UBUNTU_USER/xagent-platform"
LOCAL_PATH="."

echo "🚀 Multi-Agent Platform Ubuntu Deployment"
echo "=========================================="

# Check if required tools are installed
check_requirements() {
    echo "📋 Checking requirements..."
    
    if ! command -v scp &> /dev/null; then
        echo "❌ SCP is not installed. Please install OpenSSH client."
        exit 1
    fi
    
    if ! command -v ssh &> /dev/null; then
        echo "❌ SSH is not installed. Please install OpenSSH client."
        exit 1
    fi
    
    echo "✅ Requirements check passed"
}

# Test SSH connection
test_connection() {
    echo "🔗 Testing SSH connection to $UBUNTU_USER@$UBUNTU_SERVER..."
    
    if ssh -o ConnectTimeout=10 -o BatchMode=yes $UBUNTU_USER@$UBUNTU_SERVER exit 2>/dev/null; then
        echo "✅ SSH connection successful"
    else
        echo "❌ SSH connection failed. Please check:"
        echo "   - Server IP/domain is correct"
        echo "   - SSH key is properly configured"
        echo "   - Server is accessible"
        exit 1
    fi
}

# Install prerequisites on Ubuntu server
install_prerequisites() {
    echo "📦 Installing prerequisites on Ubuntu server..."
    
    ssh $UBUNTU_USER@$UBUNTU_SERVER << 'EOF'
        # Update system
        sudo apt update && sudo apt upgrade -y
        
        # Install Docker
        if ! command -v docker &> /dev/null; then
            echo "Installing Docker..."
            curl -fsSL https://get.docker.com -o get-docker.sh
            sudo sh get-docker.sh
            sudo usermod -aG docker $USER
            rm get-docker.sh
        else
            echo "Docker already installed"
        fi
        
        # Install Docker Compose
        if ! command -v docker-compose &> /dev/null; then
            echo "Installing Docker Compose..."
            sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
            sudo chmod +x /usr/local/bin/docker-compose
        else
            echo "Docker Compose already installed"
        fi
        
        # Install Git
        sudo apt install git -y
        
        echo "✅ Prerequisites installed successfully"
EOF
}

# Create deployment package
create_package() {
    echo "📁 Creating deployment package..."
    
    # Create temporary directory
    rm -rf xagent-deployment-temp
    mkdir xagent-deployment-temp
    
    # Copy essential files
    cp -r backend xagent-deployment-temp/
    cp -r src xagent-deployment-temp/
    cp -r public xagent-deployment-temp/
    cp -r supabase xagent-deployment-temp/
    cp -r neo4j xagent-deployment-temp/
    cp -r ollama xagent-deployment-temp/
    cp -r scripts xagent-deployment-temp/
    
    # Copy configuration files
    cp docker-compose.yml xagent-deployment-temp/
    cp Dockerfile xagent-deployment-temp/
    cp nginx.conf xagent-deployment-temp/
    cp package.json xagent-deployment-temp/
    cp package-lock.json xagent-deployment-temp/
    cp vite.config.ts xagent-deployment-temp/
    cp tsconfig*.json xagent-deployment-temp/
    cp tailwind.config.js xagent-deployment-temp/
    cp postcss.config.js xagent-deployment-temp/
    cp eslint.config.js xagent-deployment-temp/
    cp index.html xagent-deployment-temp/
    cp .dockerignore xagent-deployment-temp/
    cp .gitignore xagent-deployment-temp/
    cp render.env.template xagent-deployment-temp/
    cp render.yaml xagent-deployment-temp/
    cp README.md xagent-deployment-temp/
    cp DEPLOY.md xagent-deployment-temp/
    
    # Create .env file if it doesn't exist
    if [ ! -f ".env" ]; then
        cp render.env.template .env
    fi
    cp .env xagent-deployment-temp/
    
    echo "✅ Deployment package created"
}

# Transfer files to Ubuntu server
transfer_files() {
    echo "📤 Transferring files to Ubuntu server..."
    
    # Create remote directory
    ssh $UBUNTU_USER@$UBUNTU_SERVER "mkdir -p $REMOTE_PATH"
    
    # Transfer files using tar for efficiency
    tar -czf xagent-deployment.tar.gz -C xagent-deployment-temp .
    scp xagent-deployment.tar.gz $UBUNTU_USER@$UBUNTU_SERVER:$REMOTE_PATH/
    
    # Extract on remote server
    ssh $UBUNTU_USER@$UBUNTU_SERVER << EOF
        cd $REMOTE_PATH
        tar -xzf xagent-deployment.tar.gz
        rm xagent-deployment.tar.gz
        mkdir -p data/backend data/sqlite backups
        chmod +x scripts/*.sh
EOF
    
    # Clean up local temp files
    rm -rf xagent-deployment-temp
    rm -f xagent-deployment.tar.gz
    
    echo "✅ Files transferred successfully"
}

# Deploy application
deploy_application() {
    echo "🚀 Deploying application on Ubuntu server..."
    
    ssh $UBUNTU_USER@$UBUNTU_SERVER << EOF
        cd $REMOTE_PATH
        
        # Make scripts executable
        chmod +x scripts/*.sh 2>/dev/null || true
        
        # Start the application
        echo "Starting Multi-Agent Platform..."
        docker-compose down 2>/dev/null || true
        docker-compose up -d
        
        # Wait for services to start
        echo "Waiting for services to initialize..."
        sleep 30
        
        # Check service status
        echo "Checking service status..."
        docker-compose ps
        
        # Test health endpoints
        echo "Testing application health..."
        sleep 10
        curl -f http://localhost:8000/health && echo "✅ Backend is healthy"
        curl -f http://localhost:8085 && echo "✅ Frontend is accessible"
        
        # Show access information
        echo ""
        echo "🎉 Deployment completed successfully!"
        echo "=================================="
        echo "Application URLs:"
        echo "Frontend:    http://$UBUNTU_SERVER:8085"
        echo "Backend API: http://$UBUNTU_SERVER:8000"
        echo "Neo4j:       http://$UBUNTU_SERVER:7474"
        echo "Ollama:      http://$UBUNTU_SERVER:11434"
        echo ""
        echo "Default Neo4j credentials:"
        echo "Username: neo4j"
        echo "Password: yourpassword"
        echo ""
        echo "To view logs: docker-compose logs -f"
        echo "To stop: docker-compose down"
        echo "To restart: docker-compose restart"
EOF
}

# Main execution
main() {
    echo "Starting deployment process..."
    
    # Check if server details are provided
    if [ "$UBUNTU_SERVER" = "your-server-ip-or-domain" ]; then
        echo "❌ Please edit this script and set your Ubuntu server details:"
        echo "   UBUNTU_SERVER - Your server IP or domain"
        echo "   UBUNTU_USER - Your SSH username (usually 'ubuntu')"
        exit 1
    fi
    
    check_requirements
    test_connection
    install_prerequisites
    create_package
    transfer_files
    deploy_application
    
    echo ""
    echo "🎉 Deployment completed successfully!"
    echo "Your Multi-Agent Platform is now running on Ubuntu!"
}

# Run main function
main "$@"
