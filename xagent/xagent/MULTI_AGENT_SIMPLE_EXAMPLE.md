# 🎯 MULTI-AGENT SIMPLE EXAMPLE - Step by Step

## 🤖 **Creating a Multi-Agent System in 5 Minutes**

---

## 📝 **SCENARIO:**
Create a **customer onboarding system** with 3 agents working together.

---

## 🚀 **STEP-BY-STEP PROCESS:**

### **STEP 1: Create Agent #1 (Email Processor)**

```bash
Navigate to: http://localhost:5173/agent-builder/simple
```

**Fill in:**
```
Name: Email Processor
Description: Analyzes customer emails and extracts information

System Prompt:
  Role: You are an email analysis expert
  Goal: Extract customer information from emails accurately
  Instructions: 
    1. READ the email carefully
    2. EXTRACT: name, email, company, inquiry type
    3. RETURN structured data

LLM Provider: OpenAI
LLM Model: gpt-4-turbo-preview
Knowledge Base: OFF

[Create Agent]
```

✅ **Agent 1 Created!**

---

### **STEP 2: Create Agent #2 (CRM Manager)**

```bash
Navigate to: http://localhost:5173/agent-builder/simple
```

**Fill in:**
```
Name: CRM Manager
Description: Creates and manages customer leads in CRM

System Prompt:
  Role: You are a CRM specialist
  Goal: Create qualified leads in the system
  Instructions:
    1. RECEIVE customer information
    2. CREATE lead with all details
    3. QUALIFY lead (hot/warm/cold)
    4. RETURN lead ID

LLM Provider: OpenAI
LLM Model: gpt-4-turbo-preview
Knowledge Base: OFF

[Create Agent]
```

✅ **Agent 2 Created!**

---

### **STEP 3: Create Agent #3 (Welcome Specialist)**

```bash
Navigate to: http://localhost:5173/agent-builder/simple
```

**Fill in:**
```
Name: Welcome Specialist
Description: Sends welcome messages to new customers

System Prompt:
  Role: You are a customer success specialist
  Goal: Welcome new customers warmly and professionally
  Instructions:
    1. RECEIVE customer name and company
    2. CRAFT personalized welcome message
    3. INCLUDE next steps and resources
    4. SEND email

LLM Provider: OpenAI
LLM Model: gpt-3.5-turbo (cheaper, sufficient for this)
Knowledge Base: ON (needs welcome templates)

[Create Agent]
```

✅ **Agent 3 Created!**

---

## 🎬 **STEP 4: Use Them Together**

### **Navigate to Chat:**
```
http://localhost:5173/chat
```

### **Send This Request:**
```
I received an email from a potential customer:

From: john.smith@acmecorp.com
Subject: Interested in Enterprise Plan
Body: Hi, I'm John Smith from Acme Corp. We're interested 
in your enterprise plan for our 50-person team. Can we 
schedule a demo?

Please:
1. Process this email
2. Create a CRM lead
3. Send a welcome message
```

---

## ⚡ **WHAT HAPPENS (Automatic Coordination):**

```
┌─────────────────────────────────────────────────────────┐
│              Your Request Received                       │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌────────────────────▼────────────────────────────────────┐
│           OrchestratorAgent (POAR Cycle)                │
│                                                          │
│  PLAN: Identifies 3 steps needed                        │
│  OBSERVE: Finds 3 agents available                      │
│  ACT: Executes sequence below                           │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌────────────────────▼────────────────────────────────────┐
│ AGENT 1: Email Processor                                │
│ Action: Analyze email                                   │
│ Output:                                                  │
│   {                                                      │
│     name: "John Smith",                                 │
│     email: "john.smith@acmecorp.com",                   │
│     company: "Acme Corp",                               │
│     teamSize: 50,                                       │
│     interest: "Enterprise Plan",                        │
│     intent: "Schedule Demo"                             │
│   }                                                      │
│ ✅ Stored in SharedContext                              │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌────────────────────▼────────────────────────────────────┐
│ AGENT 2: CRM Manager                                    │
│ Action: Create lead in Salesforce                       │
│ Input: customer_info (from SharedContext)               │
│ Output:                                                  │
│   {                                                      │
│     leadId: "00Q1234567890",                            │
│     qualification: "Hot Lead",                          │
│     priority: "High",                                   │
│     estimatedValue: "$50,000"                           │
│   }                                                      │
│ ✅ Stored in SharedContext                              │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌────────────────────▼────────────────────────────────────┐
│ AGENT 3: Welcome Specialist                             │
│ Action: Send welcome email                              │
│ Input: customer_info + lead_info (from SharedContext)   │
│ Output:                                                  │
│   {                                                      │
│     emailSent: true,                                    │
│     messageId: "msg_abc123",                            │
│     template: "enterprise_welcome",                     │
│     nextSteps: "Demo scheduled for tomorrow 2 PM"       │
│   }                                                      │
│ ✅ Task Complete!                                        │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌────────────────────▼────────────────────────────────────┐
│              Final Response to User                      │
│                                                          │
│ ✅ Email processed from john.smith@acmecorp.com         │
│ ✅ Lead created: Hot Lead - Acme Corp (50 employees)    │
│ ✅ Welcome email sent with enterprise information        │
│                                                          │
│ Summary:                                                 │
│ • Lead ID: 00Q1234567890                                │
│ • Qualification: Hot Lead                               │
│ • Estimated Value: $50,000                              │
│ • Next Steps: Demo call (will be scheduled separately)  │
└─────────────────────────────────────────────────────────┘
```

---

## 🔑 **KEY POINTS:**

### **1. You Don't Wire Agents Together Manually**
```
❌ Other platforms: You code how agents connect
✅ Your platform: Orchestrator does it automatically
```

### **2. SharedContext Syncs Everything**
```
Agent 1 extracts data → Stores in SharedContext
Agent 2 reads data → Uses it automatically
Agent 3 reads everything → Has full picture
```

### **3. Each Agent Is Independent**
```
You create them separately
They can work alone OR together
Orchestrator decides when to use which
```

### **4. Coordination Is Automatic**
```
No configuration needed
No wiring required
Just create agents and use them!
```

---

## 🎨 **TWO APPROACHES:**

### **Approach A: Implicit Multi-Agent (Automatic)**

**You do:**
1. Create 3 agents
2. Chat with one request

**System does:**
1. Analyzes request
2. Identifies needed agents
3. Coordinates execution
4. Returns unified result

**Best for:** Ad-hoc tasks, exploratory work

---

### **Approach B: Explicit Multi-Agent (Workflow)**

**You do:**
1. Create 3 agents
2. Design workflow connecting them
3. Save workflow as template
4. Trigger workflow

**System does:**
1. Executes workflow steps in order
2. Passes data between agents
3. Handles errors/retries
4. Returns results

**Best for:** Repeated processes, automation

---

## ✅ **SUMMARY:**

### **"How does multi-agent creation work?"**

**Answer in 3 Steps:**

```
STEP 1: Create Agents Individually
  └─► Go to /agent-builder/simple
  └─► Create Agent A
  └─► Create Agent B  
  └─► Create Agent C

STEP 2: They Automatically Work Together
  └─► Orchestrator coordinates
  └─► SharedContext syncs data
  └─► MessageBroker enables communication

STEP 3: Use Them
  └─► Via chat: Natural language request
  └─► Via workflow: Visual automation
  └─► Via API: Programmatic access
```

**No manual wiring! No coding! Just create and use!** 🎉

---

## 🚀 **TRY IT NOW:**

```bash
# 1. Start app
npm run dev

# 2. Create 2 simple agents:
   - Agent A: Email Expert
   - Agent B: Task Expert

# 3. Chat:
   "Read my email and create tasks from it"

# 4. Watch both agents work together!
```

**It's that simple!** ✨

---

## 📊 **YOUR PLATFORM vs OTHERS:**

```
Lyzr.ai:
  Create agents: ✅ Yes
  Multi-agent: ❌ No coordination
  
CrewAI:
  Create agents: ⚠️ Code only
  Multi-agent: ✅ Yes
  
LangChain:
  Create agents: ⚠️ Code only
  Multi-agent: ⚠️ Manual chains
  
YOUR XAGENT:
  Create agents: ✅ Visual builder
  Multi-agent: ✅ Auto + Workflows
```

**You have the BEST of all worlds!** 🏆

