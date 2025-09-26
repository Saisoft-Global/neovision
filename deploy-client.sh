#!/bin/bash

# IDP Portal Client Deployment Script
# This script deploys the IDP portal for client use

set -e

echo "🚀 Starting IDP Portal Client Deployment..."

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
if [ "$EUID" -eq 0 ]; then
    print_error "Please do not run this script as root"
    exit 1
fi

# Detect OS
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="mac"
else
    print_error "Unsupported operating system: $OSTYPE"
    exit 1
fi

print_status "Detected OS: $OS"

# Install Docker if not installed
if ! command -v docker &> /dev/null; then
    print_status "Installing Docker..."
    
    if [ "$OS" == "linux" ]; then
        # Ubuntu/Debian
        if command -v apt-get &> /dev/null; then
            curl -fsSL https://get.docker.com -o get-docker.sh
            sudo sh get-docker.sh
            sudo usermod -aG docker $USER
            rm get-docker.sh
        # CentOS/RHEL
        elif command -v yum &> /dev/null; then
            sudo yum install -y yum-utils
            sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
            sudo yum install -y docker-ce docker-ce-cli containerd.io
            sudo systemctl start docker
            sudo systemctl enable docker
            sudo usermod -aG docker $USER
        fi
    elif [ "$OS" == "mac" ]; then
        print_error "Please install Docker Desktop for Mac from https://www.docker.com/products/docker-desktop"
        exit 1
    fi
    
    print_success "Docker installed successfully"
    print_warning "Please log out and log back in for Docker group changes to take effect"
    exit 0
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

# Create project directory
PROJECT_DIR="$HOME/idp-portal"
print_status "Setting up project directory at $PROJECT_DIR..."

mkdir -p $PROJECT_DIR
cd $PROJECT_DIR

# Download or copy project files
if [ -d "../project" ]; then
    print_status "Copying project files from ../project..."
    cp -r ../project/* .
else
    print_status "Please ensure the project files are available"
    print_error "Project files not found. Please copy the project files to $PROJECT_DIR"
    exit 1
fi

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
VITE_API_URL=http://localhost
FRONTEND_URL=http://localhost
CORS_ORIGINS=http://localhost

# Application Configuration
VITE_APP_NAME=IDP Portal
ENVIRONMENT=production
EOF
    print_success "Environment file created with secure random passwords"
fi

# Create startup script
cat > start-idp-portal.sh << 'EOF'
#!/bin/bash
cd ~/idp-portal
docker-compose -f docker-compose.production.yml up -d
echo "IDP Portal started successfully!"
echo "Access your application at: http://localhost"
echo "API Documentation: http://localhost/docs"
EOF

chmod +x start-idp-portal.sh

# Create stop script
cat > stop-idp-portal.sh << 'EOF'
#!/bin/bash
cd ~/idp-portal
docker-compose -f docker-compose.production.yml down
echo "IDP Portal stopped successfully!"
EOF

chmod +x stop-idp-portal.sh

# Create update script
cat > update-idp-portal.sh << 'EOF'
#!/bin/bash
cd ~/idp-portal
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml pull
docker-compose -f docker-compose.production.yml up --build -d
echo "IDP Portal updated successfully!"
EOF

chmod +x update-idp-portal.sh

# Build and start the application
print_status "Building and starting the application..."
docker-compose -f docker-compose.production.yml down || true
docker-compose -f docker-compose.production.yml up --build -d

# Wait for services to be healthy
print_status "Waiting for services to be healthy..."
sleep 60

# Check service health
print_status "Checking service health..."

# Check backend
if curl -f http://localhost/health > /dev/null 2>&1; then
    print_success "Application is healthy"
else
    print_error "Application health check failed"
    docker-compose -f docker-compose.production.yml logs
    exit 1
fi

# Get local IP
LOCAL_IP=$(hostname -I | awk '{print $1}')

print_success "🎉 IDP Portal deployed successfully!"
echo ""
print_status "📱 Access URLs:"
print_status "  Local: http://localhost"
print_status "  Network: http://$LOCAL_IP"
print_status "  API Documentation: http://localhost/docs"
echo ""
print_status "🛠️ Management Commands:"
print_status "  Start: ./start-idp-portal.sh"
print_status "  Stop: ./stop-idp-portal.sh"
print_status "  Update: ./update-idp-portal.sh"
print_status "  View logs: docker-compose -f docker-compose.production.yml logs -f"
echo ""
print_status "📁 Project directory: $PROJECT_DIR"
print_status "⚙️ Configuration: $PROJECT_DIR/.env"
echo ""
print_success "Your IDP Portal is ready for use! 🚀"

# Create desktop shortcut (Linux)
if [ "$OS" == "linux" ] && [ -d "$HOME/Desktop" ]; then
    cat > "$HOME/Desktop/IDP Portal.desktop" << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=IDP Portal
Comment=Start IDP Portal
Exec=firefox http://localhost
Icon=applications-internet
Terminal=false
StartupNotify=true
EOF
    chmod +x "$HOME/Desktop/IDP Portal.desktop"
    print_success "Desktop shortcut created"
fi
