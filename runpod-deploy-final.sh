#!/bin/bash
set -e

echo "🚀 Deploying NeoVision IDP on RunPod..."

# Navigate to workspace
cd /workspace

# Install system dependencies
echo "📦 Installing system dependencies..."
apt-get update
apt-get install -y \
    build-essential \
    libpq-dev \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libgcc-s1 \
    libfontconfig1 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxrandr2 \
    libxss1 \
    libasound2 \
    libxtst6 \
    libpangocairo-1.0-0 \
    libatk1.0-0 \
    libcairo-gobject2 \
    libgtk-3-0 \
    libgdk-pixbuf-2.0-0 \
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-ara \
    libtesseract-dev \
    libmagic1 \
    libmagic-dev \
    curl \
    wget \
    nginx

# Install Python dependencies
echo "🐍 Installing Python dependencies..."
pip install --no-cache-dir -r backend/requirements.txt

# Download spaCy model
echo "📚 Downloading spaCy model..."
python -m spacy download en_core_web_sm

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p backend/models/trained backend/models/layout backend/models/spacy \
    backend/uploads backend/temp backend/logs static

# Build frontend
echo "🎨 Building frontend..."
npm install
npm run build
cp -r dist/* static/

# Configure nginx
echo "🌐 Configuring nginx..."
cat > /etc/nginx/sites-available/default << 'EOF'
server {
    listen 80;
    server_name _;
    client_max_body_size 50M;
    
    # Serve frontend static files
    location / {
        root /workspace/static;
        try_files $uri $uri/ /index.html;
    }
    
    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://127.0.0.1:8001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Direct backend endpoints
    location /health {
        proxy_pass http://127.0.0.1:8001/health;
        access_log off;
    }
    
    location /docs {
        proxy_pass http://127.0.0.1:8001/docs;
    }
}
EOF

# Create startup script
echo "⚡ Creating startup script..."
cat > /workspace/start.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 Starting NeoVision IDP..."

# Start backend with GPU support
cd /workspace/backend && python -m uvicorn main_lazy:app --host 0.0.0.0 --port 8001 --workers 1 &

# Wait for backend to start
sleep 15

# Start nginx
nginx -g "daemon off;"
EOF

chmod +x /workspace/start.sh

echo "✅ Deployment complete!"
echo "🌐 Access your IDP at: http://your-runpod-url"
echo "📚 API docs at: http://your-runpod-url/docs"
echo "❤️ Health check at: http://your-runpod-url/health"

# Start the application
exec /workspace/start.sh
