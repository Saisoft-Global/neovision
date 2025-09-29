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

# Configure caches to persist models across restarts
echo "🗄️  Configuring model caches..."
export HF_HOME=/workspace/cache/hf
export XDG_CACHE_HOME=/workspace/cache/xdg
export PADDLE_OCR_CACHE_DIR=/workspace/cache/paddle
mkdir -p "$HF_HOME" "$XDG_CACHE_HOME" "$PADDLE_OCR_CACHE_DIR"

# Download spaCy model
echo "📚 Downloading spaCy model..."
python -m spacy download en_core_web_sm || true

# Preload PaddleOCR models (en, ar) to avoid runtime downloads
echo "🔻 Preloading PaddleOCR models..."
python - <<'PY'
from paddleocr import PaddleOCR
for lang in ["en", "ar"]:
    try:
        print(f"Preloading PaddleOCR for {lang}...")
        PaddleOCR(use_angle_cls=True, lang=lang, use_gpu=False, show_log=False)
    except Exception as e:
        print("PaddleOCR preload failed:", lang, e)
PY

# Preload Hugging Face models (LayoutLMv3, optional TrOCR)
echo "🤗 Preloading Hugging Face models..."
python - <<'PY'
from transformers import AutoProcessor, AutoModelForTokenClassification, VisionEncoderDecoderModel, TrOCRProcessor
try:
    print("Preloading LayoutLMv3 base...")
    proc = AutoProcessor.from_pretrained("microsoft/layoutlmv3-base")
    mdl  = AutoModelForTokenClassification.from_pretrained("microsoft/layoutlmv3-base")
except Exception as e:
    print("LayoutLMv3 preload failed:", e)
try:
    print("Preloading TrOCR base handwritten (optional)...")
    trocr_proc = TrOCRProcessor.from_pretrained("microsoft/trocr-base-handwritten")
    trocr_model = VisionEncoderDecoderModel.from_pretrained("microsoft/trocr-base-handwritten")
except Exception as e:
    print("TrOCR preload skipped:", e)
PY

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

# Export cache envs for runtime as well
export HF_HOME=/workspace/cache/hf
export XDG_CACHE_HOME=/workspace/cache/xdg
export PADDLE_OCR_CACHE_DIR=/workspace/cache/paddle

# Start backend (eager loaded models already cached)
cd /workspace/backend && python -m uvicorn main:app --host 0.0.0.0 --port 8001 --workers 1 &

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
