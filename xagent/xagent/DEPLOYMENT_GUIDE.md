# 🚀 Multi-AI-Agent Platform Deployment Guide

## **Enhanced with Fully Functional Agentic AI Capabilities**

### **Prerequisites on Ubuntu Server:**

1. **Docker & Docker Compose** (if not already installed):
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login again to apply docker group changes
```

2. **System Requirements:**
   - **RAM**: 8GB+ recommended (4GB minimum)
   - **Storage**: 20GB+ free space
   - **CPU**: 2+ cores recommended
   - **GPU**: Optional (for Ollama acceleration)

---

## **🚀 Quick Deployment Steps:**

### **1. Navigate to Project Directory:**
```bash
cd /path/to/your/xagent/project
```

### **2. Make Deployment Script Executable:**
```bash
chmod +x deploy-agentic-platform.sh
```

### **3. Run Deployment Script:**
```bash
./deploy-agentic-platform.sh
```

### **4. Configure Environment Variables:**
The script will create a `.env` file. Edit it with your API keys:
```bash
nano .env
```

**Required:**
- `OPENAI_API_KEY` - Your OpenAI API key
- `NEO4J_PASSWORD` - Choose a secure password

**Optional:**
- `PINECONE_API_KEY` - For vector search capabilities
- `PINECONE_ENVIRONMENT` - Your Pinecone environment
- `PINECONE_INDEX_NAME` - Your Pinecone index name

---

## **🌐 Access Your Platform:**

After successful deployment, access your services at:

- **Frontend Application**: http://your-server-ip:8086
- **Backend API**: http://your-server-ip:8002
- **Neo4j Browser**: http://your-server-ip:7475
- **Ollama API**: http://your-server-ip:11435

**Default Neo4j credentials**: `neo4j/yourpassword`

---

## **🤖 Test Agentic AI Capabilities:**

### **1. Basic Test:**
Open the frontend and try:
```
"Hello, can you help me automate a task?"
```

### **2. E-commerce Automation Test:**
```
"Buy Samsung mobile from Flipkart if less than 1000 AED"
```

### **3. Complex Multi-Step Test:**
```
"Research competitors for my business, create a report, and email it to me"
```

### **4. Voice Automation Test:**
Use the voice input feature to speak commands like:
```
"Navigate to Google and search for AI automation tools"
```

---

## **🔧 Management Commands:**

### **View Logs:**
```bash
# All services
docker-compose -f docker-compose-with-ollama.yml logs -f

# Specific service
docker-compose -f docker-compose-with-ollama.yml logs -f backend
```

### **Restart Services:**
```bash
# Restart all
docker-compose -f docker-compose-with-ollama.yml restart

# Restart specific service
docker-compose -f docker-compose-with-ollama.yml restart backend
```

### **Stop Services:**
```bash
docker-compose -f docker-compose-with-ollama.yml down
```

### **Update Services:**
```bash
docker-compose -f docker-compose-with-ollama.yml up --build -d
```

---

## **🎯 What to Expect:**

### **Agentic AI Features in Action:**

1. **Goal Analysis**: AI will analyze your request and understand your ultimate goal
2. **Autonomous Planning**: AI creates its own execution plan with obstacle consideration
3. **Adaptive Execution**: AI adapts strategy based on real-time conditions
4. **Error Recovery**: AI automatically recovers from failures with multiple strategies
5. **Self-Learning**: AI learns from each interaction to improve future performance
6. **Context Awareness**: AI considers your preferences and execution history

### **Example Flow:**
```
User: "Buy Samsung mobile from Flipkart if less than 1000 AED"

AI Analysis:
- Immediate task: Purchase mobile phone
- Ultimate goal: Acquire working smartphone within budget
- Complexity: Moderate (requires price checking, comparison, payment)

AI Plan:
1. Navigate to Flipkart with price comparison strategy
2. Search for Samsung phones with adaptive element selection
3. Check prices with conditional logic
4. Add to cart if price is acceptable
5. Request payment details from user (human-in-loop)

AI Execution:
- Applies wait-and-retry strategy if elements not found
- Uses alternative selectors if primary selectors fail
- Records all adaptations for future learning
- Learns from successful patterns for next time
```

---

## **🛠️ Troubleshooting:**

### **Port Conflicts:**
If you get port conflicts, edit `docker-compose-with-ollama.yml` and change the port mappings.

### **Memory Issues:**
If services fail to start due to memory, reduce Neo4j memory settings in the docker-compose file.

### **API Key Issues:**
Make sure your OpenAI API key is valid and has sufficient credits.

### **Ollama Model Issues:**
Manually pull models:
```bash
docker exec multi-agent-ollama ollama pull llama3.2:3b
```

---

## **📊 Monitoring:**

### **Check Service Health:**
```bash
# Service status
docker-compose -f docker-compose-with-ollama.yml ps

# Resource usage
docker stats --no-stream

# Health endpoints
curl http://localhost:8002/health
curl http://localhost:11435/api/tags
```

---

## **🎉 Success Indicators:**

You'll know the deployment is successful when:

✅ All services show "healthy" status  
✅ Frontend loads at http://your-server:8086  
✅ You can interact with the AI agents  
✅ Voice input works (if microphone available)  
✅ Browser automation responds to commands  
✅ AI shows autonomous planning and learning behavior  

---

## **🚀 Next Steps:**

1. **Test all agentic features** with various scenarios
2. **Configure your API keys** for full functionality
3. **Set up SSL/HTTPS** for production use
4. **Configure backup strategies** for your data
5. **Monitor performance** and optimize as needed

**Your Multi-AI-Agent Platform with agentic capabilities is now ready for enterprise use!** 🎯
