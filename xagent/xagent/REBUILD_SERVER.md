# Rebuild Server After Copying Files

## 🚀 Run These Commands

### Step 1: SSH to Server
```bash
ssh saiworks@100.87.45.61
```

### Step 2: Navigate to Project
```bash
cd /home/saiworks/xagent
```

### Step 3: Rebuild App Container (This fixes the errors)
```bash
docker-compose -f docker-compose-with-ollama.yml build --no-cache app
```

### Step 4: Restart App
```bash
docker-compose -f docker-compose-with-ollama.yml up -d app
```

### Step 5: Watch Logs (Optional)
```bash
docker-compose -f docker-compose-with-ollama.yml logs -f app
```

Press `Ctrl+C` to exit logs.

---

## ⚡ One-Liner (All in One Command)

If you prefer, run this single command from your local machine:

```bash
ssh saiworks@100.87.45.61 'cd /home/saiworks/xagent && docker-compose -f docker-compose-with-ollama.yml build --no-cache app && docker-compose -f docker-compose-with-ollama.yml up -d app'
```

---

## ✅ After Rebuild

1. Wait 2-3 minutes for build to complete
2. Visit: `https://devai.neoworks.ai`
3. Check browser console - should see:
   ```
   ✅ Supabase client initialized successfully
   ✅ Supabase connected successfully
   ✅ Auth state changed: INITIAL_SESSION User logged out
   ```
4. **NO MORE ERRORS!** ❌ `TypeError: o is not a function` - GONE!

---

## 🧪 Test After Rebuild

- Visit: `https://devai.neoworks.ai/test/supabase` - All tests pass ✓
- Visit: `https://devai.neoworks.ai/login` - Try login/signup
- Check console - Clean, no errors! 🎉

---

## ⏱️ Build Time

- Expected: 5-10 minutes
- You'll see: Building... then "Successfully built"

