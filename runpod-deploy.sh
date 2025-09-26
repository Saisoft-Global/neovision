#!/bin/bash
# RunPod Deployment Script for NeoVision IDP

echo "🚀 Starting NeoVision IDP deployment on RunPod..."

# Update system
apt-get update && apt-get upgrade -y

# Install system dependencies
apt-get install -y \
    build-essential \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libfontconfig1 \
    libx11-6 \
    curl \
    wget \
    git \
    nginx

# Install Python dependencies
pip install --no-cache-dir -r backend/requirements.txt

# Download spaCy model
python -m spacy download en_core_web_sm

# Create necessary directories
mkdir -p backend/uploads backend/temp backend/logs static

# Build frontend (if needed)
if [ -f "package.json" ]; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
    npm install
    npm run build
    cp -r dist/* static/
fi

# Set up nginx
cat > /etc/nginx/sites-available/default << 'EOF'
server {
    listen 80;
    server_name _;
    client_max_body_size 50M;
    
    location / {
        root /workspace/static;
        try_files $uri $uri/ /index.html;
    }
    
    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    location /health {
        proxy_pass http://127.0.0.1:8000/health;
        access_log off;
    }
}
EOF

# Create startup script
cat > /workspace/start.sh << 'EOF'
#!/bin/bash
set -e

# Start backend
cd /workspace/backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --workers 1 &

# Wait for backend to start
sleep 15

# Start nginx
nginx -g "daemon off;"
EOF

chmod +x /workspace/start.sh

echo "✅ NeoVision IDP deployment completed!"
echo "🚀 Starting application..."

# Start the application
/workspace/start.sh
