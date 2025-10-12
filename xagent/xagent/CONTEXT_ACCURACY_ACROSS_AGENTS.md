# 🎯 Context Accuracy Across Agents

## 📋 **THE CHALLENGE:**

In a multi-agent system, ensuring **context accuracy** across different agents is critical:

### **Common Problems:**
1. **❌ Agent A knows about a document, but Agent B doesn't**
2. **❌ User tells Agent A something, switches to Agent B, and has to repeat**
3. **❌ Agents have conflicting or outdated information**
4. **❌ Context gets lost during agent handoffs**
5. **❌ Each agent builds its own isolated context**

---

## ✅ **THE SOLUTION: Unified Context Management**

I've created a **UnifiedContextManager** that serves as the **single source of truth** for all context across agents.

---

## 🏗️ **ARCHITECTURE:**

### **Before (Fragmented Context):**

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Agent A        │     │   Agent B        │     │   Agent C        │
│                  │     │                  │     │                  │
│  Own Context ✗   │     │  Own Context ✗   │     │  Own Context ✗   │
│  Own Memory  ✗   │     │  Own Memory  ✗   │     │  Own Memory  ✗   │
│  No Sync     ✗   │     │  No Sync     ✗   │     │  No Sync     ✗   │
└──────────────────┘     └──────────────────┘     └──────────────────┘
      ↓                        ↓                        ↓
   Isolated                Isolated                 Isolated
```

### **After (Unified Context):**

```
                  ┌─────────────────────────────────────┐
                  │   UnifiedContextManager              │
                  │   (Single Source of Truth)           │
                  │                                      │
                  │  • Conversation History              │
                  │  • Document Context                  │
                  │  • Shared Cross-Agent Data           │
                  │  • Memory & User Profile             │
                  │  • Token Management                  │
                  │  • Context Versioning                │
                  └──────────────┬──────────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
         ┌──────────▼──┐  ┌─────▼─────┐  ┌──▼──────────┐
         │  Agent A ✅ │  │  Agent B ✅│  │  Agent C ✅ │
         │             │  │            │  │             │
         │ Synced      │  │ Synced     │  │ Synced      │
         │ Context     │  │ Context    │  │ Context     │
         └─────────────┘  └────────────┘  └─────────────┘
```

---

## 🔄 **HOW IT WORKS:**

### **1. Building Unified Context:**

```typescript
const unifiedContext = await unifiedContextManager.buildUnifiedContext(
  threadId,
  userId,
  agent,
  currentMessage,
  {
    includeDocuments: true,
    includeMemories: true,
    includeSharedContext: true
  }
);
```

**This gives you:**
```typescript
{
  // Conversation context
  conversationHistory: ChatMessage[],    // Full conversation with token management
  tokenStats: { currentTokens, maxTokens, usagePercentage },
  
  // Document context
  activeDocument: DocumentContext | null,
  allDocuments: DocumentContext[],
  documentContextString: string,         // Pre-formatted for AI
  
  // Shared cross-agent data
  sharedData: {
    user_preferences: {...},
    task_state: {...},
    workflow_data: {...}
  },
  
  // Memory context
  relevantMemories: Memory[],            // Semantic search results
  userProfile: UserProfile,
  
  // Agent-specific
  agentExpertise: string[],
  agentPersonality: {...},
  agentCapabilities: string[],
  
  // Metadata
  contextVersion: "v1",
  lastUpdated: Date,
  contextHash: "abc123"
}
```

---

### **2. Agent Handoff:**

When user switches from Agent A to Agent B:

```typescript
// Prepare handoff context
const handoffContext = await unifiedContextManager.getHandoffContext(
  threadId,
  fromAgent,  // Agent A
  toAgent     // Agent B
);

// Handoff context includes:
// - Conversation summary
// - Active documents
// - Key insights
// - User goal
```

**Example Output:**
```
=== AGENT HANDOFF ===
From: Productivity AI (productivity)
To: Finance Analyst (finance)

CONVERSATION SUMMARY:
Recent user requests:
1. Upload TCLY financial report
2. Analyze the quarterly results
3. Schedule review meeting

ACTIVE DOCUMENT:
• Handwritten-document.png (financial_report)
• Summary: TCLY reported net loss of $1,970,888...

KEY CONTEXT FROM MEMORY:
• User prefers morning meetings
• User is concerned about cash flow
• Previous review meetings were on Mondays

USER GOAL:
Schedule a financial review meeting for the TCLY Q4 report
```

---

### **3. Context Synchronization:**

Share context between agents working on the same task:

```typescript
await unifiedContextManager.synchronizeAgentContext(
  sourceThreadId,
  targetThreadId,
  sourceAgent,
  targetAgent,
  {
    // Custom data to transfer
    customData: "specific info"
  }
);
```

---

### **4. Shared Context Updates:**

Update data that all agents can access:

```typescript
// Agent A stores data
await unifiedContextManager.updateSharedContext(
  threadId,
  'user_preferences',
  {
    meetingTime: '9:00 AM',
    timezone: 'EST',
    notificationMethod: 'email'
  }
);

// Agent B can access it
const context = await unifiedContextManager.buildUnifiedContext(...);
console.log(context.sharedData.user_preferences);
// { meetingTime: '9:00 AM', timezone: 'EST', ... }
```

---

## 📊 **CONTEXT LAYERS:**

### **1. Conversation Layer**
```
ConversationContextManager
├── Message History (with token management)
├── Conversation Compression (auto-summarize old messages)
└── Token Statistics
```

### **2. Document Layer**
```
DocumentContextManager
├── Active Document (currently being discussed)
├── All Documents (in this conversation)
└── Document Context String (formatted for AI)
```

### **3. Shared Layer**
```
SharedContext
├── User Preferences
├── Task State
├── Workflow Data
└── Automation State
```

### **4. Memory Layer**
```
MemoryService
├── Episodic Memories (conversation summaries)
├── Semantic Memories (facts and knowledge)
├── User Profile (preferences and patterns)
└── Relevant Memories (semantic search results)
```

### **5. Agent Layer**
```
Agent-Specific Context
├── Expertise (what the agent knows)
├── Personality (how the agent behaves)
├── Capabilities (what the agent can do)
└── Domain Knowledge (specialized info)
```

---

## 🎯 **ENSURING ACCURACY:**

### **1. Single Source of Truth**
```typescript
// ✅ CORRECT: All agents use UnifiedContextManager
const context = await unifiedContextManager.buildUnifiedContext(...);

// ❌ WRONG: Agent builds its own context
const context = { messages: getMessagesFromStorage() };
```

### **2. Context Versioning**
```typescript
{
  contextVersion: "v1",    // Increments on every update
  contextHash: "abc123",   // Unique hash for this context state
  lastUpdated: Date        // Timestamp of last update
}
```

### **3. Cache Invalidation**
```typescript
// When context changes, invalidate cache
await unifiedContextManager.updateSharedContext(threadId, key, value);
// → Automatically invalidates cached context
// → Forces rebuild on next access
```

### **4. Context Statistics**
```typescript
const stats = unifiedContextManager.getContextStats(threadId);
console.log(stats);
// {
//   exists: true,
//   version: "v5",
//   age: 1234,               // milliseconds since last update
//   messageCount: 12,
//   documentCount: 2,
//   memoryCount: 5,
//   tokenUsage: 65%,
//   lastUpdated: Date
// }
```

---

## 🔄 **INTEGRATION WORKFLOW:**

### **Step 1: ChatProcessor → Unified Context**

```typescript
// src/services/chat/ChatProcessor.ts

async processMessage(message: string, agent: Agent, userId?: string) {
  const threadId = agent.id || 'default_thread';
  
  // 🔥 BUILD UNIFIED CONTEXT
  const unifiedContext = await this.unifiedContextManager.buildUnifiedContext(
    threadId,
    userId,
    agent,
    message
  );
  
  // Pass to orchestrator with full context
  const response = await this.orchestrator.processRequest({
    message,
    agent,
    unifiedContext  // ← All context in one object
  });
  
  return response;
}
```

### **Step 2: Orchestrator → Agents**

```typescript
// src/services/orchestrator/OrchestratorAgent.ts

async processRequest(input: any) {
  const { message, agent, unifiedContext } = input;
  
  // Use unified context to build AI prompt
  const messages = [
    { role: 'system', content: this.buildSystemPrompt(agent) },
    
    // 🔥 INCLUDE DOCUMENT CONTEXT
    ...(unifiedContext.documentContextString ? [
      { role: 'system', content: unifiedContext.documentContextString }
    ] : []),
    
    // 🔥 INCLUDE SHARED CONTEXT
    ...(Object.keys(unifiedContext.sharedData).length > 0 ? [
      { role: 'system', content: `Shared Context: ${JSON.stringify(unifiedContext.sharedData)}` }
    ] : []),
    
    // 🔥 INCLUDE CONVERSATION HISTORY
    ...unifiedContext.conversationHistory,
    
    // Current message
    { role: 'user', content: message }
  ];
  
  const response = await createChatCompletion(messages);
  return response;
}
```

### **Step 3: Agent Collaboration**

```typescript
// When multiple agents work together

// Agent A (Productivity AI) processes email
const productivityContext = await unifiedContextManager.buildUnifiedContext(
  threadId, userId, productivityAgent, "Analyze this email"
);

// Extract key info
const emailData = {
  sender: "client@company.com",
  subject: "Budget Request",
  priority: "high"
};

// 🔥 SHARE WITH AGENT B (Finance Agent)
await unifiedContextManager.updateSharedContext(
  threadId,
  'email_data',
  emailData
);

// Agent B automatically gets this context
const financeContext = await unifiedContextManager.buildUnifiedContext(
  threadId, userId, financeAgent, "Review budget request"
);
// financeContext.sharedData.email_data = { sender: "...", ... } ✅
```

---

## 🎨 **REAL-WORLD SCENARIOS:**

### **Scenario 1: Document Upload + Agent Switch**

```
1. User uploads TCLY financial report to Productivity AI
   → Document stored in UnifiedContextManager
   
2. User switches to Finance Agent
   → Finance Agent builds unified context
   → Gets TCLY document automatically ✅
   
3. User asks: "What's the net loss?"
   → Finance Agent has full document context
   → Responds: "$1,970,888" ✅
```

### **Scenario 2: Multi-Agent Workflow**

```
1. Email Agent receives customer inquiry
   → Extracts: customerName, requestType, urgency
   → Stores in sharedContext
   
2. Orchestrator routes to Knowledge Agent
   → Knowledge Agent gets sharedContext
   → Knows: customer, request type, urgency ✅
   → Searches relevant docs
   
3. Routes to Productivity Agent for response
   → Gets knowledge search results from sharedContext
   → Gets customer info from sharedContext
   → Composes personalized response ✅
```

### **Scenario 3: Long Conversation Management**

```
1. 50 messages in conversation
   → UnifiedContextManager manages tokens
   → Auto-compresses old messages
   → Stores summaries in memory
   
2. User asks: "What did we discuss earlier?"
   → Relevant memories retrieved via semantic search
   → Agent can reference old topics ✅
   
3. Token limit approaching
   → System auto-summarizes oldest messages
   → Keeps context accurate within limits ✅
```

---

## 🔧 **IMPLEMENTATION CHECKLIST:**

### **Phase 1: Core Integration**
- [ ] Update `ChatProcessor` to use `UnifiedContextManager`
- [ ] Update `OrchestratorAgent` to receive unified context
- [ ] Integrate with existing `ConversationContextManager`
- [ ] Integrate with existing `DocumentContextManager`

### **Phase 2: Agent Updates**
- [ ] Update all agents to accept unified context
- [ ] Add context logging to agents
- [ ] Implement context validation

### **Phase 3: Handoff & Sync**
- [ ] Implement agent handoff in UI
- [ ] Add context sync for collaborative agents
- [ ] Add shared context UI indicators

### **Phase 4: Testing**
- [ ] Test single agent context accuracy
- [ ] Test multi-agent context sync
- [ ] Test document context across agents
- [ ] Test memory retrieval
- [ ] Test token management

---

## 📈 **MONITORING & DEBUGGING:**

### **Context Logs:**
```typescript
// Enable detailed logging
console.log('🔄 Building unified context for thread:', threadId);
console.log('📊 Context stats:', stats);
console.log('✅ Unified context built in', duration, 'ms');
```

### **Context Inspection:**
```typescript
// Get current context state
const stats = unifiedContextManager.getContextStats(threadId);
console.log(stats);

// Verify context accuracy
const context = await unifiedContextManager.buildUnifiedContext(...);
console.log('Messages:', context.conversationHistory.length);
console.log('Documents:', context.allDocuments.length);
console.log('Memories:', context.relevantMemories.length);
console.log('Shared Data:', Object.keys(context.sharedData));
```

### **Context Validation:**
```typescript
// Ensure all required context is present
if (!context.activeDocument && documentRequired) {
  console.warn('⚠️ Document expected but not found!');
}

if (context.conversationHistory.length === 0) {
  console.warn('⚠️ No conversation history!');
}

if (context.tokenStats.usagePercentage > 90) {
  console.warn('⚠️ Token usage critical: ', context.tokenStats.usagePercentage, '%');
}
```

---

## 🎯 **BEST PRACTICES:**

### **1. Always Use Unified Context**
```typescript
// ✅ CORRECT
const context = await unifiedContextManager.buildUnifiedContext(...);

// ❌ WRONG
const messages = getMessagesFromStorage();
```

### **2. Update Shared Context for Collaboration**
```typescript
// When Agent A finds important info
await unifiedContextManager.updateSharedContext(
  threadId,
  'important_finding',
  data
);
```

### **3. Clear Context When Done**
```typescript
// When conversation ends
await unifiedContextManager.clearThreadContext(threadId);
```

### **4. Use Handoff for Agent Switches**
```typescript
// Prepare context for new agent
const handoffContext = await unifiedContextManager.getHandoffContext(
  threadId,
  currentAgent,
  newAgent
);
```

### **5. Monitor Token Usage**
```typescript
// Check before adding more context
if (context.tokenStats.usagePercentage > 80) {
  console.warn('Token limit approaching, compressing...');
}
```

---

## 🚀 **BENEFITS:**

### **For Users:**
- ✅ **No repetition** - Never explain context twice
- ✅ **Seamless handoffs** - Switch agents without losing context
- ✅ **Document awareness** - All agents know about uploaded files
- ✅ **Consistent experience** - Same quality across all agents

### **For Developers:**
- ✅ **Single source of truth** - One place for all context
- ✅ **Easy debugging** - Clear context flow
- ✅ **Automatic sync** - No manual context passing
- ✅ **Scalable** - Add new agents easily

### **For System:**
- ✅ **Token optimization** - Smart compression
- ✅ **Memory efficiency** - Intelligent caching
- ✅ **Context versioning** - Track changes
- ✅ **Error recovery** - Validate context state

---

## 📝 **SUMMARY:**

**The `UnifiedContextManager` ensures context accuracy across agents by:**

1. **Centralizing** all context in one place
2. **Synchronizing** context between agents
3. **Versioning** context for consistency
4. **Caching** for performance
5. **Validating** context integrity
6. **Monitoring** token usage
7. **Providing** handoff support
8. **Managing** shared data

**Result:** All agents always have accurate, up-to-date context, ensuring a seamless multi-agent experience! 🎉

---

## 🔗 **RELATED FILES:**

- `src/services/context/UnifiedContextManager.ts` (NEW)
- `src/services/conversation/ConversationContextManager.ts`
- `src/services/chat/context/DocumentContextManager.ts`
- `src/services/context/SharedContext.ts`
- `src/services/memory/MemoryService.ts`
- `src/services/orchestrator/OrchestratorAgent.ts`
- `src/services/chat/ChatProcessor.ts`

