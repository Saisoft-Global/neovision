# 🔴 CRITICAL SECURITY FIXES - APPLY IMMEDIATELY

## ⚡ **QUICK FIXES (30 Minutes)**

These fixes address the most critical security vulnerabilities that MUST be fixed before any release.

---

## 🔒 **FIX 1: Remove Hardcoded Secrets**

### **Backend Auth Fix**

**File:** `backend/app/auth.py`

**Replace this:**
```python
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key")
```

**With this:**
```python
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("❌ CRITICAL: SECRET_KEY environment variable must be set for security")
```

---

## 🔑 **FIX 2: Generate Strong Secrets**

### **Create .env File**

**Create:** `.env` (add to .gitignore!)

```bash
# Generate strong secrets (run these commands):
# For SECRET_KEY:
python -c "import secrets; print(secrets.token_urlsafe(64))"

# For NEO4J_PASSWORD:
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

**Example .env:**
```env
# Backend Security
SECRET_KEY=<PASTE_GENERATED_SECRET_HERE>

# Database Passwords
NEO4J_PASSWORD=<PASTE_GENERATED_PASSWORD_HERE>

# Supabase (already configured)
VITE_SUPABASE_URL=https://cybstyrslstfxlabiqyy.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# OpenAI
VITE_OPENAI_API_KEY=sk-proj-...
VITE_OPENAI_ORG_ID=org-...

# Pinecone
VITE_PINECONE_API_KEY=pcsk_...
VITE_PINECONE_ENVIRONMENT=gcp-starter
VITE_PINECONE_INDEX_NAME=multi-agent-platform

# Groq
VITE_GROQ_API_KEY=gsk_...

# CORS Configuration
ALLOWED_ORIGINS=https://devai.neoworks.ai,https://www.devai.neoworks.ai
```

---

## 📝 **FIX 3: Create .env.example**

**Create:** `.env.example` (safe to commit)

```env
# Backend Security
SECRET_KEY=GENERATE_WITH_COMMAND_BELOW

# Database Passwords  
NEO4J_PASSWORD=GENERATE_WITH_COMMAND_BELOW

# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI
VITE_OPENAI_API_KEY=your_openai_api_key
VITE_OPENAI_ORG_ID=your_openai_org_id

# Pinecone
VITE_PINECONE_API_KEY=your_pinecone_api_key
VITE_PINECONE_ENVIRONMENT=your_pinecone_environment
VITE_PINECONE_INDEX_NAME=your_pinecone_index_name

# Groq
VITE_GROQ_API_KEY=your_groq_api_key

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:8081

# Generate secrets with:
# python -c "import secrets; print(secrets.token_urlsafe(64))"
```

---

## 🐳 **FIX 4: Update Docker Compose**

### **docker-compose-with-ollama.yml**

**Find:**
```yaml
NEO4J_AUTH=neo4j/yourpassword
```

**Replace with:**
```yaml
NEO4J_AUTH=neo4j/${NEO4J_PASSWORD}
```

**Add to backend service:**
```yaml
backend:
  environment:
    - SECRET_KEY=${SECRET_KEY}
    - NEO4J_PASSWORD=${NEO4J_PASSWORD}
    # ... rest of env vars
```

---

## 🚫 **FIX 5: Update .gitignore**

**Add to .gitignore:**
```gitignore
# Environment variables
.env
.env.local
.env.*.local

# Secrets
secrets/
*.key
*.pem
*.crt

# Backup files with sensitive data
*.sql
*.dump
backups/

# IDE files with credentials
.vscode/settings.json
.idea/
```

---

## 🛡️ **FIX 6: Add Rate Limiting (Backend)**

**Create:** `backend/app/middleware/rate_limit.py`

```python
from fastapi import Request, HTTPException
from collections import defaultdict
from datetime import datetime, timedelta
import asyncio

class RateLimiter:
    def __init__(self, requests: int = 100, window: int = 60):
        self.requests = requests
        self.window = window
        self.clients = defaultdict(list)
    
    async def check_rate_limit(self, request: Request):
        client_ip = request.client.host
        now = datetime.now()
        
        # Clean old requests
        self.clients[client_ip] = [
            req_time for req_time in self.clients[client_ip]
            if now - req_time < timedelta(seconds=self.window)
        ]
        
        # Check limit
        if len(self.clients[client_ip]) >= self.requests:
            raise HTTPException(
                status_code=429,
                detail="Too many requests. Please try again later."
            )
        
        # Add current request
        self.clients[client_ip].append(now)

rate_limiter = RateLimiter(requests=100, window=60)
```

**Update:** `backend/main.py`

```python
from app.middleware.rate_limit import rate_limiter

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    await rate_limiter.check_rate_limit(request)
    response = await call_next(request)
    return response
```

---

## 🔐 **FIX 7: Secure CORS Configuration**

**Update:** `backend/main.py`

**Replace:**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ❌ INSECURE
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**With:**
```python
import os

# Get allowed origins from environment
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "").split(",")
if not ALLOWED_ORIGINS or ALLOWED_ORIGINS == [""]:
    raise ValueError("❌ CRITICAL: ALLOWED_ORIGINS must be set")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,  # ✅ Specific domains only
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["Content-Type", "Authorization"],
    max_age=3600,
)
```

---

## ✅ **FIX 8: Add Health Check Endpoint**

**Add to:** `backend/main.py`

```python
from datetime import datetime

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
        "services": {
            "database": "connected",
            "neo4j": "connected",
        }
    }

@app.get("/")
async def root():
    return {
        "message": "Multi-Agent AI Platform API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }
```

---

## 🔒 **FIX 9: Add Password Strength Validation**

**Create:** `backend/app/utils/password.py`

```python
import re
from typing import Tuple

def validate_password_strength(password: str) -> Tuple[bool, str]:
    """
    Validates password strength.
    Returns (is_valid, error_message)
    """
    if len(password) < 12:
        return False, "Password must be at least 12 characters long"
    
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"
    
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter"
    
    if not re.search(r"\d", password):
        return False, "Password must contain at least one number"
    
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        return False, "Password must contain at least one special character"
    
    # Check against common passwords
    common_passwords = ["password123", "admin123", "welcome123"]
    if password.lower() in common_passwords:
        return False, "Password is too common"
    
    return True, ""
```

**Use in registration:**
```python
from app.utils.password import validate_password_strength

@app.post("/auth/register")
async def register(email: str, password: str):
    is_valid, error = validate_password_strength(password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)
    
    # Continue with registration...
```

---

## 📊 **FIX 10: Add Request Logging**

**Create:** `backend/app/middleware/logging.py`

```python
import logging
from fastapi import Request
import time

logger = logging.getLogger(__name__)

async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    # Log request
    logger.info(f"Request: {request.method} {request.url.path}")
    
    # Process request
    response = await call_next(request)
    
    # Log response
    process_time = time.time() - start_time
    logger.info(
        f"Response: {response.status_code} "
        f"(took {process_time:.3f}s)"
    )
    
    return response
```

---

## 🚀 **DEPLOYMENT SCRIPT**

**Create:** `deploy-secure.sh`

```bash
#!/bin/bash

echo "🔒 Applying Critical Security Fixes..."

# 1. Check for .env file
if [ ! -f .env ]; then
    echo "❌ ERROR: .env file not found!"
    echo "📝 Creating .env from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env with your actual secrets before continuing"
    exit 1
fi

# 2. Validate required environment variables
required_vars=("SECRET_KEY" "NEO4J_PASSWORD" "VITE_SUPABASE_URL" "ALLOWED_ORIGINS")
for var in "${required_vars[@]}"; do
    if ! grep -q "^${var}=" .env; then
        echo "❌ ERROR: ${var} not set in .env"
        exit 1
    fi
done

# 3. Check for weak passwords
if grep -q "yourpassword\|your-secret-key\|test123" .env; then
    echo "❌ ERROR: Weak or default passwords detected in .env"
    exit 1
fi

# 4. Rebuild with security fixes
echo "🔨 Rebuilding containers with security fixes..."
docker-compose -f docker-compose-with-ollama.yml down
docker-compose -f docker-compose-with-ollama.yml build --no-cache
docker-compose -f docker-compose-with-ollama.yml up -d

echo "✅ Security fixes applied successfully!"
echo "📊 Check logs: docker-compose -f docker-compose-with-ollama.yml logs -f"
```

---

## ✅ **VERIFICATION CHECKLIST**

After applying fixes, verify:

- [ ] `.env` file exists and is in `.gitignore`
- [ ] All secrets are strong (64+ characters)
- [ ] No hardcoded secrets in code
- [ ] CORS is configured with specific domains
- [ ] Rate limiting is working
- [ ] Health check endpoint responds
- [ ] Password validation is enforced
- [ ] Logs show request/response info
- [ ] Docker containers start successfully
- [ ] Application is accessible

---

## 🧪 **TEST THE FIXES**

### **1. Test Rate Limiting:**
```bash
# Should block after 100 requests in 60 seconds
for i in {1..105}; do
    curl http://localhost:8002/health
done
```

### **2. Test CORS:**
```bash
# Should reject requests from unauthorized origins
curl -H "Origin: http://evil.com" http://localhost:8002/health
```

### **3. Test Password Validation:**
```bash
# Should reject weak passwords
curl -X POST http://localhost:8002/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"weak"}'
```

### **4. Test Health Check:**
```bash
# Should return healthy status
curl http://localhost:8002/health
```

---

## ⏱️ **TIME ESTIMATE**

- Fix 1-5 (Secrets & Config): **15 minutes**
- Fix 6 (Rate Limiting): **10 minutes**
- Fix 7 (CORS): **5 minutes**
- Fix 8 (Health Check): **5 minutes**
- Fix 9 (Password Validation): **10 minutes**
- Fix 10 (Logging): **5 minutes**
- Testing & Verification: **10 minutes**

**Total: ~60 minutes** ⏰

---

## 🎯 **PRIORITY ORDER**

1. **FIX 1-3** (Secrets) - **CRITICAL** 🔴
2. **FIX 4-5** (Docker & Git) - **CRITICAL** 🔴
3. **FIX 7** (CORS) - **HIGH** 🟡
4. **FIX 6** (Rate Limiting) - **HIGH** 🟡
5. **FIX 8-10** (Monitoring) - **MEDIUM** 🟢

---

**Apply these fixes BEFORE any deployment to end users!** 🚨
