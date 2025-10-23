# 🚨 Quick Fix for RAG Context Issues

## Problem
- Frontend: `TypeError: this.vectorStore.setOrganizationContext is not a function`
- Backend: 500 errors on `/api/vectors/search`
- RAG failing to set organization context

## Root Cause
1. **Backend server is still running OLD code** (needs restart)
2. **Frontend browser has cached OLD TypeScript** (needs hard refresh)

## ✅ Solution (2 Steps)

### Step 1: Restart Backend ⚠️ CRITICAL
```powershell
# In the backend terminal window:
# Press Ctrl+C to stop the server

# Then restart:
cd ..
.\start-backend.ps1
```

**What to look for:**
```
✅ OpenAI API key loaded: sk-proj-...
✅ Pinecone API key loaded: pcsk_...
✅ Pinecone service initialized: multi-agent-platform
```

### Step 2: Hard Refresh Frontend
```
In your browser (where the app is open):
Windows: Ctrl + Shift + R
OR
Ctrl + F5
```

This will:
- Clear cached TypeScript files
- Load the updated `VectorStoreManager` with `setOrganizationContext()`
- Load the updated frontend code

## After Restart - Test

1. Open chat with any agent
2. Send a message
3. Check browser console - should see:
```
🏢 VectorStoreManager organization context set: <org-id>
✅ Vector query successful
```

4. Check backend logs - should see:
```
INFO:     POST /api/vectors/search HTTP/1.1 200 OK
```

## If Still Getting Errors

### Check Backend Logs
Look in the backend terminal for any Python errors when the vector search endpoint is hit.

### Check Frontend Console
Should NOT see:
- ❌ `setOrganizationContext is not a function`
- ❌ `500 Internal Server Error`

Should see:
- ✅ `VectorStoreManager organization context set`
- ✅ `Vector query successful`

## Quick Verification Commands

**Test backend has new methods:**
```powershell
cd backend
python -c "from services.pinecone_service import PineconeService; import os; print('Methods OK:', hasattr(PineconeService(), 'search') and hasattr(PineconeService(), 'generate_embeddings'))"
```

Should output: `Methods OK: True`

