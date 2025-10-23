# 🚀 START COMPLETE SYSTEM - Simple Guide

## ⚡ **Two Ways to Start Frontend + Backend**

---

## 🎯 **METHOD 1: Use PowerShell Script (EASIEST)** ⭐

**One command starts everything:**

```powershell
.\START_COMPLETE_SYSTEM.ps1
```

**What it does:**
- ✅ Checks Python and Node are installed
- ✅ Starts backend in new window (Port 8000)
- ✅ Starts frontend in current window (Port 5173)
- ✅ Opens both automatically

**Access:**
- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/api/docs

---

## 🎯 **METHOD 2: Manual (Two Terminals)**

### **Terminal 1: Start Backend**

```powershell
# Navigate to backend
cd backend

# Install dependencies (first time only)
pip install -r requirements.txt

# Start backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Should see:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
✅ OpenAI API key loaded: sk-...
✅ Database initialized successfully
```

**Leave this terminal running!**

---

### **Terminal 2: Start Frontend**

**Open new terminal in VS Code:**
- Click "+" button in terminal panel
- Or press: Ctrl+Shift+`

```powershell
# Make sure you're in project root
# (Should show: c:\saisoft\xagent\xagent)

# Install dependencies (first time only)
npm install

# Start frontend
npm run dev
```

**Should see:**
```
VITE v4.5.14  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h to show help
```

**Leave this terminal running!**

---

## ✅ **VERIFICATION**

### **Backend Check:**

**Open browser:** http://localhost:8000/health

**Expected:**
```json
{
  "status": "healthy"
}
```

**Or:** http://localhost:8000/api/docs

**Expected:** Swagger API documentation page

---

### **Frontend Check:**

**Open browser:** http://localhost:5173

**Expected:** 
- xAgent application loads
- Login page or dashboard appears
- No console errors

---

### **Console Check:**

**Backend console should show:**
```
🔍 Checking environment variables...
✅ OpenAI API key loaded: sk-...
✅ Database initialized successfully
INFO:     Application startup complete
```

**Frontend console (in browser DevTools) should show:**
```
🧠 Collective Learning System initialized
🤖 Autonomous Scheduler initialized
📡 Agent Event Bus initialized
🎯 Goal Manager initialized
```

---

## 🆘 **TROUBLESHOOTING**

### **Backend Issues:**

**Error: "No module named uvicorn"**
```powershell
pip install -r backend/requirements.txt
```

**Error: "No module named fastapi"**
```powershell
cd backend
pip install fastapi uvicorn
```

**Error: "Port 8000 already in use"**
```powershell
# Change port in command:
python -m uvicorn main:app --reload --port 8001
```

---

### **Frontend Issues:**

**Error: "Cannot find module"**
```powershell
npm install
```

**Error: "Port 5173 already in use"**
```powershell
# Kill the process or Vite will auto-use next port (5174)
```

**Blank page / Not loading:**
- Check browser console for errors
- Check backend is running on port 8000
- Check .env file has correct VITE_API_URL

---

## 🎯 **RECOMMENDED: Use the Script**

**Easiest way:**

```powershell
.\START_COMPLETE_SYSTEM.ps1
```

**This:**
- ✅ Checks everything automatically
- ✅ Starts backend in separate window
- ✅ Starts frontend in current window
- ✅ Shows clear status messages
- ✅ One command does it all!

---

## 📊 **AFTER STARTING**

### **You should have:**

**3 things running:**
1. ✅ Backend window (PowerShell) - Port 8000
2. ✅ Frontend terminal (VS Code) - Port 5173
3. ✅ Browser - http://localhost:5173

**Ports in use:**
- `8000` - Backend API
- `5173` - Frontend dev server

**To stop:**
- Backend: Close its PowerShell window
- Frontend: Press Ctrl+C in terminal

---

## 🎉 **QUICK START NOW**

```powershell
# Just run this:
.\START_COMPLETE_SYSTEM.ps1
```

**Your complete agentic AI system will start!** 🚀

- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/api/docs

**All agents with autonomous operation, collective learning, and universal capabilities!** ✨


