# 🐧 Ubuntu Server Deployment Guide

This guide will help you copy the Multi-Agent Platform files to your Ubuntu server and deploy the entire application.

## 📋 Prerequisites

### On Your Windows Machine:
- OpenSSH client (usually pre-installed on Windows 10/11)
- PowerShell or Git Bash
- SSH key configured for your Ubuntu server

### On Your Ubuntu Server:
- Ubuntu 20.04+ (LTS recommended)
- SSH access enabled
- User with sudo privileges

## 🚀 Method 1: Automated Deployment (Recommended)

### Option A: PowerShell Script (Windows)

1. **Edit the deployment script:**
   ```powershell
   # Open PowerShell as Administrator
   notepad deploy-to-ubuntu.ps1
   ```

2. **Update the server configuration:**
   ```powershell
   # Change these lines in the script:
   $UbuntuServer = "YOUR_SERVER_IP_OR_DOMAIN"  # e.g., "192.168.1.100" or "myserver.com"
   $UbuntuUser = "ubuntu"  # Your SSH username (usually "ubuntu")
   ```

3. **Run the deployment:**
   ```powershell
   # Run the script
   .\deploy-to-ubuntu.ps1 -UbuntuServer "YOUR_SERVER_IP"
   
   # Or with custom user
   .\deploy-to-ubuntu.ps1 -UbuntuServer "YOUR_SERVER_IP" -UbuntuUser "your_username"
   ```

### Option B: Bash Script (Linux/Mac/WSL)

1. **Make the script executable:**
   ```bash
   chmod +x deploy-to-ubuntu.sh
   ```

2. **Edit the server configuration:**
   ```bash
   nano deploy-to-ubuntu.sh
   
   # Change these lines:
   UBUNTU_SERVER="YOUR_SERVER_IP_OR_DOMAIN"
   UBUNTU_USER="ubuntu"
   ```

3. **Run the deployment:**
   ```bash
   ./deploy-to-ubuntu.sh
   ```

## 🔧 Method 2: Manual Deployment

### Step 1: Prepare Files for Transfer

Create a deployment package:

```powershell
# Create deployment directory
mkdir xagent-deployment
cd xagent-deployment

# Copy essential directories
xcopy ..\backend backend\ /E /I
xcopy ..\src src\ /E /I
xcopy ..\public public\ /E /I
xcopy ..\supabase supabase\ /E /I
xcopy ..\neo4j neo4j\ /E /I
xcopy ..\ollama ollama\ /E /I
xcopy ..\scripts scripts\ /E /I

# Copy configuration files
copy ..\docker-compose.yml .
copy ..\Dockerfile .
copy ..\nginx.conf .
copy ..\package.json .
copy ..\package-lock.json .
copy ..\vite.config.ts .
copy ..\tailwind.config.js .
copy ..\postcss.config.js .
copy ..\eslint.config.js .
copy ..\index.html .
copy ..\.dockerignore .
copy ..\.gitignore .
copy ..\render.env.template .
copy ..\render.yaml .
copy ..\README.md .
copy ..\DEPLOY.md .

# Copy TypeScript config files
copy ..\tsconfig*.json .

# Copy .env file (create if doesn't exist)
if not exist "..\.env" copy ..\render.env.template ..\.env
copy ..\.env .
```

### Step 2: Transfer Files to Ubuntu Server

```powershell
# Create archive
tar -czf xagent-platform.tar.gz *

# Transfer to server
scp xagent-platform.tar.gz ubuntu@YOUR_SERVER_IP:/home/ubuntu/

# SSH to server and extract
ssh ubuntu@YOUR_SERVER_IP
cd /home/ubuntu
tar -xzf xagent-platform.tar.gz
rm xagent-platform.tar.gz
mkdir -p data/backend data/sqlite backups
```

### Step 3: Install Prerequisites on Ubuntu Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
rm get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Git
sudo apt install git -y

# Logout and login to apply docker group changes
exit
# SSH back in
ssh ubuntu@YOUR_SERVER_IP
```

### Step 4: Deploy the Application

```bash
# Navigate to application directory
cd /home/ubuntu

# Make scripts executable
chmod +x scripts/*.sh

# Start the application
docker-compose up -d

# Wait for services to start (about 2-3 minutes)
sleep 180

# Check service status
docker-compose ps

# Test the application
curl http://localhost:8000/health
curl http://localhost:8085
```

## 🌐 Access Your Application

Once deployed, your application will be available at:

- **Frontend**: `http://YOUR_SERVER_IP:8085`
- **Backend API**: `http://YOUR_SERVER_IP:8000`
- **Neo4j Browser**: `http://YOUR_SERVER_IP:7474`
- **Ollama API**: `http://YOUR_SERVER_IP:11434`

### Default Credentials:
- **Neo4j**: Username: `neo4j`, Password: `yourpassword`

## 🔧 Management Commands

```bash
# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Stop services
docker-compose down

# Update and restart
docker-compose down
docker-compose up -d --build

# Check resource usage
docker stats

# Clean up unused containers
docker system prune -a
```

## 🛡️ Security Configuration (Production)

### Configure Firewall:
```bash
# Allow required ports
sudo ufw allow 22    # SSH
sudo ufw allow 8085  # Frontend
sudo ufw allow 8000  # Backend API
sudo ufw allow 7474  # Neo4j Browser
sudo ufw --force enable
```

### Set Up Reverse Proxy with Nginx:
```bash
# Install Nginx
sudo apt install nginx -y

# Create configuration
sudo nano /etc/nginx/sites-available/xagent
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    # Frontend
    location / {
        proxy_pass http://localhost:8085;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Neo4j Browser
    location /neo4j/ {
        proxy_pass http://localhost:7474;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/xagent /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### SSL Certificate (Optional):
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d YOUR_DOMAIN

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 📊 Monitoring

### Health Check Script:
```bash
# Create monitoring script
nano ~/health-check.sh
```

Add this content:
```bash
#!/bin/bash
echo "=== Multi-Agent Platform Health Check ==="
echo "Backend Health:"
curl -f http://localhost:8000/health || echo "❌ Backend down"
echo ""
echo "Frontend Status:"
curl -f http://localhost:8085 || echo "❌ Frontend down"
echo ""
echo "Docker Services:"
docker-compose ps
echo ""
echo "Resource Usage:"
docker stats --no-stream
```

Make it executable and run:
```bash
chmod +x ~/health-check.sh
~/health-check.sh
```

## 🔄 Backup Strategy

### Create Backup Script:
```bash
nano ~/backup.sh
```

Add this content:
```bash
#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup Neo4j data
docker exec multi-agent-neo4j neo4j-admin dump --database=neo4j --to=/tmp/backup.dump
docker cp multi-agent-neo4j:/tmp/backup.dump $BACKUP_DIR/neo4j-$DATE.dump

# Backup application data
tar -czf $BACKUP_DIR/app-data-$DATE.tar.gz ./data/

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.dump" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

Schedule daily backups:
```bash
chmod +x ~/backup.sh
crontab -e
# Add: 0 2 * * * /home/ubuntu/backup.sh
```

## 🚨 Troubleshooting

### Common Issues:

1. **Port already in use:**
   ```bash
   sudo netstat -tulpn | grep :8085
   sudo kill -9 <PID>
   ```

2. **Docker permission issues:**
   ```bash
   sudo usermod -aG docker $USER
   # Logout and login again
   ```

3. **Services not starting:**
   ```bash
   docker-compose logs backend
   docker-compose logs app
   docker-compose logs neo4j
   ```

4. **Memory issues:**
   ```bash
   # Check memory usage
   free -h
   # Increase swap if needed
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

5. **Reset everything:**
   ```bash
   docker-compose down
   docker system prune -a
   docker volume prune
   docker-compose up -d
   ```

## 📞 Support

If you encounter any issues:

1. Check the logs: `docker-compose logs -f`
2. Verify all services are running: `docker-compose ps`
3. Test connectivity: `curl http://localhost:8000/health`
4. Check firewall settings: `sudo ufw status`

Your Multi-Agent Platform should now be running successfully on Ubuntu! 🎉
