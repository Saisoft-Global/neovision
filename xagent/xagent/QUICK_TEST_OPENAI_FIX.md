# 🧪 Quick Test Guide - OpenAI Key Fix

## ✅ What Was Fixed

All issues with the backend not recognizing the OpenAI key have been resolved:

1. ✅ Created `.env` file with OpenAI keys (both `OPENAI_API_KEY` and `VITE_OPENAI_API_KEY`)
2. ✅ Updated backend to load environment variables from root directory
3. ✅ Added logging to show which keys are loaded on startup
4. ✅ Simplified startup script with better error checking
5. ✅ Created backend/.env copy for Python dotenv

## 🚀 Test the Fix Now

### Step 1: Start the Backend

```powershell
.\start-backend.ps1
```

**Expected Output:**
```
🚀 Starting XAgent Backend Server...
✅ Found .env file - Python dotenv will load it automatically

📝 Note: Backend will load environment variables from:
   1. Root .env file (checked above)
   2. backend/.env file (if exists)
   The backend will log which keys are loaded on startup

🌐 Starting server on http://localhost:8000
📚 API Docs will be available at http://localhost:8000/api/docs

INFO:     Will watch for changes in these directories: ['C:\\saisoft\\xagent\\xagent\\backend']
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [xxxxx] using StatReload
🔍 Checking environment variables...
✅ OpenAI API key loaded: sk-proj-Rxbe0LO32Ofv...
✅ Pinecone API key loaded: pcsk_4CKprB_4TJYqHNr...
INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
```

**Key things to look for:**
- ✅ "Found .env file" message
- ✅ "✅ OpenAI API key loaded: sk-proj-..." in logs
- ✅ Server starts without errors

### Step 2: Test the OpenAI Proxy Endpoint

Open your browser and go to:
```
http://localhost:8000/api/docs
```

1. Find the **`/api/openai/chat/completions`** endpoint
2. Click "Try it out"
3. Use this test payload:
```json
{
  "model": "gpt-3.5-turbo",
  "messages": [
    {
      "role": "user",
      "content": "Say 'OpenAI integration is working!'"
    }
  ],
  "temperature": 0.7
}
```
4. Click "Execute"

**Expected Response:**
```json
{
  "id": "chatcmpl-...",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "gpt-3.5-turbo-0125",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "OpenAI integration is working!"
      },
      "finish_reason": "stop"
    }
  ]
}
```

### Step 3: Start the Frontend (Optional)

In a new terminal:
```bash
npm run dev
```

Then test an agent that uses OpenAI in the web interface.

## 🐛 Troubleshooting

### Issue: Backend still shows "OpenAI API key NOT found"

**Solution 1: Check .env file**
```powershell
Get-Content .env | Select-String "OPENAI_API_KEY"
```
Should show both keys.

**Solution 2: Verify backend/.env exists**
```powershell
Test-Path backend\.env
```
Should return `True`. If not:
```powershell
Copy-Item .env backend\.env
```

**Solution 3: Check Python dotenv**
```powershell
cd backend
pip install python-dotenv
```

### Issue: "Invalid API key" error

**Solution:**
Your OpenAI key might have expired or been revoked. Get a new one from:
https://platform.openai.com/api-keys

Then update `.env`:
```bash
VITE_OPENAI_API_KEY=sk-your-new-key
OPENAI_API_KEY=sk-your-new-key
```

### Issue: CORS errors in browser console

**Solution:**
Make sure frontend's VITE_BACKEND_URL matches backend URL:
```bash
# In .env
VITE_BACKEND_URL=http://localhost:8000
```

## 📝 What Changed

### Files Created:
- `.env` - Main environment configuration
- `backend/.env` - Copy for backend directory
- `OPENAI_KEY_FIX_COMPLETE.md` - Complete documentation
- `QUICK_TEST_OPENAI_FIX.md` - This test guide

### Files Modified:
- `backend/main.py` - Enhanced environment loading with logging
- `start-backend.ps1` - Simplified with better error checking

### Files Verified (no changes needed):
- `backend/routers/openai_proxy.py` - Already correct
- `src/services/llm/providers/OpenAIProvider.ts` - Already correct
- `src/services/openai/chat.ts` - Already correct
- `src/services/openai/embeddings.ts` - Already correct

## ✅ Success Criteria

You'll know the fix worked when you see:

1. ✅ Backend startup shows "✅ OpenAI API key loaded: sk-proj-..."
2. ✅ No "OpenAI API key NOT found" warnings
3. ✅ `/api/openai/chat/completions` endpoint returns valid responses
4. ✅ Frontend can successfully use OpenAI-powered agents
5. ✅ No CORS errors in browser console

## 🎯 Next Steps

After confirming the fix works:

1. **Update your actual OpenAI key** (if the template key doesn't work):
   - Get a new key from https://platform.openai.com/api-keys
   - Update both `OPENAI_API_KEY` and `VITE_OPENAI_API_KEY` in `.env`
   - Restart the backend

2. **Test other integrations** (Pinecone, Supabase, etc.)

3. **Set up production environment** with proper keys

4. **Never commit `.env`** - It's already in `.gitignore` but be careful!

## 📞 Need Help?

If you still have issues after trying these steps:

1. Check backend console logs for specific error messages
2. Check browser console for frontend errors
3. Verify your OpenAI key is valid at https://platform.openai.com
4. Make sure you have sufficient OpenAI API credits

---

**You should now be able to start the backend and see it properly recognize the OpenAI key! 🎉**

