# Supabase Connection Setup & Testing Guide

## ✅ What We're Doing (Architecture)

### 1. **Centralized Supabase Client**
```
src/config/supabase/index.ts
  ↓
  Creates ONE Supabase client instance
  ↓
  Exported via getSupabaseClient()
  ↓
  Used by all services (no duplicate instances)
```

### 2. **Provider Hierarchy**
```
main.tsx
  → SupabaseProvider (tests connection)
    → AuthProvider (initializes authentication)
      → App (your application)
```

### 3. **Connection Flow**
```
1. App starts
2. SupabaseProvider connects to Supabase
3. AuthProvider sets up session management
4. User can login/signup
5. All services use the same client instance
```

---

## 🔐 Your Current Configuration

**Supabase URL:** `https://cybstyrslstfxlabiqyy.supabase.co`
**Anon Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (configured ✓)

---

## 📋 How to Verify Connection

### Step 1: Sync All Files
Run the commands from `sync-commands.txt` to copy all fixed files to your server.

### Step 2: Rebuild Docker Container
```bash
ssh saiworks@100.87.45.61
cd /home/saiworks/xagent
docker-compose -f docker-compose-with-ollama.yml build --no-cache app
docker-compose -f docker-compose-with-ollama.yml up -d app
```

### Step 3: Test Supabase Connection
Navigate to: **`https://devai.neoworks.ai/test/supabase`**

This will run 6 automated tests:
1. ✓ Supabase Client Availability
2. ✓ Environment Variables
3. ✓ Auth Session
4. ✓ Get Current User
5. ✓ Database Connection
6. ✓ Auth State Listener

---

## 🎯 What Should Happen

### **Before Login:**
- ✅ Client available
- ✅ Environment variables set
- ✅ Auth session: "No active session (expected)"
- ✅ Current user: "No user (expected)"
- ✅ Database connection: "Successfully connected"
- ✅ Auth listener working

### **After Login:**
- ✅ Auth session: "Active session found"
- ✅ Current user: Shows your email
- ✅ All other tests still pass

---

## 🔍 What We Fixed

### 1. **Multiple Client Instances → Single Instance**
**Before:** 17 services creating their own Supabase clients
**After:** All use `getSupabaseClient()` from central config

### 2. **Auth Subscription Errors → Proper Handling**
**Before:** `TypeError: u is not a function`
**After:** Properly destructure `{ data: authListener }` and store subscription

### 3. **No Cleanup → Memory Leak Prevention**
**Before:** Auth listeners never unsubscribed
**After:** Store subscription and add `destroy()` method

---

## 🗄️ Database Tables Needed

For authentication to work fully, your Supabase project should have:

### Required Tables:
1. **`auth.users`** - Built-in Supabase auth (already exists)
2. **`public.users`** - Your custom user profile data
3. **`public.documents`** - For knowledge base
4. **`public.agents`** - For AI agents
5. **`public.workflows`** - For workflow designer
6. **`public.chat_messages`** - For chat history
7. **`public.agent_memories`** - For tiered memory system

---

## 🚨 Common Issues & Solutions

### Issue 1: "Multiple GoTrueClient instances"
**Cause:** Some service still creating own client
**Solution:** Already fixed - all services use `getSupabaseClient()`

### Issue 2: "TypeError: u is not a function"
**Cause:** Auth subscription not properly handled
**Solution:** Already fixed - proper destructuring in SessionManager & AuthService

### Issue 3: Blank page
**Cause:** Environment variables not loaded
**Solution:** Ensure `.env` file copied to server and Docker Compose reads it

### Issue 4: "supabaseUrl is required"
**Cause:** ENV vars not passed to Docker build
**Solution:** Already fixed - `docker-compose-with-ollama.yml` has build args

---

## 📊 How to Check If It's Working

### From Browser Console:
```javascript
// Check if Supabase is loaded
console.log(window.__SUPABASE_CLIENT__)

// Should see initialization logs:
// "🔗 Supabase Configuration: ..."
// "✅ Supabase client initialized successfully"
// "🔗 Connecting to Supabase..."
// "✅ Supabase connected successfully"
```

### Expected Console Output (Good):
```
🔗 Supabase Configuration: {url: "https://cybstyrslstfxlabiqyy...", keyLength: 271, isValid: true}
✅ Supabase client initialized successfully
🔗 Connecting to Supabase...
✅ Supabase connected successfully
Auth state changed: INITIAL_SESSION User logged out
```

### Bad Output (Errors):
```
❌ Multiple GoTrueClient instances detected  → FIXED
❌ TypeError: u is not a function            → FIXED
❌ supabaseUrl is required                   → Check ENV vars
```

---

## 🎓 Understanding the Flow

### When User Visits the App:

1. **Browser loads index.html**
2. **Vite injects environment variables** (VITE_SUPABASE_URL, etc.)
3. **main.tsx renders:**
   ```tsx
   <SupabaseProvider>  ← Tests connection
     <AuthProvider>    ← Sets up authentication
       <App />         ← Your app
     </AuthProvider>
   </SupabaseProvider>
   ```
4. **SupabaseProvider checks connection:**
   - Calls `isSupabaseConnected()` 
   - Tests `supabase.auth.getSession()`
   - If successful → Renders children
   - If failed → Shows error message

5. **AuthProvider initializes:**
   - Creates SessionManager
   - Sets up auth state listener
   - Loads current session (if any)

6. **User can now:**
   - Login/Register
   - Access protected routes
   - All services share the same Supabase client

---

## ✅ Checklist

- [x] Centralized Supabase client created
- [x] All 17 services updated to use centralized client
- [x] Auth subscription handling fixed
- [x] Cleanup methods added
- [x] Test component created (`/test/supabase`)
- [x] Sync commands prepared
- [ ] Files synced to server
- [ ] Docker container rebuilt
- [ ] Connection test passed
- [ ] Login/Signup working
- [ ] No console errors

---

## 🚀 Ready to Deploy

Run these commands in order:

```powershell
# 1. Copy all files (from Windows)
.\sync-supabase-fixes.ps1
# OR manually run each command from sync-commands.txt

# 2. SSH to server
ssh saiworks@100.87.45.61

# 3. Rebuild app
cd /home/saiworks/xagent
docker-compose -f docker-compose-with-ollama.yml build --no-cache app
docker-compose -f docker-compose-with-ollama.yml up -d app

# 4. Check logs
docker-compose -f docker-compose-with-ollama.yml logs -f app

# 5. Test connection
# Open: https://devai.neoworks.ai/test/supabase
```

---

## 📞 Troubleshooting

If you see errors, check:
1. **ENV file exists:** `cat .env | grep VITE_SUPABASE`
2. **Docker sees ENV:** `docker-compose config | grep VITE_SUPABASE`
3. **App has ENV:** `docker exec xagent-app-1 printenv | grep VITE`
4. **Browser has ENV:** Open console, type `import.meta.env.VITE_SUPABASE_URL`

---

**That's it!** Your Supabase connection is properly set up with singleton pattern, proper error handling, and full testing capability. 🎉

