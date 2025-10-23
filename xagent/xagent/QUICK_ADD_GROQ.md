# ⚡ QUICK: Add Your Groq API Key

## 🚀 **Run These Commands**

You're currently in `backend` directory. Go back to root:

```powershell
# Go back to root directory
cd ..

# Run the script
.\add_groq_to_env.ps1

# When prompted, paste your Groq API key
# (It starts with gsk_...)

# Then restart frontend
npm run dev
```

---

## 📋 **Step by Step**

**1. Go to root directory:**
```powershell
cd ..
```

**2. Run the fixed script:**
```powershell
.\add_groq_to_env.ps1
```

**3. When it asks for your key, paste it and press Enter**

**4. Restart frontend:**
```powershell
npm run dev
```

---

## ✅ **What You'll See**

**After adding key and restarting:**

Browser console:
```
✅ Available: openai, groq
🎯 Using provider: groq (llama-3.1-70b-versatile)
✅ Response generated in 850ms
```

**Chat responses: ~1 second instead of 2-3 seconds!** ⚡

---

## 🎯 **Alternative: Manual Method**

If script still has issues, just:

**1. Open `.env` file (in root directory)**

**2. Add this line:**
```bash
VITE_GROQ_API_KEY=gsk_YOUR_ACTUAL_GROQ_KEY_HERE
```

**3. Save and restart:**
```bash
npm run dev
```

---

**That's it! Sub-second responses incoming!** 🚀


