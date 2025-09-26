#!/bin/bash

# IDP Portal Ubuntu Deployment Script
set -e

echo "🚀 Starting IDP Portal Ubuntu Deployment..."

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

# Update system packages
print_status "Updating system packages..."
sudo apt-get update

# Install Docker if not installed
if ! command -v docker &> /dev/null; then
    print_status "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    print_success "Docker installed successfully"
else
    print_success "Docker is already installed"
fi

# Install Docker Compose if not installed
if ! command -v docker-compose &> /dev/null; then
    print_status "Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    print_success "Docker Compose installed successfully"
else
    print_success "Docker Compose is already installed"
fi

# Install additional dependencies
print_status "Installing additional dependencies..."
sudo apt-get install -y curl wget git nginx certbot python3-certbot-nginx

# Create project directory
PROJECT_DIR="/opt/idp-portal"
print_status "Setting up project directory at $PROJECT_DIR..."

sudo mkdir -p $PROJECT_DIR
sudo chown $USER:$USER $PROJECT_DIR

# Copy project files
print_status "Copying project files..."
cp -r . $PROJECT_DIR/
cd $PROJECT_DIR

# Create environment file
if [ ! -f .env ]; then
    print_status "Creating environment configuration..."
    cat > .env << EOF
# Database Configuration
POSTGRES_DB=neocaptured_db
POSTGRES_USER=neocaptured_user
POSTGRES_PASSWORD=$(openssl rand -base64 32)

# Security
SECRET_KEY=$(openssl rand -base64 64)

# API Configuration
VITE_API_URL=http://$(curl -s ifconfig.me):8000
FRONTEND_URL=http://$(curl -s ifconfig.me)
CORS_ORIGINS=http://$(curl -s ifconfig.me):8000,http://$(curl -s ifconfig.me)

# Application Configuration
VITE_APP_NAME=IDP Portal
ENVIRONMENT=production

# Redis Configuration
REDIS_URL=redis://redis:6379
EOF
    print_success "Environment file created with secure random passwords"
fi

# Create systemd service for Docker Compose
print_status "Creating systemd service..."
sudo tee /etc/systemd/system/idp-portal.service > /dev/null << EOF
[Unit]
Description=IDP Portal Docker Compose
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$PROJECT_DIR
ExecStart=/usr/local/bin/docker-compose -f docker-compose.deploy.yml up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.deploy.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

# Create nginx configuration for reverse proxy
print_status "Configuring nginx reverse proxy..."
sudo tee /etc/nginx/sites-available/idp-portal > /dev/null << EOF
server {
    listen 80;
    server_name _;
    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    location /health {
        proxy_pass http://localhost:8000/health;
        access_log off;
    }

    location /docs {
        proxy_pass http://localhost:8000/docs;
    }
}
EOF

# Enable nginx site
sudo ln -sf /etc/nginx/sites-available/idp-portal /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# Build and start the application
print_status "Building and starting the application..."
docker-compose -f docker-compose.deploy.yml down || true
docker-compose -f docker-compose.deploy.yml up --build -d

# Enable and start the systemd service
sudo systemctl daemon-reload
sudo systemctl enable idp-portal
sudo systemctl start idp-portal

# Wait for services to be healthy
print_status "Waiting for services to be healthy..."
sleep 60

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

# Get public IP
PUBLIC_IP=$(curl -s ifconfig.me)

print_success "🎉 Deployment completed successfully!"
print_status "Application URLs:"
print_status "  Frontend: http://$PUBLIC_IP"
print_status "  Backend API: http://$PUBLIC_IP:8000"
print_status "  API Documentation: http://$PUBLIC_IP:8000/docs"
print_status "  Database: $PUBLIC_IP:5432"
print_status "  Redis: $PUBLIC_IP:6379"

print_status "Management commands:"
print_status "  View logs: sudo journalctl -u idp-portal -f"
print_status "  Stop service: sudo systemctl stop idp-portal"
print_status "  Start service: sudo systemctl start idp-portal"
print_status "  Restart service: sudo systemctl restart idp-portal"
print_status "  View Docker logs: cd $PROJECT_DIR && docker-compose -f docker-compose.deploy.yml logs -f"

print_status "SSL Certificate (optional):"
print_status "  sudo certbot --nginx -d your-domain.com"

print_warning "Important: Update your firewall to allow ports 80, 443, 8000, 5432, 6379"
print_warning "Example: sudo ufw allow 80,443,8000,5432,6379/tcp"
