# 🎨 **ADVANCED AGENT BUILDER - COMPLETE GUIDE**

## 🎯 **WHY USE THE ADVANCED BUILDER:**

```
✅ Full personality control (4 traits with sliders)
✅ Granular skills selection (10+ skills)
✅ Workflow integration (link workflows to agents)
✅ Visual configuration (see everything at once)
✅ Professional-grade agents
✅ RAG-ready agents
✅ Multi-LLM support
```

**This is the BEST way to create powerful agents!** 🚀

---

## 📍 **LOCATION:**

```
http://localhost:5174/agent-builder
```

---

## 🖼️ **VISUAL LAYOUT:**

```
┌──────────────────────────────────────────────────────────────────────┐
│  🤖 Agent Builder                              [💾 Save Agent]      │  ← Button here!
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  LEFT SIDE (Configuration)          │  RIGHT SIDE (Workflows)       │
│  ─────────────────────────          │  ───────────────────────      │
│                                     │                                │
│  ┌─────────────────────────┐       │  ┌──────────────────────┐    │
│  │ 📋 SELECT AGENT TYPE    │       │  │ 🔄 WORKFLOW DESIGNER │    │
│  ├─────────────────────────┤       │  ├──────────────────────┤    │
│  │ ┌───────┐  ┌───────┐   │       │  │                      │    │
│  │ │📧Email│  │📅Meet │   │       │  │ (Optional)           │    │
│  │ └───────┘  └───────┘   │       │  │                      │    │
│  │ ┌───────┐  ┌───────┐   │       │  │ Select workflows     │    │
│  │ │📄Doc  │  │🧠Know │   │       │  │ to link to agent     │    │
│  │ └───────┘  └───────┘   │       │  │                      │    │
│  └─────────────────────────┘       │  └──────────────────────┘    │
│                                     │                                │
│  ┌─────────────────────────┐       │                                │
│  │ 🎭 PERSONALITY          │       │                                │
│  ├─────────────────────────┤       │                                │
│  │ Friendliness:           │       │                                │
│  │ [=======●====] 70%      │       │                                │
│  │                         │       │                                │
│  │ Formality:              │       │                                │
│  │ [=====●======] 50%      │       │                                │
│  │                         │       │                                │
│  │ Proactiveness:          │       │                                │
│  │ [======●=====] 60%      │       │                                │
│  │                         │       │                                │
│  │ Detail Orientation:     │       │                                │
│  │ [=======●====] 70%      │       │                                │
│  └─────────────────────────┘       │                                │
│                                     │                                │
│  ┌─────────────────────────┐       │                                │
│  │ 🎯 SKILLS SELECTOR      │       │                                │
│  ├─────────────────────────┤       │                                │
│  │ ☑ Natural Language      │       │                                │
│  │ ☑ Task Comprehension    │       │                                │
│  │ ☐ Data Analysis         │       │                                │
│  │ ☐ Email Processing      │       │                                │
│  │ ☐ Document Analysis     │       │                                │
│  │ ☐ Meeting Scheduling    │       │                                │
│  │ ☐ Knowledge Management  │       │                                │
│  └─────────────────────────┘       │                                │
│                                     │                                │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 📝 **STEP-BY-STEP INSTRUCTIONS:**

### **Step 1: Open Agent Builder**
```
Go to: http://localhost:5174/agent-builder
```

### **Step 2: Select Agent Type**

**Click on one of the 4 cards:**
- 📧 **Email Agent** - For email management
- 📅 **Meeting Agent** - For scheduling
- 📄 **Document Agent** - For document processing
- 🧠 **Knowledge Agent** - For Q&A and knowledge ← **Recommended for testing!**

**The card will highlight when selected.**

### **Step 3: Configure Personality (Optional)**

**Adjust the sliders if you want:**
- **Friendliness:** How warm/friendly the agent is (70-80% recommended)
- **Formality:** How formal/casual (50-60% for balanced)
- **Proactiveness:** How proactive/reactive (60-70% for helpful)
- **Detail Orientation:** How detailed responses are (70-80% for thorough)

**Or just leave defaults!**

### **Step 4: Select Skills**

**Check at least 2-3 skills:**
- ✅ Natural Language Understanding (always check this!)
- ✅ Task Comprehension (always check this!)
- ✅ Reasoning (recommended)
- ✅ Context Retention (recommended)
- ✅ Any domain-specific skills you want

**The form requires at least 1 skill to be valid.**

### **Step 5: (Optional) Link Workflows**

**Skip this for now** - you can add workflows later.

### **Step 6: Click "Save Agent"**

**Look at the TOP RIGHT of the page** - you'll see a button:
```
[💾 Save Agent]
```

**Click it!**

### **Step 7: Success!**

You'll see:
```
✅ Agent created successfully!
```

And in console:
```
✅ Agent created successfully: { id: "abc-123-def", name: "...", ... }
```

**Note the agent ID!**

---

## 🎯 **AFTER CREATING THE AGENT:**

### **Step 8: Go to Chat**
```
http://localhost:5174/chat
```

### **Step 9: Select Your Agent**

- Click the agent dropdown (top of chat)
- Find your newly created agent
- Select it

### **Step 10: Test RAG!**

Ask: `"Hello, what can you do?"`

**Check Console (F12):**
```
Expected:
✅ 🧠 Using RAG-powered response for agent: abc-123-def
✅ 🔍 Loading agent instance: abc-123-def
✅ ✅ Agent instance created and cached: abc-123-def (knowledge)
✅ 🧠 Building RAG context for: "Hello, what can you do?"
✅ ✅ RAG Context built: { vectorResults: 0, memories: 0, tokenSavings: 0 }
✅ 💬 Generating RAG-powered response...
✅ ✅ RAG-powered response generated (0 tokens saved)
✅ 💾 Interaction stored for future RAG retrieval
```

**🎉 RAG IS WORKING!**

---

## 🔍 **IF YOU DON'T SEE THE "SAVE AGENT" BUTTON:**

### **Possible Issues:**

1. **Button is disabled** (form not valid)
   - Check if you selected an agent type
   - Check if you selected at least 1 skill
   - Look for red error messages

2. **Button is off-screen** (responsive issue)
   - Try scrolling to the top
   - Try zooming out (Ctrl + Mouse wheel)
   - Try making browser window wider

3. **Button styling issue**
   - Look for any button in the top right area
   - It might be there but styled differently

---

## 🎨 **THE ADVANCED BUILDER HAS:**

```
✅ Agent Type Selection (4 types)
✅ Personality Sliders (4 traits)
✅ Skills Checkboxes (10+ skills)
✅ Workflow Integration
✅ Visual Feedback
✅ Validation Errors
✅ Save Button (top right)
```

**It's a complete, professional agent creation interface!** 🚀

---

## 💡 **ALTERNATIVE IF BUTTON IS HIDDEN:**

### **Use Browser Console to Create Agent:**

Press **F12** → **Console** tab → Paste:

```javascript
// Create agent via console
const factory = await import('./services/agent/AgentFactory.js');
const agentFactory = factory.AgentFactory.getInstance();

const config = {
  name: 'RAG Test Agent',
  type: 'knowledge',
  description: 'Testing RAG functionality',
  personality: {
    friendliness: 0.8,
    formality: 0.5,
    proactiveness: 0.7,
    detail_orientation: 0.8
  },
  skills: [
    { name: 'natural_language_understanding', level: 5 },
    { name: 'task_comprehension', level: 5 }
  ],
  knowledgeBase: { sources: [], updateFrequency: 'on_demand' },
  llm_config: { provider: 'openai', model: 'gpt-4-turbo-preview', temperature: 0.7 }
};

const agent = await agentFactory.createToolEnabledAgent(config, []);
console.log('✅ Agent created:', agent.id);
```

**This will create an agent and show you the ID!**

---

## 🚀 **RECOMMENDED APPROACH:**

1. **Try the Advanced Builder first** (it's there, just look for "Save Agent" button top right)
2. **If button is hidden**, try the Simple Builder: `http://localhost:5174/agent-builder/simple`
3. **If both fail**, use the console method above
4. **Or run SQL** in Supabase to create agent directly

---

**The Advanced Builder IS the best option - it's powerful and flexible!** 💪

**Can you see the "Save Agent" button in the top right when you go to `/agent-builder`?** 🔍
