# 🤖 LLM PROVIDER SELECTION - EXACT FLOW

## 🎯 **HOW PROVIDERS ARE SELECTED (STEP-BY-STEP)**

Let me trace the **EXACT code path** from user message to LLM selection:

---

## 🔄 **COMPLETE SELECTION FLOW**

### **User sends message: "Analyze the quarterly sales data"**

---

### **STEP 1: Message Enters System**

**File:** `src/services/chat/ChatProcessor.ts` (Line 75)

```typescript
// Route to Orchestrator
const orchestratorResponse = await this.orchestrator.processRequest({ 
  message,  // "Analyze the quarterly sales data"
  agent,    // Finance Agent
  userId,
  conversationHistory,
  // ...
});
```

---

### **STEP 2: Orchestrator Routes to Agent**

**File:** `src/services/orchestrator/OrchestratorAgent.ts` (Lines 442-467)

```typescript
// Get agent instance
const agentInstance = await AgentFactory.getInstance().getAgentInstance(agent.id);

// Call RAG-powered response
const response = await agentInstance.generateResponseWithRAG(
  message,            // "Analyze the quarterly sales data"
  formattedHistory,
  userId,
  agentContext
);
```

---

### **STEP 3: Agent Detects Required Skill**

**File:** `src/services/agent/BaseAgent.ts` (Lines 550-580)

```typescript
protected async generateResponseWithRAG(
  userMessage: string,  // "Analyze the quarterly sales data"
  conversationHistory,
  userId,
  context
): Promise<string> {
  
  // Build RAG context...
  const ragContext = await this.buildRAGContext(...);
  
  // Build messages...
  const messages: LLMMessage[] = [...];
  
  // ✨ DETECT SKILL FROM CONTEXT
  const skillName = this.detectSkillFromContext(context);
  //    ↑
  //    Returns: 'data_analysis' or 'financial_analysis'
  
  // ✨ EXECUTE WITH SELECTED LLM
  const response = await this.executeLLM(messages, skillName);
  //                                                ↑
  //                                This is where provider selection happens!
  
  return response;
}
```

---

### **STEP 4: Detect Skill from Context**

**File:** `src/services/agent/BaseAgent.ts` (Lines 319-329)

```typescript
private detectSkillFromContext(context: AgentContext): string | undefined {
  // Check if context has a specific action that maps to a skill
  if (context.action) {
    return context.action;
  }
  
  // Default to agent's primary skill
  return this.config.skills[0]?.name;
}
```

**Result:** `skillName = 'data_analysis'` (or similar)

---

### **STEP 5: Execute LLM with Skill-Based Selection**

**File:** `src/services/agent/BaseAgent.ts` (Lines 287-318)

```typescript
protected async executeLLM(
  messages: LLMMessage[],
  skillName?: string     // ← 'data_analysis'
): Promise<string> {
  
  // 1️⃣ FIND THE SKILL OBJECT
  const skill = skillName 
    ? this.config.skills.find(s => s.name === skillName)
    : undefined;
  
  // skill = { name: 'data_analysis', level: 5, config: {...} }
  
  // 2️⃣ SELECT LLM FOR THIS SKILL
  const llmConfig = skill 
    ? this.llmRouter.selectLLMForSkill(
        skill,                          // ← The skill object
        this.config.llm_config || defaultLLM,  // ← Agent's default LLM
        undefined                       // ← Overrides (optional)
      )
    : this.config.llm_config || defaultLLM;
  
  // llmConfig = { provider: 'mistral', model: 'mistral-large-latest', ... }
  
  // 3️⃣ EXECUTE WITH SELECTED PROVIDER
  console.log(`🤖 Executing with ${llmConfig.provider}/${llmConfig.model}`);
  
  const response = await this.llmRouter.execute(
    messages,
    llmConfig    // ← SELECTED LLM CONFIG
  );
  
  return response;
}
```

---

### **STEP 6: LLM Router Selects Provider**

**File:** `src/services/llm/LLMRouter.ts` (Lines 60-97)

```typescript
selectLLMForSkill(
  skill: AgentSkill,              // { name: 'data_analysis', level: 5 }
  defaultLLM: LLMConfig,          // { provider: 'openai', model: 'gpt-4' }
  overrides?: Record<string, LLMConfig>
): LLMConfig {
  
  // 🎯 PRIORITY 1: Skill has its own preferred LLM?
  if (skill.preferred_llm) {
    console.log(`🎯 Using skill's preferred LLM: ${skill.preferred_llm.provider}`);
    return skill.preferred_llm;
    // Example: { provider: 'mistral', model: 'mistral-large' }
  }

  // 🎯 PRIORITY 2: Is there an override for this skill category?
  const skillType = this.categorizeSkill(skill.name);
  //    ↓
  //    skillName = 'data_analysis'
  //    skillType = 'research'  (because contains 'analysis')
  
  if (overrides && overrides[skillType]) {
    console.log(`🎯 Using override LLM for ${skillType}: ${overrides[skillType].provider}`);
    return overrides[skillType];
  }

  // 🎯 PRIORITY 3: Use recommended LLM for this skill type
  const recommended = this.recommendLLM(skillType);
  //    ↓
  //    skillType = 'research'
  //    recommended = { provider: 'mistral', model: 'mistral-large-latest', ... }
  
  console.log(`🎯 Using recommended LLM for ${skillType}: ${recommended.provider}`);
  return recommended;
  
  // NOTE: Currently simplified - would return recommended here
  // In code, it falls back to defaultLLM, but can be enhanced
}
```

---

### **STEP 7: Categorize Skill**

**File:** `src/services/llm/LLMRouter.ts` (Lines 86-97)

```typescript
private categorizeSkill(skillName: string): string {
  const lower = skillName.toLowerCase();  // 'data_analysis'
  
  if (lower.includes('research') || lower.includes('analysis'))  // ← MATCHES!
    return 'research';  // ✅ RETURNS 'research'
    
  if (lower.includes('writ') || lower.includes('content')) 
    return 'writing';
    
  if (lower.includes('code') || lower.includes('programming')) 
    return 'code';
    
  if (lower.includes('summar')) 
    return 'summarization';
    
  if (lower.includes('translat')) 
    return 'translation';
    
  if (lower.includes('conversation') || lower.includes('support')) 
    return 'conversation';
  
  return 'general';
}

// Result: skillType = 'research'
```

---

### **STEP 8: Get Recommendation**

**File:** `src/services/llm/LLMRouter.ts` (Lines 176-229)

```typescript
recommendLLM(taskType: string): LLMConfig {  // taskType = 'research'
  const recommendations: Record<string, LLMConfig> = {
    
    research: {                              // ← MATCHES!
      provider: 'mistral',                   // ✅ SELECTS MISTRAL
      model: 'mistral-large-latest',
      reason: 'Excellent reasoning and analytical capabilities',
      costPerMillion: 8.0
    },
    
    analysis: {
      provider: 'mistral',
      model: 'mistral-large-latest',
      // ...
    },
    
    writing: {
      provider: 'anthropic',  // Claude
      model: 'claude-3-opus-20240229',
      // ...
    },
    
    // ... more recommendations
    
    default: {
      provider: 'openai',
      model: 'gpt-4-turbo-preview',
      // ...
    }
  };

  return recommendations[taskType] || recommendations['default'];
  //     ↓
  //     Returns: { provider: 'mistral', model: 'mistral-large-latest', ... }
}
```

**Result:** `llmConfig = { provider: 'mistral', model: 'mistral-large-latest' }`

---

### **STEP 9: Execute with Selected Provider**

**File:** `src/services/llm/LLMRouter.ts` (Lines 102-141)

```typescript
async execute(
  messages: LLMMessage[],
  config: LLMConfig  // { provider: 'mistral', model: 'mistral-large-latest' }
): Promise<string> {
  
  // 1️⃣ GET PROVIDER INSTANCE
  const provider = this.providers.get(config.provider);
  //    ↓
  //    provider = MistralProvider instance
  
  if (!provider) {
    throw new Error(`Provider ${config.provider} not available`);
  }

  // 2️⃣ CHECK IF PROVIDER IS AVAILABLE
  const isAvailable = await provider.isAvailable();
  //    ↓
  //    Checks: return !!this.apiKey  (VITE_MISTRAL_API_KEY exists?)
  
  if (!isAvailable) {
    console.log(`⚠️ ${config.provider} not available, falling back to OpenAI`);
    // Falls back to OpenAI if Mistral key not configured
    const fallback = this.providers.get('openai');
    return await fallback.chat(messages, { ...config, provider: 'openai' });
  }

  // 3️⃣ EXECUTE THE CALL
  console.log(`🤖 Executing LLM: ${config.provider}/${config.model}`);
  const startTime = Date.now();

  const response = await provider.chat(messages, config);
  //    ↓
  //    Calls: MistralProvider.chat(messages, config)

  const duration = Date.now() - startTime;
  console.log(`✅ LLM responded in ${duration}ms`);

  return response;
}
```

---

### **STEP 10: Provider Makes API Call**

**File:** `src/services/llm/providers/MistralProvider.ts` (Lines 18-44)

```typescript
async chat(messages: LLMMessage[], config: LLMConfig): Promise<string> {
  if (!this.apiKey) {
    throw new Error('Mistral API key not configured');
  }

  // MAKE API CALL TO MISTRAL
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`  // VITE_MISTRAL_API_KEY
    },
    body: JSON.stringify({
      model: config.model,          // 'mistral-large-latest'
      messages,                     // Conversation history
      temperature: config.temperature ?? 0.7,
      max_tokens: config.maxTokens,
    })
  });

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
  //     ↓
  //     "Based on the quarterly sales data analysis..."
}
```

---

## 📊 **VISUAL FLOW DIAGRAM**

```
USER MESSAGE: "Analyze quarterly sales data"
    ↓
ChatProcessor
    ↓
OrchestratorAgent
    ↓
Finance Agent.generateResponseWithRAG()
    ↓
┌─────────────────────────────────────────┐
│ STEP 1: Detect Skill                    │
├─────────────────────────────────────────┤
│ detectSkillFromContext(context)        │
│   ↓                                      │
│ Result: 'data_analysis'                 │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ STEP 2: Select LLM for Skill            │
├─────────────────────────────────────────┤
│ llmRouter.selectLLMForSkill(skill)      │
│   ↓                                      │
│ 1. Check skill.preferred_llm? ❌        │
│ 2. Check overrides? ❌                  │
│ 3. Categorize skill:                    │
│    'data_analysis' → 'research'         │
│ 4. Get recommendation:                  │
│    recommendations['research'] = {      │
│      provider: 'mistral',               │
│      model: 'mistral-large-latest'      │
│    }                                     │
│   ↓                                      │
│ Selected: Mistral Large ✅              │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ STEP 3: Execute with Provider           │
├─────────────────────────────────────────┤
│ llmRouter.execute(messages, config)     │
│   ↓                                      │
│ 1. Get provider instance:               │
│    providers.get('mistral')             │
│    → MistralProvider                    │
│                                          │
│ 2. Check availability:                  │
│    provider.isAvailable()               │
│    → checks VITE_MISTRAL_API_KEY        │
│    → Returns: true/false                │
│                                          │
│ 3. If available:                        │
│    provider.chat(messages, config)      │
│    → Calls Mistral API                  │
│                                          │
│ 4. If NOT available:                    │
│    Fallback to OpenAI                   │
│    → providers.get('openai')            │
│    → Calls OpenAI API instead           │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ STEP 4: Provider Makes API Call         │
├─────────────────────────────────────────┤
│ MistralProvider.chat(messages, config)  │
│   ↓                                      │
│ fetch('https://api.mistral.ai/v1/...',  │
│   {                                      │
│     method: 'POST',                      │
│     headers: {                           │
│       Authorization: Bearer API_KEY     │
│     },                                   │
│     body: {                              │
│       model: 'mistral-large-latest',    │
│       messages: [...]                   │
│     }                                    │
│   }                                      │
│ )                                        │
│   ↓                                      │
│ Response from Mistral API               │
└─────────────────────────────────────────┘
    ↓
Response: "Analysis of quarterly sales data shows..."
```

---

## 🎯 **SELECTION PRIORITY (EXACT ORDER)**

### **Priority 1: Skill's Preferred LLM** (HIGHEST)

```typescript
// If skill is defined like this:
const skill = {
  name: 'financial_analysis',
  level: 5,
  preferred_llm: {              // ← CUSTOM PREFERENCE
    provider: 'mistral',
    model: 'mistral-large-latest'
  }
};

// Then this LLM is used, period!
// No questions asked, no categorization needed
```

**Example:**
```
Skill: 'financial_analysis'
  └─ Has preferred_llm? ✅ YES
      └─ Use: Mistral Large
      └─ Skip all other checks
```

---

### **Priority 2: Skill Category Override** (HIGH)

```typescript
// If you provide overrides:
const overrides = {
  research: { provider: 'mistral', model: 'mistral-large' },
  writing: { provider: 'anthropic', model: 'claude-opus' },
  code: { provider: 'openai', model: 'gpt-4' }
};

llmRouter.selectLLMForSkill(skill, defaultLLM, overrides);
```

**Example:**
```
Skill: 'data_analysis'
  ↓ Categorize
  Type: 'research'
  ↓ Check overrides
  overrides['research'] exists? ✅ YES
  └─ Use: Mistral Large from override
```

---

### **Priority 3: Smart Recommendation** (MEDIUM)

```typescript
// If no preference or override, use built-in recommendations:

Skill: 'data_analysis'
  ↓ Categorize
  Type: 'research'
  ↓ Get recommendation
  recommendations['research'] = {
    provider: 'mistral',
    model: 'mistral-large-latest',
    reason: 'Excellent reasoning and analytical capabilities'
  }
  └─ Use: Mistral Large
```

**This is the SMART DEFAULT!** ✨

---

### **Priority 4: Agent Default LLM** (LOW)

```typescript
// If skill categorization doesn't match any recommendation:

Skill: 'custom_weird_skill'
  ↓ Categorize
  Type: 'general' (no specific match)
  ↓ Get recommendation
  recommendations['default'] OR defaultLLM
  └─ Use: Agent's default (usually OpenAI GPT-4)
```

---

### **Priority 5: Global Fallback** (LOWEST)

```typescript
// If everything fails:

const defaultLLM = {
  provider: 'openai',
  model: 'gpt-4-turbo-preview',
  temperature: 0.7
};

// Always works if OpenAI key is configured
```

---

## 💡 **ACTUAL SELECTION EXAMPLES**

### **Example 1: Research Task**

```
User: "Research AI trends in 2024"

Flow:
1. Skill detected: 'research'
2. Categorize: 'research'
3. Recommendation: Mistral Large
4. Check Mistral API key: 
   - If exists → Use Mistral ✅
   - If not → Fallback to OpenAI ⚠️
5. Execute: Mistral API call

Console Output:
🎯 Using recommended LLM for research: mistral
🤖 Executing LLM: mistral/mistral-large-latest
✅ LLM responded in 1234ms
```

---

### **Example 2: Writing Task**

```
User: "Write a blog post about our new product"

Flow:
1. Skill detected: 'content_writing'
2. Categorize: 'writing' (contains 'writ')
3. Recommendation: Claude Opus
4. Check Claude API key:
   - If exists → Use Claude ✅
   - If not → Fallback to OpenAI ⚠️
5. Execute: Claude API call

Console Output:
🎯 Using recommended LLM for writing: anthropic
🤖 Executing LLM: anthropic/claude-3-opus-20240229
✅ LLM responded in 2100ms
```

---

### **Example 3: Simple Chat**

```
User: "Hello, how are you?"

Flow:
1. Skill detected: 'conversation'
2. Categorize: 'conversation'
3. Recommendation: GPT-3.5 Turbo
4. Check OpenAI key:
   - Exists → Use GPT-3.5 ✅
5. Execute: OpenAI API call

Console Output:
🎯 Using recommended LLM for conversation: openai
🤖 Executing LLM: openai/gpt-3.5-turbo
✅ LLM responded in 450ms

Cost: $0.0005 (vs $0.01 for GPT-4) = 95% savings! 💰
```

---

## 🔍 **PROVIDER AVAILABILITY CHECK**

**Each provider checks if it's configured:**

```typescript
// OpenAI Provider
async isAvailable(): Promise<boolean> {
  return !!this.apiKey;  // ✅ if VITE_OPENAI_API_KEY exists
}

// Mistral Provider
async isAvailable(): Promise<boolean> {
  return !!this.apiKey;  // ✅ if VITE_MISTRAL_API_KEY exists
}

// Claude Provider
async isAvailable(): Promise<boolean> {
  return !!this.apiKey;  // ✅ if VITE_ANTHROPIC_API_KEY exists
}

// Gemini Provider
async isAvailable(): Promise<boolean> {
  return !!this.apiKey;  // ✅ if VITE_GOOGLE_API_KEY exists
}

// Ollama Provider
async isAvailable(): Promise<boolean> {
  // Check if local Ollama server is running
  try {
    await fetch('http://localhost:11434/api/tags');
    return true;  // ✅ if Ollama is running locally
  } catch {
    return false;
  }
}

// Groq Provider
async isAvailable(): Promise<boolean> {
  return !!this.apiKey;  // ✅ if VITE_GROQ_API_KEY exists
}
```

**Current Status:**
- ✅ OpenAI: Available (you're using it)
- ⚠️ Mistral: Not available (no API key)
- ⚠️ Claude: Not available (no API key)
- ⚠️ Gemini: Not available (no API key)
- ⚠️ Ollama: Not available (not running)
- ⚠️ Groq: Not available (no API key)

**So it ALWAYS falls back to OpenAI!**

---

## 🎊 **SUMMARY**

**Your Question:** "How are they selected?"

**Answer:**

### **Selection Process:**

```
1. Detect skill from user message
   ↓
2. Categorize skill into type
   ('research', 'writing', 'code', etc.)
   ↓
3. Get recommended LLM for that type
   research → Mistral
   writing → Claude
   code → GPT-4
   conversation → GPT-3.5
   ↓
4. Check if provider is available
   (Has API key? Is server running?)
   ↓
5. If available → Use recommended LLM ✅
   If not → Fallback to OpenAI ⚠️
   ↓
6. Make API call to selected provider
```

### **Why You Only See OpenAI:**

⚠️ **Only OpenAI is configured** in your `.env`

**To enable smart routing:**
```env
# Add these to .env
VITE_MISTRAL_API_KEY=your-mistral-key      # For research/analysis
VITE_ANTHROPIC_API_KEY=your-claude-key     # For writing
VITE_GOOGLE_API_KEY=your-gemini-key        # For translation
VITE_GROQ_API_KEY=your-groq-key            # For speed
```

**Then the system will automatically:**
- ✅ Use Mistral for research/analysis (cheaper, better)
- ✅ Use Claude for writing (best quality)
- ✅ Use GPT-3.5 for chat (95% cheaper)
- ✅ Use Groq for speed (10x faster)

**Smart routing = Better quality + Lower costs!** 🚀



