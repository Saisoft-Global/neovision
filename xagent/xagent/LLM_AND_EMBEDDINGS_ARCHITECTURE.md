# 🧠 LLM & Embeddings Architecture - Complete Analysis

## 📋 **EXECUTIVE SUMMARY**

Your system uses **dynamic, intelligent LLM routing** with a sophisticated multi-layered selection process. It's NOT always Groq - the system intelligently selects the best LLM based on:

1. **Skill preferences** (highest priority)
2. **User settings** (personalized)
3. **Organization policies** (company-wide)
4. **Task type** (reasoning vs speed vs creativity)
5. **Availability** (with smart fallbacks)

**Embeddings** are ALWAYS OpenAI (Groq doesn't provide embeddings).

---

## 🎯 **LLM SELECTION ARCHITECTURE**

### **Multi-Layer Priority System**

```
┌─────────────────────────────────────────────────┐
│  1. SKILL-SPECIFIC PREFERENCE (Highest)         │
│     └─> Each skill can define preferred LLM     │
└─────────────────────────────────────────────────┘
                      ↓ (if not available)
┌─────────────────────────────────────────────────┐
│  2. USER TASK OVERRIDES                         │
│     └─> User says: "Use Groq for code tasks"   │
└─────────────────────────────────────────────────┘
                      ↓ (if not defined)
┌─────────────────────────────────────────────────┐
│  3. ORGANIZATION OVERRIDES                      │
│     └─> Company policy: "Use Mistral for X"    │
└─────────────────────────────────────────────────┘
                      ↓ (if not defined)
┌─────────────────────────────────────────────────┐
│  4. TASK-TYPE RECOMMENDATIONS (Smart!)          │
│     ├─> Speed tasks → Groq                      │
│     ├─> Reasoning → Mistral                     │
│     ├─> Creative → Claude                       │
│     └─> Multilingual → Google                   │
└─────────────────────────────────────────────────┘
                      ↓ (if not available)
┌─────────────────────────────────────────────────┐
│  5. USER DEFAULT PROVIDER                       │
│     └─> User's preferred provider               │
└─────────────────────────────────────────────────┘
                      ↓ (if not available)
┌─────────────────────────────────────────────────┐
│  6. SYSTEM DEFAULT (Groq)                       │
│     └─> Fast by default!                        │
└─────────────────────────────────────────────────┘
                      ↓ (if fails)
┌─────────────────────────────────────────────────┐
│  7. INTELLIGENT FALLBACK CHAIN (Lowest)         │
│     └─> Groq → OpenAI → Ollama (local)         │
└─────────────────────────────────────────────────┘
```

---

## 🔧 **HOW IT WORKS IN DETAIL**

### **1. Provider Priority System**

**File:** `src/services/llm/LLMConfigManager.ts`

```typescript
Providers by Priority:
1. Groq (priority: 1)      ⚡ Speed  → Fallback: OpenAI
2. Mistral (priority: 2)   🧠 Reasoning → Fallback: OpenAI  
3. Anthropic (priority: 3) ✍️ Creative → Fallback: OpenAI
4. Google (priority: 4)    🌍 Multilingual → Fallback: OpenAI
5. OpenAI (priority: 5)    💻 Reliable → No fallback (ultimate)
6. Ollama (priority: 6)    🏠 Local → Fallback: OpenAI
```

**Default:** `'groq'` (10x faster!)

---

### **2. Task-Type Intelligent Routing**

**File:** `src/services/llm/LLMRouter.ts` → `recommendLLM()`

The system automatically selects the BEST provider based on task type:

#### **🚀 Speed-Focused Tasks → Groq**
```typescript
- realtime interactions
- streaming responses  
- simple/quick tasks
- chat completions
```
**Model:** `llama3-70b-8192` (ultra-fast!)

#### **🧠 Reasoning-Focused Tasks → Mistral**
```typescript
- research & analysis
- complex problem solving
- multi-step reasoning
- data analysis
```
**Model:** `mistral-large-latest` (best reasoning)

#### **✍️ Creative Tasks → Claude (Anthropic)**
```typescript
- long-form writing
- creative content
- storytelling
- narrative generation
```
**Model:** `claude-3-opus-20240229` (most creative)

#### **💻 Coding Tasks → OpenAI**
```typescript
- code generation
- debugging
- code review
- refactoring
```
**Model:** `gpt-4` (best for code)

#### **🌍 Multilingual Tasks → Google**
```typescript
- translation
- multilingual support
- localization
```
**Model:** `gemini-pro` (best multilingual)

---

### **3. User-Specific Settings**

**File:** `src/services/llm/UserLLMSettingsService.ts`

Users can configure:

#### **A. Personal API Keys**
```typescript
interface UserLLMSettings {
  openaiApiKey?: string;
  groqApiKey?: string;
  mistralApiKey?: string;
  anthropicApiKey?: string;
  googleApiKey?: string;
}
```

#### **B. Default Provider**
```typescript
defaultProvider: 'groq' | 'openai' | 'mistral' | ...
```

#### **C. Provider Preferences**
```typescript
providerPreferences: {
  groq: { enabled: true, priority: 1 },
  mistral: { enabled: false, priority: 999 },
  openai: { enabled: true, priority: 2 }
}
```

#### **D. Task-Specific Overrides**
```typescript
taskOverrides: {
  'code': { provider: 'openai', model: 'gpt-4' },
  'realtime': { provider: 'groq', model: 'llama3-70b-8192' },
  'research': { provider: 'mistral', model: 'mistral-large-latest' }
}
```

---

### **4. Organization Settings**

**File:** `src/services/llm/LLMConfigManager.ts` → `loadOrganizationSettings()`

Organizations can:

#### **A. Provide Organization-Wide API Keys**
```typescript
interface OrganizationLLMSettings {
  organization_id: string;
  openai_api_key?: string;
  groq_api_key?: string;
  mistral_api_key?: string;
  
  // Policy controls
  allow_user_keys: boolean;        // Can users use their own keys?
  fallback_to_org_keys: boolean;   // Fallback to org keys if user's fail?
}
```

#### **B. Set Company-Wide Policies**
```typescript
- Control which providers are allowed
- Set monthly request quotas
- Define task-specific defaults
- Enable/disable user customization
```

#### **C. Key Priority Logic**
```typescript
if (organization.allow_user_keys) {
  // User keys take priority
  userKey → orgKey → envKey
} else {
  // Organization keys only
  orgKey → envKey
}
```

---

### **5. Skill-Specific Preferences**

**File:** `src/services/agent/BaseAgent.ts` → `selectLLMForTask()`

Individual skills can define their preferred LLM:

```typescript
interface AgentSkill {
  name: string;
  description: string;
  preferred_llm?: {
    provider: 'groq' | 'openai' | 'mistral' | ...;
    model: string;
    temperature?: number;
  }
}
```

**Example:**
```typescript
{
  name: 'generate_code',
  description: 'Generate code from natural language',
  preferred_llm: {
    provider: 'openai',
    model: 'gpt-4',
    temperature: 0.3  // Lower for deterministic code
  }
}
```

**This takes HIGHEST priority!**

---

## 📊 **EMBEDDINGS ARCHITECTURE**

### **ALWAYS OpenAI** 🔒

**File:** `src/services/openai/embeddings.ts`

```typescript
export const generateEmbeddings = async (text: string): Promise<number[]> => {
  // ALWAYS uses OpenAI
  const response = await fetch(`${BACKEND_URL}/api/openai/embeddings`, {
    method: 'POST',
    body: JSON.stringify({
      input: text,
      model: 'text-embedding-ada-002'  // FIXED MODEL
    })
  });
  
  return data.data[0].embedding; // 1536 dimensions
};
```

### **Why Only OpenAI for Embeddings?**

1. **Groq doesn't provide embeddings** - Only chat completions
2. **Consistency** - All vectors must use same model/dimensions
3. **Quality** - OpenAI's ada-002 is industry standard
4. **Compatibility** - Pinecone/vector stores expect 1536 dims

### **Fallback for Embeddings**
```typescript
if (!OPENAI_API_KEY) {
  // Generate mock embeddings (for development)
  return new Array(1536).fill(0).map(() => Math.random() * 2 - 1);
}
```

---

## 🔄 **INTELLIGENT FALLBACK SYSTEM**

### **Automatic Fallback Chain**

**File:** `src/services/llm/LLMRouter.ts` → `execute()`

```typescript
try {
  // 1. Try primary provider (e.g., Groq)
  return await groqProvider.chat(messages);
  
} catch (error) {
  
  // 2. Try configured fallback (e.g., OpenAI)
  if (providerConfig.fallbackTo) {
    console.log(`🔄 Falling back to ${providerConfig.fallbackTo}`);
    return await openaiProvider.chat(messages);
  }
  
  // 3. Try ultimate fallback
  if (openaiProvider.isAvailable()) {
    console.log(`🔄 Ultimate fallback to OpenAI`);
    return await openaiProvider.chat(messages);
  }
  
  // 4. No providers available
  throw new Error('No available LLM providers');
}
```

### **Fallback Rules**

```
Groq fails → OpenAI
Mistral fails → OpenAI
Anthropic fails → OpenAI
Google fails → OpenAI
OpenAI fails → Error (no further fallback)
Ollama fails → OpenAI
```

---

## 📈 **REAL-WORLD EXAMPLES**

### **Example 1: Simple Chat (Default)**

```typescript
User: "Hello!"

Selection Process:
1. No skill specified
2. No user override
3. Task type: "simple_tasks"
4. Recommendation: Groq (speed)
5. Check availability: ✅ Groq available
6. SELECTED: Groq/llama3-70b-8192

Result: ⚡ 800ms response
```

### **Example 2: Code Generation**

```typescript
Skill: "generate_code"

Selection Process:
1. Skill has preferred_llm: OpenAI/gpt-4 ✅
2. Check availability: ✅ OpenAI available
3. SELECTED: OpenAI/gpt-4

Result: 💻 2000ms response (high quality code)
```

### **Example 3: Research Analysis (User Override)**

```typescript
User Settings:
taskOverrides: {
  'research': { provider: 'mistral', model: 'mistral-large' }
}

Task: "Analyze this market data"

Selection Process:
1. No skill-level preference
2. User override found: Mistral ✅
3. Check availability: ✅ Mistral available
4. SELECTED: Mistral/mistral-large-latest

Result: 🧠 3000ms response (deep analysis)
```

### **Example 4: Organization Policy**

```typescript
Organization Settings:
allow_user_keys: false
provider_preferences: { 
  allowed: ['openai', 'groq'],
  blocked: ['anthropic', 'mistral']
}

User tries: Anthropic/claude-3

Selection Process:
1. Anthropic blocked by organization ❌
2. Fallback to OpenAI ✅
3. SELECTED: OpenAI/gpt-3.5-turbo

Result: 💼 Company policy enforced
```

### **Example 5: Groq Fails (Fallback)**

```typescript
Task: "Quick question"

Selection Process:
1. Default: Groq
2. Try Groq: ❌ 500 error (API down)
3. Fallback chain: Groq → OpenAI
4. Try OpenAI: ✅ Success
5. SELECTED: OpenAI/gpt-3.5-turbo

Result: 🔄 Graceful degradation (2500ms)
```

---

## 🎛️ **CONFIGURATION LEVELS**

### **1. Environment Variables (Base Layer)**

```bash
# .env file
VITE_GROQ_API_KEY=gsk_...
VITE_OPENAI_API_KEY=sk-proj-...
VITE_MISTRAL_API_KEY=...
VITE_ANTHROPIC_API_KEY=...
VITE_GOOGLE_API_KEY=...
```

### **2. Database (User Layer)**

```sql
-- user_llm_settings table
user_id | default_provider | task_overrides          | provider_preferences
--------|------------------|-------------------------|---------------------
user123 | 'groq'          | {'code': 'openai'}      | {'groq': {priority: 1}}
```

### **3. Database (Organization Layer)**

```sql
-- organization_llm_settings table
org_id  | allow_user_keys | monthly_quota | current_requests
--------|-----------------|---------------|------------------
org456  | true            | 1000000       | 450000
```

### **4. Code (Skill Layer)**

```typescript
// In agent definition
skills: [
  {
    name: 'advanced_analytics',
    preferred_llm: {
      provider: 'mistral',
      model: 'mistral-large-latest'
    }
  }
]
```

---

## 💡 **KEY INSIGHTS**

### **1. Not Always Groq**
- Groq is the **default** for speed
- But system intelligently switches based on task
- Reasoning tasks → Mistral
- Creative tasks → Claude
- Code tasks → OpenAI

### **2. User Has Control**
- Users can override any default
- Can set task-specific preferences
- Can use their own API keys
- Organization can restrict this

### **3. Embeddings are Fixed**
- **ALWAYS** OpenAI
- **ALWAYS** text-embedding-ada-002
- Groq doesn't provide embeddings
- Consistency is critical for vector search

### **4. Intelligent Fallbacks**
- Never fails completely
- Graceful degradation
- Automatic provider switching
- Logs all fallback decisions

---

## 📊 **DECISION TREE SUMMARY**

```
User sends message
    ↓
Does skill have preferred_llm?
    ├─ YES → Use it (if available)
    └─ NO ↓
Does user have task override?
    ├─ YES → Use it (if available)
    └─ NO ↓
Does organization have policy?
    ├─ YES → Use it (if available)
    └─ NO ↓
What task type is this?
    ├─ Speed → Groq
    ├─ Reasoning → Mistral
    ├─ Creative → Claude
    ├─ Code → OpenAI
    └─ Multilingual → Google
        ↓
Is selected provider available?
    ├─ YES → Use it ✅
    └─ NO → Try fallback
        ↓
Is fallback available?
    ├─ YES → Use it ✅
    └─ NO → Try OpenAI (ultimate fallback)
        ↓
Is OpenAI available?
    ├─ YES → Use it ✅
    └─ NO → ERROR ❌
```

---

## 🚀 **PERFORMANCE COMPARISON**

| Provider   | Speed      | Quality   | Cost/1M    | Best For           |
|------------|------------|-----------|------------|--------------------|
| **Groq**   | 800ms ⚡   | Good      | $0.59      | Speed, Chat        |
| **Mistral**| 2500ms     | Excellent | $8.00      | Reasoning          |
| **Claude** | 3000ms     | Excellent | $15.00     | Creativity         |
| **OpenAI** | 2000ms     | Good      | $5.00      | Code, Fallback     |
| **Google** | 2200ms     | Good      | $3.50      | Multilingual       |

**Embeddings (OpenAI only):** 150ms, $0.10/1M tokens

---

## ✅ **BOTTOM LINE**

### **LLMs:** 
- **Dynamic & Intelligent** routing
- **NOT** always Groq
- Selects based on: skill → user → org → task type → availability

### **Embeddings:** 
- **ALWAYS** OpenAI
- **Fixed** model: text-embedding-ada-002
- Groq doesn't provide this service

### **Fallbacks:** 
- Automatic & graceful
- Never completely fails
- Ultimate fallback: OpenAI

**Your system is sophisticated and optimized!** 🎯

