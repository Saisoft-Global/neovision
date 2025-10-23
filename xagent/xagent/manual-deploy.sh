#!/bin/bash

# Manual deployment script for Multi-Agent Platform
# Run this on your Ubuntu server

echo "🚀 Multi-Agent Platform Manual Deployment"
echo "========================================="

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ docker-compose.yml not found. Please run this script from the xagent directory."
    exit 1
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p data/backend data/sqlite backups

# Make scripts executable
echo "🔧 Making scripts executable..."
chmod +x scripts/*.sh 2>/dev/null || true

# Check Docker and Docker Compose
echo "🐳 Checking Docker..."
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
else
    echo "✅ Docker already installed"
fi

if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
else
    echo "✅ Docker Compose already installed"
fi

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose down 2>/dev/null || true

# Start the application
echo "🚀 Starting Multi-Agent Platform..."
docker-compose up -d

# Wait for services to start
echo "⏳ Waiting for services to initialize..."
sleep 45

# Check service status
echo "📊 Checking service status..."
docker-compose ps

# Test health endpoints
echo "🏥 Testing application health..."
sleep 10

echo "Testing Backend..."
if curl -f http://localhost:8000/health; then
    echo "✅ Backend is healthy"
else
    echo "❌ Backend is not responding"
fi

echo "Testing Frontend..."
if curl -f http://localhost:8085; then
    echo "✅ Frontend is accessible"
else
    echo "❌ Frontend is not responding"
fi

# Show system resources
echo ""
echo "📊 System Resources:"
free -h
echo ""
echo "📊 Container Resources:"
docker stats --no-stream --format "table {{.Container}}\t{{.MemUsage}}\t{{.MemPerc}}"

# Show access information
echo ""
echo "🎉 Deployment completed!"
echo "======================"
echo "Application URLs:"
echo "Frontend:    http://localhost:8085"
echo "Backend API: http://localhost:8000"
echo "Neo4j:       http://localhost:7474"
echo ""
echo "Default Neo4j credentials:"
echo "Username: neo4j"
echo "Password: yourpassword"
echo ""
echo "Management Commands:"
echo "View logs:     docker-compose logs -f"
echo "Stop:          docker-compose down"
echo "Restart:       docker-compose restart"
echo "Update:        docker-compose down && docker-compose up -d --build"
echo ""
echo "To check status anytime, run: docker-compose ps"
