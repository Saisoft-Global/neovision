# 🔐 SECURITY SETUP GUIDE

## Quick Setup Instructions

### Step 1: Generate Secrets

Run this command on your Ubuntu server to generate secure secrets:

```bash
cd ~/xagent-auto

# Generate SECRET_KEY
python3 -c "import secrets; print('SECRET_KEY=' + secrets.token_urlsafe(32))"

# Generate ENCRYPTION_KEY
python3 -c "import base64; import os; print('ENCRYPTION_KEY=' + base64.b64encode(os.urandom(32)).decode())"

# Generate NEO4J_PASSWORD
python3 -c "import secrets; print('NEO4J_PASSWORD=' + secrets.token_urlsafe(16))"

# Generate REDIS_PASSWORD
python3 -c "import secrets; print('REDIS_PASSWORD=' + secrets.token_urlsafe(16))"
```

### Step 2: Update .env File

Copy the generated values and update your `.env` file:

```bash
cd ~/xagent-auto
nano .env
```

Add these lines (replace with your generated values):

```bash
# Security Keys (REQUIRED)
SECRET_KEY=your_generated_secret_key_here
ENCRYPTION_KEY=your_generated_encryption_key_here

# Database Passwords (REQUIRED)
NEO4J_PASSWORD=your_generated_neo4j_password_here
REDIS_PASSWORD=your_generated_redis_password_here

# CORS Security (REQUIRED for production)
ALLOWED_ORIGINS=https://devai.neoworks.ai,http://localhost:5173

# Keep your existing values
VITE_API_URL=https://devai.neoworks.ai/api
VITE_SUPABASE_URL=https://cybstyrslstfxlabiqyy.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_OPENAI_API_KEY=sk-proj-...
VITE_OPENAI_ORG_ID=org-...
VITE_PINECONE_API_KEY=pcsk_...
VITE_PINECONE_ENVIRONMENT=gcp-starter
VITE_PINECONE_INDEX_NAME=multi-agent-platform
VITE_GROQ_API_KEY=gsk_...

# Optional: Monitoring
SENTRY_DSN=
SENTRY_ENVIRONMENT=production
```

### Step 3: Rebuild Containers

After updating .env, rebuild and restart:

```bash
cd ~/xagent-auto
docker-compose -f docker-compose-with-ollama.yml down
docker-compose -f docker-compose-with-ollama.yml build
docker-compose -f docker-compose-with-ollama.yml up -d
```

### Step 4: Verify

Check that all services are running:

```bash
# Check containers
docker-compose -f docker-compose-with-ollama.yml ps

# Check backend health
curl http://localhost:8002/health

# Check backend logs
docker logs multi-agent-backend --tail 50
```

---

## What Was Implemented

### ✅ Security Features

1. **SECRET_KEY Validation**
   - Backend now requires SECRET_KEY to be set
   - No more hardcoded default values
   - Application won't start without it

2. **Rate Limiting**
   - 100 requests/minute per IP (general)
   - 10 login attempts/hour per IP
   - 5 signup attempts/hour per IP
   - 200 API calls/minute per IP

3. **Password Policy**
   - Minimum 12 characters
   - Must include: uppercase, lowercase, numbers, special chars
   - Checks against common passwords
   - Prevents sequential/repeated characters

4. **Input Validation**
   - Email validation
   - SQL injection prevention
   - XSS prevention
   - File upload validation
   - URL validation

5. **CORS Security**
   - Configurable allowed origins
   - No more wildcard (*) in production
   - Specific methods only

6. **Data Encryption**
   - Sensitive fields encrypted at rest
   - API keys and tokens encrypted
   - Email credentials encrypted

7. **Session Management**
   - JWT access tokens: 15 minutes
   - Refresh tokens: 7 days
   - Session timeout: 30 minutes inactivity

8. **Health Checks**
   - `/health` - Basic health
   - `/health/detailed` - System metrics
   - `/health/ready` - Readiness probe
   - `/health/live` - Liveness probe

9. **Audit Logging**
   - All user actions logged
   - Security events tracked
   - Data access logged
   - Login attempts tracked

10. **Redis Caching**
    - Embeddings cached (24 hours)
    - Search results cached (1 hour)
    - API responses cached
    - Session storage

11. **Error Tracking**
    - Sentry integration ready
    - Structured logging
    - Performance monitoring
    - User context tracking

---

## Files Created/Modified

### Backend Files Created:
- `backend/middleware/rate_limiter.py` - Rate limiting
- `backend/utils/password_validator.py` - Password validation
- `backend/utils/input_validator.py` - Input sanitization
- `backend/routers/health.py` - Health check endpoints
- `backend/services/encryption_service.py` - Data encryption
- `backend/services/audit_service.py` - Audit logging
- `backend/services/cache_service.py` - Redis caching

### Backend Files Modified:
- `backend/app/auth.py` - Added SECRET_KEY validation, refresh tokens
- `backend/main.py` - Added rate limiting, CORS security, error handling
- `backend/requirements.txt` - Added new dependencies

### Frontend Files Created:
- `src/utils/passwordValidator.ts` - Password validation
- `src/services/monitoring/SentryService.ts` - Error tracking
- `src/services/logging/Logger.ts` - Centralized logging

### Configuration Files:
- `.env.example` - Environment variable template
- `docker-compose-with-ollama.yml` - Updated with Redis, security env vars

---

## Security Checklist

Before going to production, ensure:

- [ ] All secrets generated and added to .env
- [ ] .env file NOT committed to git
- [ ] ALLOWED_ORIGINS set to your domain only
- [ ] Strong NEO4J_PASSWORD set
- [ ] Strong REDIS_PASSWORD set
- [ ] HTTPS enabled (via Cloudflare Tunnel)
- [ ] Sentry DSN configured (optional but recommended)
- [ ] Backups configured
- [ ] Monitoring alerts set up

---

## Next Steps

After completing this security setup:

1. **Test the application** - Ensure everything works
2. **Monitor logs** - Check for any errors
3. **Performance test** - Verify caching is working
4. **Security audit** - Review all endpoints
5. **Documentation** - Update user guides

Then you'll be ready for:
- ✅ Beta testing with real users
- ✅ Production deployment
- ✅ MCP implementation (next major feature)

---

## Troubleshooting

### Backend won't start - "SECRET_KEY not set"
```bash
# Generate and add SECRET_KEY to .env
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Redis connection failed
```bash
# Check Redis is running
docker ps | grep redis

# Check Redis logs
docker logs multi-agent-redis
```

### Rate limiting too strict
Edit `backend/middleware/rate_limiter.py` and adjust limits:
```python
self.limits = {
    'default': (200, 60),  # Increase from 100 to 200
    'login': (20, 3600),   # Increase from 10 to 20
    # ...
}
```

---

## Support

If you encounter issues:
1. Check logs: `docker logs multi-agent-backend --tail 100`
2. Verify .env file has all required variables
3. Ensure containers are running: `docker-compose ps`
4. Check health endpoint: `curl http://localhost:8002/health`

---

**Created**: October 8, 2025  
**Status**: Ready for deployment  
**Next**: Generate secrets and rebuild containers
