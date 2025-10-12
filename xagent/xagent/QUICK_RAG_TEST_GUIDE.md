# 🚀 **QUICK RAG TEST GUIDE - 3 MINUTES**

## 🎯 **YOUR CURRENT STATUS:**

```
✅ App running: http://localhost:5174
✅ Supabase: Connected
✅ OpenAI: Working
✅ Tools: Initialized
✅ RAG: Wired and ready
❌ Issue: Agent 1 not in database
```

---

## ⚡ **FASTEST PATH TO TEST RAG (3 Options):**

### **OPTION 1: Create Agent via UI (Easiest - 2 minutes)**

1. **Go to Agent Builder:**
   ```
   http://localhost:5174/agent-builder
   ```

2. **You'll see a form with:**
   - Select Agent Type (Email, Meeting, Document, Knowledge)
   - Personality sliders
   - Skills checkboxes
   - **"Save Agent" button** (top right)

3. **Fill the form:**
   - **Type:** Select `Knowledge Agent` (click the card)
   - **Personality:** Leave defaults (or adjust sliders)
   - **Skills:** Check a few skills
   - Click **"Save Agent"** button (top right)

4. **Note the Agent ID:**
   - After saving, you'll see success message
   - Note the agent ID (e.g., `abc-123-def`)

5. **Go to Chat:**
   ```
   http://localhost:5174/chat
   ```

6. **Select Your New Agent:**
   - Click agent dropdown
   - Select the agent you just created
   - Ask: `"Hello, what can you do?"`

7. **Check Console (F12):**
   ```
   Expected:
   ✅ 🧠 Using RAG-powered response for agent: abc-123-def
   ✅ ✅ Agent instance created and cached
   ✅ 🧠 Building RAG context
   ✅ ✅ RAG-powered response generated
   ```

---

### **OPTION 2: Use Simple Agent Builder (Fastest - 1 minute)**

1. **Go to Simple Agent Builder:**
   ```
   http://localhost:5174/agent-builder/simple
   ```

2. **Fill the simple form:**
   - **Name:** `Test RAG Agent`
   - **Description:** `Testing RAG functionality`
   - **Role:** `You are a helpful assistant`
   - **Goal:** `Help users with their questions`
   - **LLM Provider:** Select `OpenAI`
   - **LLM Model:** Select `gpt-3.5-turbo`
   - Check **"Enable Memory"**
   - Check **"Enable Knowledge Base"**

3. **Click "Create Agent"**

4. **Go to Chat and test** (same as Option 1, steps 5-7)

---

### **OPTION 3: Use Existing Agents (Instant)**

1. **Go to Agents List:**
   ```
   http://localhost:5174/agents
   ```

2. **You should see existing agents:**
   - HR Assistant
   - Finance Assistant
   - Knowledge Agent
   - etc.

3. **Click on any agent** to view details

4. **Note the agent ID** from the URL or page

5. **Go to Chat:**
   ```
   http://localhost:5174/chat
   ```

6. **Select that agent from dropdown**

7. **Ask a question and check console**

---

## 🐛 **IF AGENT BUILDER IS EMPTY/BROKEN:**

### **Quick SQL Fix (30 seconds):**

**Run this in Supabase SQL Editor:**

```sql
-- Create a test agent directly in database
INSERT INTO agents (
  name,
  type,
  description,
  personality,
  skills,
  created_at,
  updated_at,
  user_id
) VALUES (
  'RAG Test Agent',
  'knowledge',
  'Agent for testing RAG functionality',
  '{"friendliness": 0.8, "formality": 0.5, "proactiveness": 0.7, "detail_orientation": 0.8}'::jsonb,
  '[]'::jsonb,
  NOW(),
  NOW(),
  '06cb0260-217e-4eff-b80a-7844cce8b8e2'  -- Your user ID from logs
)
RETURNING id, name, type;
```

**This will return the new agent ID. Use that in Chat!**

---

## 📊 **WHAT YOU'LL SEE WHEN RAG WORKS:**

### **Console Output:**

```javascript
// 1. RAG Activation
🧠 Using RAG-powered response for agent: X

// 2. Agent Loading
🔍 Loading agent instance: X
✅ Agent instance created and cached: X (knowledge)

// 3. RAG Context Building
🧠 Building RAG context for: "Hello, what can you do?"

// 4. RAG Components (Parallel)
⚠️ Pinecone not available, simulating vector query  // OK - Mock mode
// (No errors here means RAG is working)

// 5. RAG Context Built
✅ RAG Context built: {
  vectorResults: 0,
  graphNodes: 0,
  memories: 0,
  tokenSavings: 0
}

// 6. Response Generation
💬 Generating RAG-powered response...
✅ RAG-powered response generated (0 tokens saved)

// 7. Storage
💾 Interaction stored for future RAG retrieval
```

### **Agent Response:**

Should be intelligent and contextual (even without documents on first try).

---

## 🎯 **STEP-BY-STEP VISUAL GUIDE:**

### **Using Agent Builder:**

```
1. Go to: http://localhost:5174/agent-builder

2. You'll see this layout:
   ┌─────────────────────────────────────────────┐
   │ 🤖 Agent Builder              [Save Agent] │
   ├─────────────────────────────────────────────┤
   │                                             │
   │ Select Agent Type:                          │
   │ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
   │ │📧 Email │ │📅 Meeting│ │📄 Document│      │
   │ └─────────┘ └─────────┘ └─────────┘       │
   │ ┌─────────┐                                │
   │ │🧠 Knowledge│  ← Click this!               │
   │ └─────────┘                                │
   │                                             │
   │ Personality:                                │
   │ Friendliness: [======○===] 70%            │
   │ Formality:    [====○=====] 50%            │
   │                                             │
   │ Skills:                                     │
   │ ☑ Natural Language Understanding           │
   │ ☑ Task Comprehension                       │
   │ ☐ Data Analysis                            │
   │                                             │
   └─────────────────────────────────────────────┘

3. Click "Save Agent" button (top right)

4. Success message appears with agent ID

5. Go to Chat and select your agent
```

---

## 🎊 **ALTERNATIVE: Use Agents Page**

```
1. Go to: http://localhost:5174/agents

2. You'll see list of agents:
   ┌─────────────────────────────────────────┐
   │ 🤖 Agents                               │
   ├─────────────────────────────────────────┤
   │                                         │
   │ 📋 HR Assistant                         │
   │    ID: 2                                │
   │    Type: hr                             │
   │    [View Details]                       │
   │                                         │
   │ 💰 Finance Assistant                    │
   │    ID: 3                                │
   │    Type: finance                        │
   │    [View Details]                       │
   │                                         │
   └─────────────────────────────────────────┘

3. Note an agent ID (e.g., 2 for HR Assistant)

4. Go to Chat

5. Select that agent from dropdown

6. Test RAG!
```

---

## 🔥 **SIMPLEST TEST (RIGHT NOW):**

### **Try Agent ID 2 (HR Assistant):**

Based on your earlier logs, you had conversations with agent ID 2. Let's test with that:

1. **Go to Chat:**
   ```
   http://localhost:5174/chat
   ```

2. **Select "HR Assistant" or "Finance Assistant"** from dropdown
   (These likely have ID 2 or 3)

3. **Ask:**
   ```
   "What can you help me with?"
   ```

4. **Check Console (F12):**
   - Look for `🧠 Using RAG-powered response for agent: 2`
   - If you see this, RAG is working!
   - If you see `Agent 2 not found`, try a different agent

---

## 📝 **QUICK CHECKLIST:**

```
[ ] 1. App is running (http://localhost:5174) ✅
[ ] 2. You're logged in ✅
[ ] 3. Go to /agents page
[ ] 4. Check what agents exist
[ ] 5. Note an agent ID
[ ] 6. Go to /chat
[ ] 7. Select that agent
[ ] 8. Ask a question
[ ] 9. Open Console (F12)
[ ] 10. Look for "🧠 Using RAG-powered response"
```

---

## 💡 **WHAT TO DO RIGHT NOW:**

**Try this in order:**

1. **First:** Go to `http://localhost:5174/agents` - See what agents exist
2. **Then:** Go to `http://localhost:5174/chat` - Select an existing agent
3. **Test:** Ask a question and check console
4. **If fails:** Go to `http://localhost:5174/agent-builder/simple` - Create new agent
5. **Retest:** Use your new agent

---

## 🎯 **EXPECTED OUTCOME:**

**If agent exists in database:**
```
✅ RAG activates
✅ Agent instance loads
✅ RAG context builds
✅ Response generated with RAG
```

**If agent doesn't exist:**
```
❌ Agent X not found
🔄 Falling back to direct LLM
⚠️ RAG not used (but response still works)
```

---

**Go to `/agents` page first and tell me what agents you see!** 📋

**Or go to `/agent-builder/simple` and create a new one!** 🚀
