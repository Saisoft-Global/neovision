# 🚀 DEPLOYMENT COMMANDS - Copy & Paste Ready

## Step-by-Step Deployment on Ubuntu Server

### Step 1: Generate Secrets (Run on Ubuntu)

```bash
cd ~/xagent-auto

# Generate all secrets
echo "=== GENERATING SECURE SECRETS ===" && \
echo "" && \
echo "# Copy these to your .env file:" && \
echo "" && \
python3 -c "import secrets; print('SECRET_KEY=' + secrets.token_urlsafe(32))" && \
python3 -c "import base64; import os; print('ENCRYPTION_KEY=' + base64.b64encode(os.urandom(32)).decode())" && \
python3 -c "import secrets; print('NEO4J_PASSWORD=' + secrets.token_urlsafe(16))" && \
python3 -c "import secrets; print('REDIS_PASSWORD=' + secrets.token_urlsafe(16))" && \
echo "" && \
echo "=== COPY THE ABOVE VALUES TO .env ===" 
```

### Step 2: Update .env File

```bash
cd ~/xagent-auto

# Backup existing .env
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# Edit .env file
nano .env
```

**Add these lines to .env** (replace with values from Step 1):

```bash
# Security Keys (REQUIRED - from Step 1)
SECRET_KEY=your_generated_secret_key_here
ENCRYPTION_KEY=your_generated_encryption_key_here

# Database Passwords (REQUIRED - from Step 1)
NEO4J_PASSWORD=your_generated_password_here
REDIS_PASSWORD=your_generated_password_here

# CORS Security (REQUIRED)
ALLOWED_ORIGINS=https://devai.neoworks.ai,http://localhost:5173

# Optional: Monitoring
SENTRY_DSN=
SENTRY_ENVIRONMENT=production
```

Save and exit (Ctrl+X, then Y, then Enter)

### Step 3: Rebuild and Deploy

```bash
cd ~/xagent-auto

# Stop existing containers
docker-compose -f docker-compose-with-ollama.yml down

# Pull latest code (if needed)
# git pull origin main

# Rebuild all containers with new security features
docker-compose -f docker-compose-with-ollama.yml build --no-cache

# Start all services
docker-compose -f docker-compose-with-ollama.yml up -d

# Wait for services to initialize
echo "Waiting for services to start..." && sleep 30
```

### Step 4: Verify Deployment

```bash
# Check all containers are running
docker-compose -f docker-compose-with-ollama.yml ps

# Should show:
# multi-agent-backend   - Up (healthy)
# multi-agent-app       - Up
# multi-agent-caddy     - Up
# multi-agent-neo4j     - Up (healthy)
# multi-agent-redis     - Up (healthy)
# multi-agent-ollama    - Up

# Check backend health
curl -s http://localhost:8002/health | jq .

# Check detailed health
curl -s http://localhost:8002/health/detailed | jq .

# Check backend logs (should show no errors)
docker logs multi-agent-backend --tail 50

# Check Redis is working
docker logs multi-agent-redis --tail 20

# Verify rate limiting headers
curl -I http://localhost:8002/health | grep -i rate
```

### Step 5: Test the Application

```bash
# Test from your browser
# Open: https://devai.neoworks.ai

# Login with admin credentials
# Email: admin@example.com
# Password: admin123

# Or test API directly
curl -X POST http://localhost:8002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
```

---

## 🔧 Troubleshooting Commands

### If backend won't start:

```bash
# Check backend logs
docker logs multi-agent-backend --tail 100

# Common issue: SECRET_KEY not set
# Solution: Verify .env file has SECRET_KEY
cat .env | grep SECRET_KEY

# Restart backend only
docker-compose -f docker-compose-with-ollama.yml restart backend
```

### If Redis connection fails:

```bash
# Check Redis is running
docker ps | grep redis

# Check Redis logs
docker logs multi-agent-redis --tail 50

# Test Redis connection
docker exec multi-agent-redis redis-cli ping

# Should return: PONG
```

### If rate limiting is too strict:

```bash
# Edit rate limiter
nano backend/middleware/rate_limiter.py

# Change these values:
# 'default': (200, 60),  # Increase from 100 to 200
# 'login': (20, 3600),   # Increase from 10 to 20

# Rebuild backend
docker-compose -f docker-compose-with-ollama.yml build backend
docker-compose -f docker-compose-with-ollama.yml up -d backend
```

### If CORS errors occur:

```bash
# Check ALLOWED_ORIGINS in .env
cat .env | grep ALLOWED_ORIGINS

# Should include your domain
# ALLOWED_ORIGINS=https://devai.neoworks.ai,http://localhost:5173

# Update if needed
nano .env

# Restart backend
docker-compose -f docker-compose-with-ollama.yml restart backend
```

---

## 📊 Monitoring Commands

### View logs in real-time:

```bash
# All services
docker-compose -f docker-compose-with-ollama.yml logs -f

# Backend only
docker logs -f multi-agent-backend

# Redis only
docker logs -f multi-agent-redis
```

### Check system resources:

```bash
# Container resource usage
docker stats

# Disk usage
docker system df

# Network usage
docker network inspect agent_network
```

### Check health endpoints:

```bash
# Basic health
watch -n 5 'curl -s http://localhost:8002/health | jq .'

# Detailed health with metrics
watch -n 10 'curl -s http://localhost:8002/health/detailed | jq .'
```

---

## 🔄 Update/Rollback Commands

### Update to latest code:

```bash
cd ~/xagent-auto

# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose-with-ollama.yml down
docker-compose -f docker-compose-with-ollama.yml build
docker-compose -f docker-compose-with-ollama.yml up -d
```

### Rollback to previous version:

```bash
cd ~/xagent-auto

# Stop current version
docker-compose -f docker-compose-with-ollama.yml down

# Restore backup .env
cp .env.backup.YYYYMMDD_HHMMSS .env

# Checkout previous commit
git log --oneline -10  # Find commit hash
git checkout <commit-hash>

# Rebuild
docker-compose -f docker-compose-with-ollama.yml build
docker-compose -f docker-compose-with-ollama.yml up -d
```

---

## 🧹 Cleanup Commands

### Clean up old containers/images:

```bash
# Remove stopped containers
docker container prune -f

# Remove unused images
docker image prune -a -f

# Remove unused volumes (CAREFUL!)
docker volume prune -f

# Clean everything (VERY CAREFUL!)
docker system prune -a --volumes -f
```

### Reset everything (nuclear option):

```bash
cd ~/xagent-auto

# Stop and remove everything
docker-compose -f docker-compose-with-ollama.yml down -v

# Remove all data (CAREFUL - THIS DELETES ALL DATA!)
sudo rm -rf data/backend/*
docker volume rm $(docker volume ls -q | grep multi-agent)

# Rebuild from scratch
docker-compose -f docker-compose-with-ollama.yml build --no-cache
docker-compose -f docker-compose-with-ollama.yml up -d
```

---

## 📦 Backup Commands

### Backup Neo4j data:

```bash
# Create backup directory
mkdir -p ~/backups/neo4j/$(date +%Y%m%d)

# Backup Neo4j
docker exec multi-agent-neo4j neo4j-admin database dump neo4j \
  --to-path=/backups/neo4j-backup-$(date +%Y%m%d_%H%M%S).dump

# Copy to host
docker cp multi-agent-neo4j:/backups ~/backups/neo4j/$(date +%Y%m%d)/
```

### Backup Redis data:

```bash
# Trigger Redis save
docker exec multi-agent-redis redis-cli BGSAVE

# Copy RDB file
docker cp multi-agent-redis:/data/dump.rdb ~/backups/redis-$(date +%Y%m%d_%H%M%S).rdb
```

### Backup .env file:

```bash
# Backup .env (encrypted)
cd ~/xagent-auto
tar -czf ~/backups/env-backup-$(date +%Y%m%d_%H%M%S).tar.gz .env
chmod 600 ~/backups/env-backup-*.tar.gz
```

---

## ✅ Quick Health Check Script

Save this as `health-check.sh`:

```bash
#!/bin/bash

echo "=== MULTI-AGENT PLATFORM HEALTH CHECK ==="
echo ""

echo "1. Container Status:"
docker-compose -f docker-compose-with-ollama.yml ps
echo ""

echo "2. Backend Health:"
curl -s http://localhost:8002/health | jq .
echo ""

echo "3. Redis Status:"
docker exec multi-agent-redis redis-cli ping
echo ""

echo "4. Neo4j Status:"
curl -s http://localhost:7475 > /dev/null && echo "✅ Neo4j responding" || echo "❌ Neo4j not responding"
echo ""

echo "5. Disk Usage:"
df -h | grep -E '(Filesystem|/$)'
echo ""

echo "6. Memory Usage:"
free -h
echo ""

echo "=== HEALTH CHECK COMPLETE ==="
```

Make it executable and run:

```bash
chmod +x health-check.sh
./health-check.sh
```

---

## 📝 Environment Variables Reference

Required variables in `.env`:

```bash
# CRITICAL - Must be set
SECRET_KEY=<generated>
ENCRYPTION_KEY=<generated>
NEO4J_PASSWORD=<generated>
REDIS_PASSWORD=<generated>
ALLOWED_ORIGINS=https://yourdomain.com

# Already configured
VITE_API_URL=https://devai.neoworks.ai/api
VITE_SUPABASE_URL=https://cybstyrslstfxlabiqyy.supabase.co
VITE_SUPABASE_ANON_KEY=<your-key>
VITE_OPENAI_API_KEY=<your-key>
VITE_PINECONE_API_KEY=<your-key>

# Optional
SENTRY_DSN=<your-sentry-dsn>
SENTRY_ENVIRONMENT=production
```

---

**Last Updated**: October 8, 2025  
**Status**: Ready for Deployment  
**Next**: Run Step 1 to generate secrets
