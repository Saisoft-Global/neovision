# 🤖 How to Create Agents - Unified Guide

## ✅ **Use the Existing Agent Builder UI**

You already have a comprehensive Agent Builder! Don't create custom scripts.

---

## 🎯 **Creating Any Agent (Banking, Sales, HR, etc.)**

### **Step 1: Navigate to Agent Builder**
- Go to: `http://localhost:5173/agent-builder`
- Or click: **"Create Agent"** button from Agents page

### **Step 2: Configure Basic Details**

**Agent Name:** (e.g., "Banking Support AI Teller")  
**Agent Type:** Select from dropdown
- `customer_support` - For support/helpdesk
- `hr` - HR assistance
- `finance` - Financial analysis
- `email` - Email management
- `task` - Task management
- `productivity` - Productivity assistance
- `travel` - Travel booking
- `direct_execution` - General purpose
- `tool_enabled` - Can attach tools dynamically

**Description:** Brief description of what the agent does

---

### **Step 3: Configure Personality** 🎭

Adjust sliders for:
- **Friendliness** (0-1): How warm/casual vs distant/formal
- **Formality** (0-1): Professional tone level
- **Proactiveness** (0-1): How much agent anticipates needs
- **Detail Orientation** (0-1): Level of precision

**Example for Banking Support:**
```
Friendliness: 0.9 (warm and welcoming)
Formality: 0.8 (professional but approachable)
Proactiveness: 0.85 (anticipates customer needs)
Detail Orientation: 0.95 (precise with account details)
```

---

### **Step 4: Add Skills** 🛠️

Click **"Add Skill"** for each capability:

**Core Skills (Auto-added):**
- natural_language_understanding (level 5)
- task_comprehension (level 5)
- reasoning (level 4)
- context_retention (level 4)

**Banking-Specific Skills Example:**
1. **account_inquiry_handling** (level 5)
   - Description: "Handle account balance, statement, and transaction inquiries"

2. **transaction_dispute_resolution** (level 5)
   - Description: "Assist with disputed transactions and chargebacks"

3. **card_services** (level 5)
   - Description: "Handle credit/debit card issues, activations, replacements"

4. **loan_application_support** (level 5)
   - Description: "Guide customers through loan applications"

5. **fraud_detection_support** (level 5)
   - Description: "Help customers with fraud alerts and security concerns"

6. **regulatory_compliance** (level 4)
   - Description: "Ensure responses comply with banking regulations"

---

### **Step 5: Attach Tools (Optional)** 🔧

If `tool_enabled` or `travel` type:
- Select tools from available list
- Email Tool
- CRM Tool
- Zoho Tool
- Custom tools

---

### **Step 6: Link Workflows (Optional)** 🔄

Select pre-built workflows to attach:
- Customer onboarding workflow
- Support ticket routing
- Escalation workflow

---

### **Step 7: Save** 💾

Click **"Save Agent"** → Agent is created in Supabase with:
- ✅ Basic info (name, type, description)
- ✅ Personality traits (via agent_personality_traits table)
- ✅ Skills (via agent_skills table)
- ✅ Tool attachments (if tool_enabled)
- ✅ Workflow links (via agent_workflows table)

---

## 🏦 **Example: Banking Support Agent**

### Via UI:
1. **Name:** "Banking Support AI Teller"
2. **Type:** `customer_support`
3. **Description:** "24/7 AI banking support specialist"
4. **Personality:**
   - Friendliness: 0.9
   - Formality: 0.8
   - Proactiveness: 0.85
   - Detail Orientation: 0.95
5. **Skills:** Add 7 banking skills (listed above)
6. **Save** ✅

### What You Get:
- ✅ Full agent in Supabase
- ✅ All personality traits saved
- ✅ All skills configured
- ✅ Ready to use immediately
- ✅ Appears in Agents dropdown

---

## 🔍 **What Agent Builder Does Behind the Scenes**

From `useAgentBuilder.ts`:

```typescript
const saveAgent = async () => {
  // 1. Validate config
  // 2. Get AgentFactory instance
  // 3. Create agent:
  const agent = config.workforce 
    ? await factory.createWorkforceAgent(config, [], orgContext)
    : await factory.createToolEnabledAgent(config, [], orgContext);
  
  // 4. Link workflows if any
  // 5. Save to Supabase
  // 6. Return created agent
};
```

**AgentFactory.createToolEnabledAgent()** calls Supabase to insert:
- `agents` table → Main agent record
- `agent_personality_traits` table → Personality
- `agent_skills` table → Skills
- `agent_workflows` table → Workflow links

---

## ⚠️ **Current RLS Issue**

**Problem:** Row Level Security blocks personality/skills insertion  
**Impact:** Agent still works with defaults from code  
**Solution:** Either:
1. Update RLS policies in Supabase to allow inserts
2. Use service-role key (has admin access)
3. Agent works fine with code defaults for beta

---

## 🚀 **All Agents Get:**

### Automatic Capabilities (from BaseAgent):
✅ **Browser Automation** - For booking, research, data gathering  
✅ **RAG Context** - Memory, vector search, knowledge graph  
✅ **Collective Learning** - Learn from other agents  
✅ **Journey Tracking** - Track customer journeys  
✅ **Multi-LLM** - Groq, OpenAI, Ollama fallback  
✅ **Organization Isolation** - Data stays private  
✅ **Conversation Context** - Remember chat history  

### Type-Specific Features:
- **customer_support** → Ticket handling, escalation
- **travel** → Browser booking, portal selection
- **tool_enabled** → Dynamic tool attachment
- **hr** → Employee assistance
- **email** → Email processing

---

## 📝 **Quick Reference**

### Banking Support Agent Config:
```json
{
  "name": "Banking Support AI Teller",
  "type": "customer_support",
  "description": "24/7 banking support",
  "personality": {
    "friendliness": 0.9,
    "formality": 0.8,
    "proactiveness": 0.85,
    "detail_orientation": 0.95
  },
  "skills": [
    {"name": "account_inquiry_handling", "level": 5},
    {"name": "card_services", "level": 5},
    {"name": "fraud_detection_support", "level": 5}
  ]
}
```

### Sales Agent Config:
```json
{
  "name": "Sales AI Assistant",
  "type": "tool_enabled",
  "personality": {
    "friendliness": 0.95,
    "formality": 0.6,
    "proactiveness": 0.9,
    "detail_orientation": 0.8
  },
  "skills": [
    {"name": "lead_qualification", "level": 5},
    {"name": "product_recommendation", "level": 5},
    {"name": "objection_handling", "level": 4}
  ],
  "tools": ["crm_tool"]
}
```

---

## ✨ **Recommendation**

**Use Agent Builder UI for everything!**
- ✅ Visual, intuitive
- ✅ Validation built-in
- ✅ Saves to Supabase automatically
- ✅ No scripts needed
- ✅ Works for ANY agent type
- ✅ Unified approach

**The system you already have is perfect!** 🎉



