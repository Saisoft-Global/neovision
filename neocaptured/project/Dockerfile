# Multi-stage build for full-stack IDP application
FROM node:18-alpine AS frontend-builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY vite.config.ts ./
COPY tsconfig*.json ./
COPY tailwind.config.js ./
COPY postcss.config.js ./

# Install dependencies
RUN npm ci

# Copy frontend source code
COPY src/ ./src/
COPY index.html ./

# Build the frontend
RUN npm run build

# Backend stage
FROM python:3.9-slim AS backend

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONPATH=/app/backend

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
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
    libgconf-2-4 \
    libasound2 \
    libxtst6 \
    libxrandr2 \
    libasound2 \
    libpangocairo-1.0-0 \
    libatk1.0-0 \
    libcairo-gobject2 \
    libgtk-3-0 \
    libgdk-pixbuf2.0-0 \
    curl \
    wget \
    nginx \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Install additional ML dependencies
RUN pip install --no-cache-dir \
    paddlepaddle==2.5.2 \
    paddleocr==2.7.3 \
    spacy==3.7.2 \
    python-dotenv==1.0.0 \
    pdf2image==1.17.0 \
    python-magic==0.4.27 \
    opencv-python==4.9.0.80

# Download spaCy model
RUN python -m spacy download en_core_web_sm

# Copy backend code (excluding virtual environment)
COPY backend/ ./backend/
RUN rm -rf backend/neoidp

# Create necessary directories
RUN mkdir -p backend/models/trained backend/models/layout backend/models/spacy \
    backend/uploads backend/temp backend/logs static

# Copy frontend build from builder stage
COPY --from=frontend-builder /app/dist ./static

# Create nginx configuration
RUN echo 'server { \
    listen 80; \
    server_name _; \
    client_max_body_size 50M; \
    \
    # Serve frontend static files \
    location / { \
        root /app/static; \
        try_files $uri $uri/ /index.html; \
    } \
    \
    # Proxy API requests to backend \
    location /api/ { \
        proxy_pass http://127.0.0.1:8000/; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
        proxy_read_timeout 300s; \
        proxy_connect_timeout 75s; \
    } \
    \
    # Direct backend endpoints \
    location /health { \
        proxy_pass http://127.0.0.1:8000/health; \
        access_log off; \
    } \
    \
    location /docs { \
        proxy_pass http://127.0.0.1:8000/docs; \
    } \
    \
    location /inference/ { \
        proxy_pass http://127.0.0.1:8000/inference/; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
        proxy_read_timeout 300s; \
        proxy_connect_timeout 75s; \
    } \
    \
    location /annotation/ { \
        proxy_pass http://127.0.0.1:8000/annotation/; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
    } \
    \
    location /training/ { \
        proxy_pass http://127.0.0.1:8000/training/; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
    } \
}' > /etc/nginx/sites-available/default

# Create startup script
RUN echo '#!/bin/bash \
set -e \
\
# Start backend in background \
cd /app/backend && python -m uvicorn main:app --host 127.0.0.1 --port 8000 --workers 1 & \
\
# Wait for backend to start \
sleep 15 \
\
# Start nginx in foreground \
nginx -g "daemon off;" \
' > /app/start.sh && chmod +x /app/start.sh

# Create non-root user
RUN useradd --create-home --shell /bin/bash app \
    && chown -R app:app /app
USER app

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=60s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Expose port
EXPOSE 80

# Start the application
CMD ["/app/start.sh"]
