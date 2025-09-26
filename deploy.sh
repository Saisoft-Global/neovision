#!/bin/bash

# IDP Portal Deployment Script
set -e

echo "🚀 Starting IDP Portal Deployment..."

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

# Check if .env file exists
if [ ! -f .env ]; then
    print_warning ".env file not found. Creating from example..."
    if [ -f env.example ]; then
        cp env.example .env
        print_warning "Please edit .env file with your configuration before running again."
        exit 1
    else
        print_error "env.example file not found. Please create .env file manually."
        exit 1
    fi
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Validate required environment variables
required_vars=("POSTGRES_PASSWORD" "SECRET_KEY")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        print_error "Required environment variable $var is not set in .env file"
        exit 1
    fi
done

print_status "Environment variables validated"

# Stop existing containers
print_status "Stopping existing containers..."
docker-compose -f docker-compose.deploy.yml down || true

# Remove old images (optional)
if [ "$1" == "--clean" ]; then
    print_status "Cleaning up old images..."
    docker-compose -f docker-compose.deploy.yml down --rmi all || true
fi

# Build and start services
print_status "Building and starting services..."
docker-compose -f docker-compose.deploy.yml up --build -d

# Wait for services to be healthy
print_status "Waiting for services to be healthy..."
sleep 30

# Check service health
print_status "Checking service health..."

# Check backend
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    print_success "Backend is healthy"
else
    print_error "Backend health check failed"
    docker-compose -f docker-compose.deploy.yml logs backend
    exit 1
fi

# Check frontend
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    print_success "Frontend is healthy"
else
    print_error "Frontend health check failed"
    docker-compose -f docker-compose.deploy.yml logs frontend
    exit 1
fi

# Check database
if docker-compose -f docker-compose.deploy.yml exec postgres pg_isready -U ${POSTGRES_USER:-neocaptured_user} -d ${POSTGRES_DB:-neocaptured_db} > /dev/null 2>&1; then
    print_success "Database is healthy"
else
    print_error "Database health check failed"
    docker-compose -f docker-compose.deploy.yml logs postgres
    exit 1
fi

# Check Redis
if docker-compose -f docker-compose.deploy.yml exec redis redis-cli ping > /dev/null 2>&1; then
    print_success "Redis is healthy"
else
    print_error "Redis health check failed"
    docker-compose -f docker-compose.deploy.yml logs redis
    exit 1
fi

print_success "🎉 Deployment completed successfully!"
print_status "Application URLs:"
print_status "  Frontend: http://localhost:3000"
print_status "  Backend API: http://localhost:8000"
print_status "  API Documentation: http://localhost:8000/docs"
print_status "  Database: localhost:5432"
print_status "  Redis: localhost:6379"

print_status "Useful commands:"
print_status "  View logs: docker-compose -f docker-compose.deploy.yml logs -f"
print_status "  Stop services: docker-compose -f docker-compose.deploy.yml down"
print_status "  Restart services: docker-compose -f docker-compose.deploy.yml restart"
print_status "  Update services: ./deploy.sh --clean"
