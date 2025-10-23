#!/bin/bash

# Multi-Agent Platform Deployment with Custom Ports
# This script deploys the platform using custom ports to avoid conflicts

echo "🚀 Multi-Agent Platform Deployment (Custom Ports)"
echo "================================================"

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

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose-with-ollama.yml down 2>/dev/null || true

# Start the application with custom ports
echo "🚀 Starting Multi-Agent Platform with custom ports..."
docker-compose -f docker-compose-with-ollama.yml up -d

# Wait for services to start
echo "⏳ Waiting for services to initialize..."
sleep 45

# Check service status
echo "📊 Checking service status..."
docker-compose -f docker-compose-with-ollama.yml ps

# Test health endpoints
echo "🏥 Testing application health..."
sleep 10

echo "Testing Backend (port 8002)..."
if curl -f http://localhost:8002/health; then
    echo "✅ Backend is healthy"
else
    echo "❌ Backend is not responding"
fi

echo "Testing Frontend (port 8086)..."
if curl -f http://localhost:8086; then
    echo "✅ Frontend is accessible"
else
    echo "❌ Frontend is not responding"
fi

echo "Testing Neo4j (port 7475)..."
if curl -f http://localhost:7475; then
    echo "✅ Neo4j is accessible"
else
    echo "❌ Neo4j is not responding"
fi

echo "Testing Ollama (port 11435)..."
if curl -f http://localhost:11435/api/tags; then
    echo "✅ Ollama is accessible"
else
    echo "❌ Ollama is not responding"
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
echo "Application URLs (Custom Ports):"
echo "Frontend:    http://localhost:8086"
echo "Backend API: http://localhost:8002"
echo "Neo4j:       http://localhost:7475"
echo "Ollama:      http://localhost:11435"
echo ""
echo "External Access:"
echo "Frontend:    http://$(curl -s ifconfig.me):8086"
echo "Backend API: http://$(curl -s ifconfig.me):8002"
echo "Neo4j:       http://$(curl -s ifconfig.me):7475"
echo "Ollama:      http://$(curl -s ifconfig.me):11435"
echo ""
echo "Default Neo4j credentials:"
echo "Username: neo4j"
echo "Password: yourpassword"
echo ""
echo "Management Commands:"
echo "View logs:     docker-compose -f docker-compose-with-ollama.yml logs -f"
echo "Stop:          docker-compose -f docker-compose-with-ollama.yml down"
echo "Restart:       docker-compose -f docker-compose-with-ollama.yml restart"
echo "Update:        docker-compose -f docker-compose-with-ollama.yml down && docker-compose -f docker-compose-with-ollama.yml up -d --build"
echo ""
echo "Port Mapping:"
echo "  Frontend: 8086 -> 80"
echo "  Backend:  8002 -> 8000"
echo "  Neo4j:    7475 -> 7474 (HTTP), 7688 -> 7687 (Bolt)"
echo "  Ollama:   11435 -> 11434"
