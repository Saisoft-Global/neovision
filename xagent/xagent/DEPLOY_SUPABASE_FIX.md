# Quick Deploy Guide - Supabase Authentication Fix

## 🎯 What This Fixes

1. ❌ **"Multiple GoTrueClient instances detected"** → ✅ Single centralized client
2. ❌ **"TypeError: u is not a function"** → ✅ Proper auth subscription handling
3. ❌ **Authentication errors** → ✅ Clean session management

---

## 🚀 Quick Steps to Deploy

### Option A: Run PowerShell Script (Recommended)
```powershell
.\sync-supabase-fixes.ps1
```

### Option B: Manual Commands
Open `sync-commands.txt` and run each `scp` command one by one.

---

## 📦 After Syncing Files

```bash
# SSH to server
ssh saiworks@100.87.45.61

# Navigate to project
cd /home/saiworks/xagent

# Rebuild with no cache
docker-compose -f docker-compose-with-ollama.yml build --no-cache app

# Restart the app
docker-compose -f docker-compose-with-ollama.yml up -d app

# Watch logs
docker-compose -f docker-compose-with-ollama.yml logs -f app
```

---

## ✅ How to Verify It Works

### 1. Check Console Logs
Open `https://devai.neoworks.ai` and check browser console:

**Good Output:**
```
✅ Supabase client initialized successfully
✅ Supabase connected successfully
Auth state changed: INITIAL_SESSION User logged out
```

**No More Errors:**
```
❌ Multiple GoTrueClient instances detected  ← GONE
❌ TypeError: u is not a function            ← GONE
```

### 2. Run Connection Test
Navigate to: `https://devai.neoworks.ai/test/supabase`

Should see 6 tests, all passing (✓):
- Supabase Client Availability ✓
- Environment Variables ✓
- Auth Session ✓
- Get Current User ✓
- Database Connection ✓
- Auth State Listener ✓

### 3. Try Login
Go to `/login` and test authentication.

---

## 📁 Files Being Updated

**Core Config:**
- `src/config/supabase/index.ts` - Centralized client

**Auth Services:**
- `src/services/auth/SessionManager.ts` - Fixed subscription handling
- `src/services/auth/AuthService.ts` - Fixed onAuthStateChange

**Services (17 files using centralized client):**
- `src/services/agent/AgentFactory.ts`
- `src/services/email/EmailService.ts`
- `src/services/context/SharedContext.ts`
- `src/services/knowledge/versioning/KnowledgeVersionManager.ts`
- `src/services/workflow/template/WorkflowTemplateManager.ts`
- `src/services/workflow/version/WorkflowVersionManager.ts`
- `src/services/meeting/MeetingService.ts`
- `src/services/metrics/CollaborationMetrics.ts`
- `src/services/feedback/FeedbackCollector.ts`
- `src/services/training/DatasetManager.ts`
- `src/services/training/ModelVersionManager.ts`
- `src/services/integration/webhook/WebhookManager.ts`
- `src/services/integration/datasource/DataSourceManager.ts`
- `src/services/agent/templates/TemplateManager.ts`
- `src/services/embeddings/EmbeddingRefresher.ts`

**Test & Routes:**
- `src/components/test/SupabaseConnectionTest.tsx` - NEW test component
- `src/routes/index.tsx` - Added /test/supabase route

---

## 🔑 Your Supabase Credentials (Already Configured)

```
VITE_SUPABASE_URL=https://cybstyrslstfxlabiqyy.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5YnN0eXJzbHN0ZnhsYWJpcXl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU2Njc0MTIsImV4cCI6MjA1MTI0MzQxMn0.4AOjyytEEKVLfQQdN26aG3oePfiJlu2UvaGawIq57rY
```

These are already in your `.env` file ✓

---

## ⏱️ Estimated Time

- Sync files: 2-3 minutes
- Rebuild Docker: 5-10 minutes
- Test: 1 minute

**Total: ~15 minutes**

---

## 🆘 If Something Goes Wrong

### Error: "Cannot connect to Supabase"
**Check:** ENV variables are loaded
```bash
cat .env | grep VITE_SUPABASE
```

### Error: Build fails
**Solution:** Clear Docker cache
```bash
docker system prune -a
docker-compose -f docker-compose-with-ollama.yml build --no-cache app
```

### Error: Still see "Multiple GoTrueClient"
**Solution:** Hard refresh browser (Ctrl+Shift+R) to clear cache

---

## 📖 For More Details

See `SUPABASE_SETUP_GUIDE.md` for comprehensive documentation.

---

## ✅ Done!

Once deployed and tested, you'll have:
- ✅ Single Supabase client instance (no duplicates)
- ✅ Proper authentication flow
- ✅ Clean console (no errors)
- ✅ Working login/signup
- ✅ Test page to verify connection anytime

🎉 **Your authentication is now production-ready!**

