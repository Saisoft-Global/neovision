# 🔄 Multi-Agent Context Flow Architecture

## 📊 **COMPLETE CONTEXT FLOW:**

```
┌──────────────────────────────────────────────────────────────────────┐
│                           USER INTERACTION                            │
│  Uploads document, sends message, switches agents                    │
└──────────────────────────────┬───────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         ChatContainer (UI)                            │
│  • Handles user input                                                 │
│  • Manages file uploads                                               │
│  • Displays messages                                                  │
└──────────────────────────────┬───────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         ChatProcessor                                 │
│  Step 1: Receive message + agent + userId                            │
│  Step 2: Build unified context ──────────────────┐                   │
└──────────────────────────────┬───────────────────┼───────────────────┘
                                │                   │
                                ▼                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    UnifiedContextManager                              │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  BUILD UNIFIED CONTEXT (Single Source of Truth)                │  │
│  │                                                                 │  │
│  │  1. Conversation Context                                       │  │
│  │     ├─ ConversationContextManager                              │  │
│  │     │  ├─ Get conversation history                             │  │
│  │     │  ├─ Manage tokens                                        │  │
│  │     │  └─ Compress if needed                                   │  │
│  │     └─ MemoryService                                           │  │
│  │        ├─ Search relevant memories                             │  │
│  │        └─ Get user profile                                     │  │
│  │                                                                 │  │
│  │  2. Document Context                                           │  │
│  │     └─ DocumentContextManager                                  │  │
│  │        ├─ Get active document                                  │  │
│  │        ├─ Get all documents                                    │  │
│  │        └─ Build context string                                 │  │
│  │                                                                 │  │
│  │  3. Shared Context                                             │  │
│  │     └─ SharedContext                                           │  │
│  │        ├─ User preferences                                     │  │
│  │        ├─ Task state                                           │  │
│  │        └─ Workflow data                                        │  │
│  │                                                                 │  │
│  │  4. Agent Context                                              │  │
│  │     ├─ Agent expertise                                         │  │
│  │     ├─ Agent personality                                       │  │
│  │     └─ Agent capabilities                                      │  │
│  │                                                                 │  │
│  │  OUTPUT: UnifiedContext Object                                 │  │
│  │  {                                                              │  │
│  │    conversationHistory: [...]                                  │  │
│  │    tokenStats: {...}                                           │  │
│  │    activeDocument: {...}                                       │  │
│  │    allDocuments: [...]                                         │  │
│  │    sharedData: {...}                                           │  │
│  │    relevantMemories: [...]                                     │  │
│  │    agentExpertise: [...]                                       │  │
│  │    agentCapabilities: [...]                                    │  │
│  │  }                                                              │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬───────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                       OrchestratorAgent                               │
│  Step 1: Receive message + agent + unifiedContext                    │
│  Step 2: Build AI prompt with ALL context                            │
│  Step 3: Route to appropriate agent(s)                               │
└──────────────────────────────┬───────────────────────────────────────┘
                                │
                     ┌──────────┼──────────┐
                     │          │          │
                     ▼          ▼          ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Agent A     │  │  Agent B     │  │  Agent C     │
│  (Productivity) │  │  (Finance)   │  │  (Knowledge) │
│              │  │              │  │              │
│  ✅ Has full │  │  ✅ Has full │  │  ✅ Has full │
│  context     │  │  context     │  │  context     │
│              │  │              │  │              │
│  • Docs      │  │  • Docs      │  │  • Docs      │
│  • History   │  │  • History   │  │  • History   │
│  • Memories  │  │  • Memories  │  │  • Memories  │
│  • Shared    │  │  • Shared    │  │  • Shared    │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## 🔄 **AGENT HANDOFF FLOW:**

```
USER UPLOADS DOCUMENT TO AGENT A
         │
         ▼
┌────────────────────────────┐
│  Agent A (Productivity AI) │
│  • Processes document      │
│  • Analyzes content        │
└─────────────┬──────────────┘
              │
              ▼ Store in UnifiedContextManager
┌────────────────────────────────────────────┐
│  UnifiedContextManager                     │
│  • Document stored                         │
│  • Conversation history saved              │
│  • Context versioned: v1                   │
└─────────────┬──────────────────────────────┘
              │
              │ USER SWITCHES TO AGENT B
              │
              ▼
┌────────────────────────────┐
│  Agent B (Finance Agent)   │
│  Gets unified context:     │
│  • ✅ Same document        │
│  • ✅ Same conversation    │
│  • ✅ Same memories        │
│  • ✅ Handoff summary      │
└────────────────────────────┘
```

---

## 🎯 **CONTEXT SYNCHRONIZATION:**

### **Scenario: Two Agents Working Together**

```
┌─────────────────────────────────────────────────────────────────┐
│                    COLLABORATIVE WORKFLOW                        │
└──────────────────┬──────────────────────────────────────────────┘
                   │
       ┌───────────┴───────────┐
       │                       │
       ▼                       ▼
┌──────────────┐         ┌──────────────┐
│  Agent A     │         │  Agent B     │
│  (Email)     │         │  (Calendar)  │
└──────┬───────┘         └──────┬───────┘
       │                        │
       │ Extract meeting info   │
       │ from email             │
       │                        │
       ▼                        │
┌──────────────────────┐        │
│  SharedContext       │        │
│  {                   │        │
│    meetingDetails: { │        │
│      time: "2pm",    │        │
│      attendees: [...] │       │
│    }                 │        │
│  }                   │        │
└──────┬───────────────┘        │
       │                        │
       │  Agent B retrieves     │
       └────────────────────────┤
                                │
                                ▼
                    ┌──────────────────────┐
                    │  Agent B schedules   │
                    │  meeting with        │
                    │  shared context ✅   │
                    └──────────────────────┘
```

---

## 📦 **CONTEXT COMPONENTS:**

### **1. Conversation Context:**
```
ConversationContextManager
  │
  ├─► Get History
  │   └─► sessionStorage.getItem('chat_turns_${threadId}')
  │
  ├─► Manage Tokens
  │   ├─► Count tokens in messages
  │   ├─► Check against model limit
  │   └─► Compress if needed
  │
  └─► Search Memories
      ├─► Episodic memories (conversation summaries)
      ├─► General memories (facts)
      └─► Recent episodes (this thread)
```

### **2. Document Context:**
```
DocumentContextManager
  │
  ├─► Store Document
  │   ├─► documentContexts: Map<threadId, DocumentContext[]>
  │   └─► activeDocuments: Map<threadId, documentId>
  │
  ├─► Get Active Document
  │   └─► Returns currently discussed document
  │
  └─► Build Context String
      ├─► Document summary
      ├─► Key findings
      ├─► Structured data
      └─► Content excerpt
```

### **3. Shared Context:**
```
SharedContext
  │
  ├─► Store in Supabase
  │   └─► shared_context table
  │
  ├─► Cache in Memory
  │   └─► Map<key, value>
  │
  └─► Common Keys
      ├─► user_preferences
      ├─► task_state
      ├─► workflow_data
      └─► automation_state
```

### **4. Memory Context:**
```
MemoryService
  │
  ├─► Episodic Memory
  │   └─► Conversation summaries
  │
  ├─► Semantic Memory
  │   └─► Facts and knowledge
  │
  ├─► User Profile
  │   └─► Preferences and patterns
  │
  └─► Semantic Search
      └─► Vector-based retrieval
```

---

## 🔄 **CONTEXT LIFECYCLE:**

```
1. CONTEXT CREATION
   │
   ├─► User sends message
   ├─► ChatProcessor calls UnifiedContextManager
   └─► UnifiedContext built and cached
   
2. CONTEXT USAGE
   │
   ├─► OrchestratorAgent receives context
   ├─► Builds AI prompt with all context
   └─► Agent processes with full awareness
   
3. CONTEXT UPDATE
   │
   ├─► New message added to history
   ├─► Document uploaded
   ├─► Shared data updated
   └─► Cache invalidated, version incremented
   
4. CONTEXT SYNCHRONIZATION
   │
   ├─► Agent A stores findings in SharedContext
   ├─► Agent B retrieves from SharedContext
   └─► Both agents have same data
   
5. CONTEXT HANDOFF
   │
   ├─► User switches agents
   ├─► Handoff summary generated
   ├─► New agent gets full context
   └─► Seamless transition
   
6. CONTEXT CLEANUP
   │
   ├─► Conversation ends
   ├─► clearThreadContext() called
   └─► Cache cleared, memory freed
```

---

## 🎨 **CONTEXT STATE DIAGRAM:**

```
┌──────────────────────────────────────────────────────────────────┐
│                      CONTEXT STATE                                │
└──────────────────────────────────────────────────────────────────┘

  [Initial] ──→ [Building] ──→ [Cached] ──→ [Stale] ──→ [Invalidated]
      │             │             │           │              │
      │             │             │           │              │
      │             ▼             │           │              │
      │        [In Use]           │           │              │
      │             │             │           │              │
      │             ▼             │           │              │
      │        [Updated] ─────────┤           │              │
      │                           │           │              │
      └───────────────────────────┴───────────┴──────────────┘
                                  │
                                  ▼
                             [Cleared]

States:
• Initial: No context exists
• Building: UnifiedContextManager assembling context
• Cached: Context stored in memory, ready for use
• In Use: Agent currently using this context
• Updated: New data added (message, document, etc.)
• Stale: Context age > 30 seconds
• Invalidated: Cache cleared, needs rebuild
• Cleared: Thread ended, context removed
```

---

## 📊 **CONTEXT DATA FLOW:**

### **Message Flow with Context:**

```
User Message: "Schedule review meeting"
    │
    ▼
┌───────────────────────────────────────────────────────────────┐
│  UnifiedContextManager.buildUnifiedContext()                  │
│                                                                │
│  Step 1: Get Conversation History                             │
│  ├─► sessionStorage → 10 previous messages                    │
│  └─► Token count: 2,000 tokens                                │
│                                                                │
│  Step 2: Get Document Context                                 │
│  ├─► DocumentContextManager → TCLY report                     │
│  └─► Context string: 500 tokens                               │
│                                                                │
│  Step 3: Search Memories                                      │
│  ├─► MemoryService → 3 relevant memories                      │
│  └─► "User prefers morning meetings"                          │
│                                                                │
│  Step 4: Get Shared Context                                   │
│  ├─► SharedContext → user preferences                         │
│  └─► timezone: "EST", notification: "email"                   │
│                                                                │
│  TOTAL: 2,500 tokens (25% of limit) ✅                        │
└───────────────────────────────────────────────────────────────┘
    │
    ▼
┌───────────────────────────────────────────────────────────────┐
│  OrchestratorAgent.processRequest()                           │
│                                                                │
│  AI Prompt Construction:                                       │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ System: You are a productivity assistant...             │  │
│  │                                                          │  │
│  │ Document Context:                                        │  │
│  │ • TCLY Q4 Report                                         │  │
│  │ • Net loss: $1,970,888                                   │  │
│  │ • Sales: $7,386,735                                      │  │
│  │                                                          │  │
│  │ User Preferences:                                        │  │
│  │ • Timezone: EST                                          │  │
│  │ • Notification: email                                    │  │
│  │                                                          │  │
│  │ Relevant Memory:                                         │  │
│  │ • "User prefers morning meetings"                        │  │
│  │                                                          │  │
│  │ Conversation History:                                    │  │
│  │ [... 10 messages ...]                                    │  │
│  │                                                          │  │
│  │ User: Schedule review meeting                            │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
    │
    ▼
┌───────────────────────────────────────────────────────────────┐
│  AI Response (with full context)                              │
│                                                                │
│  "I'll help you schedule a review meeting for the TCLY Q4     │
│  financial report. Based on your preference for morning       │
│  meetings and your EST timezone, I recommend:                 │
│                                                                │
│  📅 Date: Monday, October 13, 2025                            │
│  🕐 Time: 9:00 AM EST                                         │
│  📧 Notification: Email confirmation                          │
│                                                                │
│  Agenda:                                                       │
│  • Review $1.9M net loss                                      │
│  • Discuss 68% sales increase                                │
│  • Analyze asset position                                     │
│  • Define corrective measures                                 │
│                                                                │
│  Would you like me to send the calendar invite?"              │
└───────────────────────────────────────────────────────────────┘
```

---

## 🎯 **KEY BENEFITS:**

### **1. Single Source of Truth**
```
Before: Each agent has different context ❌
After:  All agents share unified context ✅
```

### **2. Automatic Synchronization**
```
Before: Manual context passing between agents ❌
After:  Automatic via UnifiedContextManager ✅
```

### **3. Context Versioning**
```
Before: No way to track context changes ❌
After:  Every update increments version ✅
```

### **4. Smart Caching**
```
Before: Rebuild context every time ❌
After:  Cache for 30 seconds, auto-refresh ✅
```

### **5. Token Management**
```
Before: Context overflow, errors ❌
After:  Auto-compress, stay within limits ✅
```

---

## 🔧 **IMPLEMENTATION STEPS:**

### **1. Update ChatProcessor:**
```typescript
// Add UnifiedContextManager
private unifiedContextManager = UnifiedContextManager.getInstance();

// Use in processMessage
const unifiedContext = await this.unifiedContextManager.buildUnifiedContext(
  threadId, userId, agent, message
);
```

### **2. Update OrchestratorAgent:**
```typescript
// Accept unified context
async processRequest(input: { message, agent, unifiedContext }) {
  // Use context in AI prompt
  const messages = this.buildMessagesWithContext(input.unifiedContext);
}
```

### **3. Update Agent Factories:**
```typescript
// Pass context to agents
const agent = await this.agentFactory.createAgent(agentType, {
  context: unifiedContext
});
```

---

## ✅ **VERIFICATION:**

### **Test 1: Document Context**
```
1. Upload document with Agent A
2. Switch to Agent B
3. Ask about document
   Expected: Agent B knows about document ✅
```

### **Test 2: Shared Context**
```
1. Agent A stores data in shared context
2. Agent B retrieves same data
   Expected: Data matches ✅
```

### **Test 3: Memory Retrieval**
```
1. Have conversation about topic
2. End conversation
3. Start new conversation, mention topic
   Expected: Memories retrieved ✅
```

### **Test 4: Token Management**
```
1. Have long conversation (100+ messages)
2. Check token usage
   Expected: Auto-compressed, within limits ✅
```

---

**🎉 Result: Perfect context accuracy across all agents!**

