# 🚀 START EVERYTHING - Frontend + Backend

## ⚡ **EASIEST METHOD - One Script Starts Both** ⭐

```powershell
.\START_COMPLETE_SYSTEM.ps1
```

**This automatically:**
- ✅ Checks Python & Node installed
- ✅ Starts backend in new window (Port 8000)
- ✅ Starts frontend in current window (Port 5173)
- ✅ Everything runs together!

**Then open browser:** http://localhost:5173

---

## 🎯 **ALTERNATIVE - Manual Start (2 Terminals)**

### **Terminal 1: Backend**

```powershell
# Run existing script:
.\start-backend.ps1

# Or manually:
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Keep this terminal running!** ✅

---

### **Terminal 2: Frontend**

**Open new terminal:** (Click + in VS Code terminal)

```powershell
# Make sure you're in project root:
# c:\saisoft\xagent\xagent

# Start frontend:
npm run dev
```

**Keep this terminal running too!** ✅

---

## ✅ **VERIFICATION**

### **Check Backend:**
Open: http://localhost:8000/health

**Should show:**
```json
{"status": "healthy"}
```

### **Check Frontend:**
Open: http://localhost:5173

**Should show:** Your xAgent application interface

### **Check Console:**

**Backend console:**
```
✅ OpenAI API key loaded
✅ Database initialized successfully
INFO: Uvicorn running on http://0.0.0.0:8000
```

**Frontend console (Browser DevTools F12):**
```
🧠 Collective Learning System initialized
🤖 Autonomous Scheduler initialized
📡 Agent Event Bus initialized
```

---

## 🎊 **YOU'RE LIVE!**

**Both running:**
- ✅ Backend: http://localhost:8000
- ✅ Frontend: http://localhost:5173
- ✅ All agents with autonomous operation!
- ✅ Collective learning active!
- ✅ Universal capabilities enabled!

**Chat with any agent and see the magic!** ✨


