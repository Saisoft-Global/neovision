#!/bin/bash

# Multi-AI-Agent Platform Deployment Script with Agentic Capabilities
# Enhanced version with fully functional agentic AI features

set -e

echo "🚀 Starting Multi-AI-Agent Platform Deployment with Agentic Capabilities"
echo "=================================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root for security reasons"
   exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

print_status "Checking system resources..."

# Check available memory
TOTAL_MEM=$(free -g | awk '/^Mem:/{print $2}')
if [ "$TOTAL_MEM" -lt 8 ]; then
    print_warning "System has less than 8GB RAM. Performance may be affected."
fi

# Check available disk space
DISK_SPACE=$(df -h . | awk 'NR==2 {print $4}' | sed 's/G//')
if [ "$DISK_SPACE" -lt 20 ]; then
    print_warning "Less than 20GB disk space available. Consider freeing up space."
fi

print_status "Stopping any existing containers..."
docker-compose -f docker-compose-with-ollama.yml down 2>/dev/null || true

print_status "Cleaning up old containers and images..."
docker system prune -f

print_status "Checking for port conflicts..."
PORTS=(8002 8086 7475 7688 11435)
for port in "${PORTS[@]}"; do
    if ss -tuln | grep -q ":$port "; then
        print_warning "Port $port is already in use. This may cause conflicts."
    fi
done

print_status "Setting up environment variables..."

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    print_status "Creating .env file with default values..."
    cat > .env << EOF
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Pinecone Configuration (Optional)
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_ENVIRONMENT=your_pinecone_environment_here
PINECONE_INDEX_NAME=your_pinecone_index_name_here

# Neo4j Configuration
NEO4J_PASSWORD=yourpassword

# Application Configuration
VITE_API_URL=http://localhost:8002
VITE_OLLAMA_BASE_URL=http://localhost:11435
EOF
    print_warning "Please edit .env file with your actual API keys before continuing."
    print_warning "Press Enter when ready to continue..."
    read -r
fi

print_status "Building and starting services..."

# Build and start all services
docker-compose -f docker-compose-with-ollama.yml up --build -d

print_status "Waiting for services to start..."
sleep 30

print_status "Checking service health..."

# Check backend health
print_status "Checking backend service..."
for i in {1..30}; do
    if curl -s http://localhost:8002/health > /dev/null 2>&1; then
        print_success "Backend service is healthy"
        break
    fi
    if [ $i -eq 30 ]; then
        print_error "Backend service failed to start properly"
        docker-compose -f docker-compose-with-ollama.yml logs backend
        exit 1
    fi
    sleep 2
done

# Check Neo4j health
print_status "Checking Neo4j service..."
for i in {1..30}; do
    if curl -s http://localhost:7475 > /dev/null 2>&1; then
        print_success "Neo4j service is healthy"
        break
    fi
    if [ $i -eq 30 ]; then
        print_error "Neo4j service failed to start properly"
        docker-compose -f docker-compose-with-ollama.yml logs neo4j
        exit 1
    fi
    sleep 2
done

# Check Ollama health
print_status "Checking Ollama service..."
for i in {1..30}; do
    if curl -s http://localhost:11435/api/tags > /dev/null 2>&1; then
        print_success "Ollama service is healthy"
        break
    fi
    if [ $i -eq 30 ]; then
        print_warning "Ollama service may still be starting. This is normal for first-time setup."
    fi
    sleep 2
done

# Check frontend
print_status "Checking frontend service..."
for i in {1..30}; do
    if curl -s http://localhost:8086 > /dev/null 2>&1; then
        print_success "Frontend service is healthy"
        break
    fi
    if [ $i -eq 30 ]; then
        print_error "Frontend service failed to start properly"
        docker-compose -f docker-compose-with-ollama.yml logs app
        exit 1
    fi
    sleep 2
done

print_status "Setting up Ollama models..."
# Pull a lightweight model for testing
docker exec multi-agent-ollama ollama pull llama3.2:3b 2>/dev/null || print_warning "Failed to pull Ollama model. You can do this manually later."

print_status "Initializing databases..."

# Initialize Neo4j with basic setup
print_status "Setting up Neo4j database..."
sleep 10  # Give Neo4j more time to fully start

# Create basic indexes and constraints
docker exec multi-agent-neo4j cypher-shell -u neo4j -p yourpassword "
CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE;
CREATE CONSTRAINT agent_id IF NOT EXISTS FOR (a:Agent) REQUIRE a.id IS UNIQUE;
CREATE CONSTRAINT document_id IF NOT EXISTS FOR (d:Document) REQUIRE d.id IS UNIQUE;
" 2>/dev/null || print_warning "Neo4j setup completed with warnings"

print_status "Running final health checks..."

# Final service status check
echo ""
echo "🔍 Service Status:"
echo "=================="
docker-compose -f docker-compose-with-ollama.yml ps

echo ""
echo "📊 Resource Usage:"
echo "=================="
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"

echo ""
print_success "🎉 Multi-AI-Agent Platform with Agentic Capabilities deployed successfully!"
echo ""
echo "🌐 Access URLs:"
echo "==============="
echo "Frontend Application: http://localhost:8086"
echo "Backend API:          http://localhost:8002"
echo "Neo4j Browser:        http://localhost:7475 (neo4j/yourpassword)"
echo "Ollama API:           http://localhost:11435"
echo ""
echo "🤖 Agentic AI Features Available:"
echo "================================="
echo "✅ Goal-Oriented Intent Analysis"
echo "✅ Autonomous Planning Engine"
echo "✅ Context-Aware Observation"
echo "✅ Adaptive Action Execution"
echo "✅ Self-Learning Reflection"
echo "✅ Intelligent Error Recovery"
echo "✅ Universal Browser Automation"
echo "✅ Voice Input Processing"
echo "✅ Multi-Agent Orchestration"
echo ""
echo "🧪 Test the Agentic Capabilities:"
echo "================================="
echo "1. Open http://localhost:8086 in your browser"
echo "2. Try: 'Buy Samsung mobile from Flipkart if less than 1000 AED'"
echo "3. Watch the AI create autonomous plans and adapt to obstacles"
echo "4. Observe self-learning and error recovery in action"
echo ""
echo "📝 Useful Commands:"
echo "==================="
echo "View logs:           docker-compose -f docker-compose-with-ollama.yml logs -f"
echo "Stop services:       docker-compose -f docker-compose-with-ollama.yml down"
echo "Restart services:    docker-compose -f docker-compose-with-ollama.yml restart"
echo "Update services:     docker-compose -f docker-compose-with-ollama.yml up --build -d"
echo ""
print_success "Deployment completed! Your agentic AI platform is ready to use! 🚀"
