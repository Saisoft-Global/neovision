# 🐳 NEO4J WITH DOCKER COMPOSE ON UBUNTU - COMPLETE GUIDE

## ✅ **PERFECT SETUP!**

Using Docker Compose on your Ubuntu server is the **BEST option**:
- ✅ **Easiest** - One command
- ✅ **Clean** - Isolated container
- ✅ **Production-ready** - Same as deployment
- ✅ **Easy to manage** - Start/stop/remove easily

---

## 🚀 **QUICK SETUP (3 MINUTES)**

### **Step 1: Copy Docker Compose File to Ubuntu Server**

I already created `docker-compose-neo4j.yml` for you!

**Transfer it to your Ubuntu server:**

**Option A: Using SCP (from your PC):**
```bash
scp docker-compose-neo4j.yml user@YOUR_SERVER_IP:/home/user/
```

**Option B: Create directly on Ubuntu:**
```bash
# SSH into Ubuntu server
ssh user@YOUR_SERVER_IP

# Create the file
nano docker-compose-neo4j.yml
```

Then paste this content:

```yaml
version: '3.8'

services:
  neo4j:
    image: neo4j:5.15.0
    container_name: xagent-neo4j
    ports:
      - "7474:7474"  # HTTP
      - "7687:7687"  # Bolt
    environment:
      - NEO4J_AUTH=neo4j/xagent123
      - NEO4J_PLUGINS=["apoc"]
      - NEO4J_dbms_memory_heap_max__size=2G
      - NEO4J_dbms_memory_pagecache_size=1G
    volumes:
      - neo4j_data:/data
      - neo4j_logs:/logs
      - neo4j_import:/var/lib/neo4j/import
      - neo4j_plugins:/plugins
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "wget --no-verbose --tries=1 --spider localhost:7474 || exit 1"]
      interval: 10s
      timeout: 10s
      retries: 5

volumes:
  neo4j_data:
  neo4j_logs:
  neo4j_import:
  neo4j_plugins:
```

Save and exit: `Ctrl+X`, then `Y`, then `Enter`

---

### **Step 2: Start Neo4j on Ubuntu**

```bash
# Start Neo4j
docker-compose -f docker-compose-neo4j.yml up -d

# Check if running
docker ps | grep neo4j
```

**Expected output:**
```
xagent-neo4j   neo4j:5.15.0   Up 10 seconds   0.0.0.0:7474->7474/tcp, 0.0.0.0:7687->7687/tcp
```

✅ **Neo4j is now running!**

---

### **Step 3: Get Your Ubuntu Server IP**

```bash
hostname -I
```

**Example output:**
```
192.168.1.100
```

---

### **Step 4: Configure Your XAgent App (On Your PC)**

**Update `.env` file:**

```env
# Replace 192.168.1.100 with your actual Ubuntu server IP
VITE_NEO4J_URI=bolt://192.168.1.100:7687
VITE_NEO4J_USERNAME=neo4j
VITE_NEO4J_PASSWORD=xagent123
```

---

### **Step 5: Install Driver & Restart (On Your PC)**

```bash
# Install Neo4j driver
npm install neo4j-driver

# Restart app
npm run dev
```

---

## ✅ **VERIFY IT'S WORKING**

### **Test 1: Access Neo4j Browser**

From your PC, open browser:
```
http://YOUR_SERVER_IP:7474
```

**Example:**
```
http://192.168.1.100:7474
```

**Login:**
- Username: `neo4j`
- Password: `xagent123`

✅ **If you see Neo4j dashboard, it's working!**

---

### **Test 2: Check XAgent Console**

In your XAgent app console (browser DevTools):

**Before:**
```
Neo4j driver not available, using mock client
```

**After:**
```
✅ Neo4j connected successfully
✅ Knowledge Graph initialized
```

✅ **Perfect! Knowledge Graph is active!**

---

## 🛠️ **MANAGING NEO4J (DOCKER ON UBUNTU)**

### **On Ubuntu Server:**

```bash
# Start Neo4j
docker-compose -f docker-compose-neo4j.yml up -d

# Stop Neo4j
docker-compose -f docker-compose-neo4j.yml down

# Restart Neo4j
docker-compose -f docker-compose-neo4j.yml restart

# View logs
docker-compose -f docker-compose-neo4j.yml logs -f neo4j

# Check status
docker ps | grep neo4j

# Stop and remove (keeps data)
docker-compose -f docker-compose-neo4j.yml down

# Stop and remove ALL data
docker-compose -f docker-compose-neo4j.yml down -v
```

---

## 🔒 **FIREWALL CONFIGURATION**

### **If Ubuntu has firewall enabled:**

```bash
# Check firewall status
sudo ufw status

# Open Neo4j ports
sudo ufw allow 7687/tcp comment 'Neo4j Bolt'
sudo ufw allow 7474/tcp comment 'Neo4j HTTP'

# Verify
sudo ufw status
```

**Expected:**
```
7687/tcp      ALLOW       Anywhere       # Neo4j Bolt
7474/tcp      ALLOW       Anywhere       # Neo4j HTTP
```

---

## 📊 **ARCHITECTURE**

```
┌─────────────────────┐                    ┌─────────────────────┐
│   YOUR PC           │                    │   UBUNTU SERVER     │
│   Windows 10        │    Network         │   192.168.1.100     │
├─────────────────────┤    (LAN/VPN)       ├─────────────────────┤
│                     │                    │                     │
│  🌐 Browser         │◄──── :7474 ───────►│  Docker Container   │
│  XAgent UI          │      HTTP          │  ┌─────────────┐   │
│                     │                    │  │   Neo4j     │   │
│  💻 XAgent App      │◄──── :7687 ───────►│  │  (Graph DB) │   │
│  React/Vite         │      Bolt          │  └─────────────┘   │
│                     │                    │                     │
└─────────────────────┘                    └─────────────────────┘
```

---

## 🔐 **PASSWORD IN DOCKER COMPOSE**

Looking at the `docker-compose-neo4j.yml`:

```yaml
environment:
  - NEO4J_AUTH=neo4j/xagent123
    #            ↑      ↑
    #         username  password
```

**Default password in the file:** `xagent123`

---

## 🔧 **CHANGE PASSWORD (OPTIONAL)**

### **Option 1: Edit Docker Compose File**

```bash
# On Ubuntu server
nano docker-compose-neo4j.yml
```

**Change this line:**
```yaml
# OLD:
- NEO4J_AUTH=neo4j/xagent123

# NEW (your custom password):
- NEO4J_AUTH=neo4j/YourCustomPassword123
```

**Restart:**
```bash
docker-compose -f docker-compose-neo4j.yml down
docker-compose -f docker-compose-neo4j.yml up -d
```

---

### **Option 2: Keep Default**

Just use the password already in the file:
```
Username: neo4j
Password: xagent123
```

**Update your `.env`:**
```env
VITE_NEO4J_PASSWORD=xagent123
```

---

## 📋 **COMPLETE CONFIGURATION**

### **If Using Default Password (`xagent123`):**

**Your `.env` file:**
```env
# Replace 192.168.1.100 with your actual server IP
VITE_NEO4J_URI=bolt://192.168.1.100:7687
VITE_NEO4J_USERNAME=neo4j
VITE_NEO4J_PASSWORD=xagent123
```

### **If You Changed Password:**

**Your `.env` file:**
```env
VITE_NEO4J_URI=bolt://YOUR_SERVER_IP:7687
VITE_NEO4J_USERNAME=neo4j
VITE_NEO4J_PASSWORD=YourCustomPassword123
```

---

## 🧪 **VERIFY CONNECTION**

### **Test 1: Access Browser**

```
http://YOUR_SERVER_IP:7474
```

**Login:**
- Username: `neo4j`
- Password: `xagent123` (or your custom password)

### **Test 2: From Your PC (Quick Test)**

```bash
# On your PC
npm install neo4j-driver

# Test connection
node -e "const neo4j = require('neo4j-driver'); const driver = neo4j.driver('bolt://YOUR_SERVER_IP:7687', neo4j.auth.basic('neo4j', 'xagent123')); driver.verifyConnectivity().then(() => console.log('✅ Connected!')).catch(err => console.error('❌ Error:', err)).finally(() => driver.close());"
```

**Expected:** `✅ Connected!`

---

## 🎯 **SUMMARY**

**Your Question:** "What is the password for Neo4j?"

**Answer:**

### **If Using Docker Compose (The File I Created):**
```
Username: neo4j
Password: xagent123  ← DEFAULT IN THE FILE
```

### **To Change It:**
```bash
# Edit docker-compose-neo4j.yml
# Change: NEO4J_AUTH=neo4j/YOUR_NEW_PASSWORD
# Restart: docker-compose down && docker-compose up -d
```

### **In Your `.env`:**
```env
VITE_NEO4J_URI=bolt://YOUR_SERVER_IP:7687
VITE_NEO4J_USERNAME=neo4j
VITE_NEO4J_PASSWORD=xagent123
```

**Replace `YOUR_SERVER_IP` with your Ubuntu server's IP address!**

---

## 🎊 **READY TO GO!**

**Your setup:**
1. ✅ Upload `docker-compose-neo4j.yml` to Ubuntu
2. ✅ Run: `docker-compose -f docker-compose-neo4j.yml up -d`
3. ✅ Password is: `xagent123` (or change in the file)
4. ✅ Update `.env` with server IP and password
5. ✅ Run: `npm install neo4j-driver`
6. ✅ Restart: `npm run dev`

**Your Knowledge Graph will be fully functional!** 🧠✨

