# Multi-Agent Platform Ubuntu Deployment Script (PowerShell)
# This script will transfer files via SCP and deploy the application

param(
    [Parameter(Mandatory=$true)]
    [string]$UbuntuServer,
    
    [Parameter(Mandatory=$false)]
    [string]$UbuntuUser = "ubuntu",
    
    [Parameter(Mandatory=$false)]
    [string]$RemotePath = "/home/$UbuntuUser/xagent-platform"
)

Write-Host "🚀 Multi-Agent Platform Ubuntu Deployment" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green

# Configuration
$LocalPath = "."

# Check if required tools are installed
function Test-Requirements {
    Write-Host "📋 Checking requirements..." -ForegroundColor Yellow
    
    if (-not (Get-Command scp -ErrorAction SilentlyContinue)) {
        Write-Host "❌ SCP is not installed. Please install OpenSSH client." -ForegroundColor Red
        Write-Host "   Install from: https://docs.microsoft.com/en-us/windows-server/administration/openssh/openssh_install_firstuse" -ForegroundColor Yellow
        exit 1
    }
    
    if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
        Write-Host "❌ SSH is not installed. Please install OpenSSH client." -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Requirements check passed" -ForegroundColor Green
}

# Test SSH connection
function Test-SSHConnection {
    Write-Host "🔗 Testing SSH connection to $UbuntuUser@$UbuntuServer..." -ForegroundColor Yellow
    
    try {
        $result = ssh -o ConnectTimeout=10 -o BatchMode=yes "$UbuntuUser@$UbuntuServer" "exit" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ SSH connection successful" -ForegroundColor Green
        } else {
            throw "SSH connection failed"
        }
    }
    catch {
        Write-Host "❌ SSH connection failed. Please check:" -ForegroundColor Red
        Write-Host "   - Server IP/domain is correct" -ForegroundColor Yellow
        Write-Host "   - SSH key is properly configured" -ForegroundColor Yellow
        Write-Host "   - Server is accessible" -ForegroundColor Yellow
        exit 1
    }
}

# Install prerequisites on Ubuntu server
function Install-Prerequisites {
    Write-Host "📦 Installing prerequisites on Ubuntu server..." -ForegroundColor Yellow
    
    $prereqScript = @"
# Update system
sudo apt update
sudo apt upgrade -y

# Install Docker
if ! command -v docker > /dev/null 2>&1; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker `$USER
    rm get-docker.sh
else
    echo "Docker already installed"
fi

# Install Docker Compose
if ! command -v docker-compose > /dev/null 2>&1; then
    echo "Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-`$(uname -s)-`$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
else
    echo "Docker Compose already installed"
fi

# Install Git
sudo apt install git -y

echo "✅ Prerequisites installed successfully"
"@

    ssh "$UbuntuUser@$UbuntuServer" $prereqScript
}

# Create deployment package
function New-DeploymentPackage {
    Write-Host "📁 Creating deployment package..." -ForegroundColor Yellow
    
    # Create temporary directory
    if (Test-Path "xagent-deployment-temp") {
        Remove-Item "xagent-deployment-temp" -Recurse -Force
    }
    New-Item -ItemType Directory -Name "xagent-deployment-temp" | Out-Null
    
    # Copy essential directories
    $directories = @("backend", "src", "public", "supabase", "neo4j", "ollama", "scripts")
    foreach ($dir in $directories) {
        if (Test-Path $dir) {
            Copy-Item $dir "xagent-deployment-temp\" -Recurse
            Write-Host "  ✅ Copied $dir" -ForegroundColor Green
        }
    }
    
    # Copy configuration files
    $files = @(
        "docker-compose.yml", "Dockerfile", "nginx.conf", "package.json", "package-lock.json",
        "vite.config.ts", "tailwind.config.js", "postcss.config.js", "eslint.config.js",
        "index.html", ".dockerignore", ".gitignore", "render.env.template", "render.yaml",
        "README.md", "DEPLOY.md"
    )
    
    foreach ($file in $files) {
        if (Test-Path $file) {
            Copy-Item $file "xagent-deployment-temp\"
            Write-Host "  ✅ Copied $file" -ForegroundColor Green
        }
    }
    
    # Copy TypeScript config files
    Get-ChildItem "tsconfig*.json" | ForEach-Object { Copy-Item $_.FullName "xagent-deployment-temp\" }
    
    # Create .env file if it doesn't exist
    if (-not (Test-Path ".env")) {
        Copy-Item "render.env.template" ".env"
    }
    Copy-Item ".env" "xagent-deployment-temp\"
    
    Write-Host "✅ Deployment package created" -ForegroundColor Green
}

# Transfer files to Ubuntu server
function Send-Files {
    Write-Host "📤 Transferring files to Ubuntu server..." -ForegroundColor Yellow
    
    # Create remote directory
    ssh "$UbuntuUser@$UbuntuServer" "mkdir -p $RemotePath"
    
    # Create tar archive
    Write-Host "  Creating archive..." -ForegroundColor Yellow
    Set-Location "xagent-deployment-temp"
    tar -czf "../xagent-deployment.tar.gz" *
    Set-Location ".."
    
    # Transfer archive
    Write-Host "  Transferring archive..." -ForegroundColor Yellow
    scp "xagent-deployment.tar.gz" "$UbuntuUser@$UbuntuServer`:$RemotePath/"
    
    # Extract on remote server
    Write-Host "  Extracting on remote server..." -ForegroundColor Yellow
    $extractScript = @"
cd $RemotePath
tar -xzf xagent-deployment.tar.gz
rm xagent-deployment.tar.gz
mkdir -p data/backend data/sqlite backups
chmod +x scripts/*.sh 2>/dev/null || true
"@
    ssh "$UbuntuUser@$UbuntuServer" $extractScript
    
    # Clean up local files
    Remove-Item "xagent-deployment-temp" -Recurse -Force
    Remove-Item "xagent-deployment.tar.gz" -Force
    
    Write-Host "✅ Files transferred successfully" -ForegroundColor Green
}

# Deploy application
function Start-Deployment {
    Write-Host "🚀 Deploying application on Ubuntu server..." -ForegroundColor Yellow
    
    $deployScript = @"
cd $RemotePath

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
echo "Frontend:    http://$UbuntuServer:8085"
echo "Backend API: http://$UbuntuServer:8000"
echo "Neo4j:       http://$UbuntuServer:7474"
echo "Ollama:      http://$UbuntuServer:11434"
echo ""
echo "Default Neo4j credentials:"
echo "Username: neo4j"
echo "Password: yourpassword"
echo ""
echo "To view logs: docker-compose logs -f"
echo "To stop: docker-compose down"
echo "To restart: docker-compose restart"
"@

    ssh "$UbuntuUser@$UbuntuServer" $deployScript
}

# Main execution
function Start-DeploymentProcess {
    Write-Host "Starting deployment process..." -ForegroundColor Green
    
    Test-Requirements
    Test-SSHConnection
    Install-Prerequisites
    New-DeploymentPackage
    Send-Files
    Start-Deployment
    
    Write-Host ""
    Write-Host "🎉 Deployment completed successfully!" -ForegroundColor Green
    Write-Host "Your Multi-Agent Platform is now running on Ubuntu!" -ForegroundColor Green
}

# Run deployment
Start-DeploymentProcess
