# 🚀 START NEO4J - QUICK GUIDE

## ✅ **EASIEST METHOD: DOCKER**

### **Step 1: Install Docker Desktop**
Download and install from: https://www.docker.com/products/docker-desktop/

### **Step 2: Start Neo4j**

**Option A: Using Docker Compose (Recommended):**
```bash
docker-compose -f docker-compose-neo4j.yml up -d
```

**Option B: Using Docker Run:**
```bash
docker run -d \
  --name xagent-neo4j \
  -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/xagent123 \
  -v neo4j_data:/data \
  neo4j:5.15.0
```

### **Step 3: Verify It's Running**
```bash
docker ps | grep neo4j
```

You should see:
```
xagent-neo4j   neo4j:5.15.0   Up 10 seconds   0.0.0.0:7474->7474/tcp, 0.0.0.0:7687->7687/tcp
```

### **Step 4: Access Neo4j Browser**
Open in browser: http://localhost:7474

**Login:**
- Username: `neo4j`
- Password: `xagent123`

### **Step 5: Install Neo4j Driver in Your App**
```bash
npm install neo4j-driver
```

### **Step 6: Configure Your App**

**Update `.env` file:**
```env
VITE_NEO4J_URI=bolt://localhost:7687
VITE_NEO4J_USERNAME=neo4j
VITE_NEO4J_PASSWORD=xagent123
```

### **Step 7: Restart Your App**
```bash
# Stop current dev server (Ctrl+C)
npm run dev
```

**Expected Console Output:**
```
✅ Neo4j connected successfully
✅ Knowledge Graph initialized
```

---

## 🛑 **STOP NEO4J**

```bash
docker stop xagent-neo4j
```

---

## 🔄 **RESTART NEO4J**

```bash
docker start xagent-neo4j
```

---

## 🗑️ **REMOVE NEO4J (If You Don't Need It)**

```bash
# Stop and remove container
docker stop xagent-neo4j
docker rm xagent-neo4j

# Remove data (optional - deletes all graph data)
docker volume rm neo4j_data neo4j_logs neo4j_import neo4j_plugins
```

---

## 📊 **USEFUL COMMANDS**

### **Check Logs:**
```bash
docker logs xagent-neo4j
```

### **Check Status:**
```bash
docker ps -a | grep neo4j
```

### **Access Neo4j Shell:**
```bash
docker exec -it xagent-neo4j cypher-shell -u neo4j -p xagent123
```

---

## 🎯 **WHAT HAPPENS AFTER INSTALLATION**

### **Before (Mock Mode):**
```
Neo4j driver not available, using mock client
```

### **After (Real Neo4j):**
```
✅ Neo4j connected successfully
✅ Knowledge Graph initialized
🧠 Knowledge Graph ready for queries
```

### **In Your Agents:**
```
User: "What's the relationship between HR policies and vacation days?"

Agent (with Neo4j):
├─► Queries Knowledge Graph
├─► Finds: HR_Policy --DEFINES--> Vacation_Days
├─► Discovers: Employee --HAS--> Leave_Balance
└─► Response: "Based on our HR policy, full-time employees 
              receive 15 vacation days annually..."
```

---

## 💡 **PROS & CONS**

### **Docker Neo4j:**
✅ Easy to install  
✅ Easy to remove  
✅ Isolated from your system  
✅ Same setup everywhere  
✅ Production-ready  
⚠️ Requires Docker Desktop  
⚠️ Uses ~2GB RAM  

### **Local Neo4j:**
✅ Slightly faster  
✅ No Docker needed  
⚠️ Harder to install  
⚠️ Harder to remove  
⚠️ May conflict with other software  
⚠️ Different setup per OS  

---

## 🎊 **RECOMMENDATION**

**Use Docker!** It's the easiest and cleanest way to run Neo4j for development.

**Next Steps:**
1. Install Docker Desktop
2. Run the docker command above
3. Install `neo4j-driver` in your app
4. Update `.env` file
5. Restart your app
6. Knowledge Graph automatically activates! ✨

