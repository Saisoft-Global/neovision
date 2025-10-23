# 🎯 LLM Selection - Quick Reference Guide

## ❓ **IS IT ALWAYS GROQ?**

**NO!** The system intelligently selects the best LLM based on multiple factors.

---

## 🔀 **SELECTION HIERARCHY** (Highest to Lowest Priority)

```
1️⃣ Skill Preference      ← "This skill needs GPT-4"
         ↓ (if not set)
2️⃣ User Task Override    ← "I want Groq for code tasks"
         ↓ (if not set)
3️⃣ Organization Policy   ← "Company uses Mistral for analysis"
         ↓ (if not set)
4️⃣ Task Type AI Routing  ← System decides based on task
         ↓ (if not available)
5️⃣ User Default          ← "My favorite is OpenAI"
         ↓ (if not available)
6️⃣ System Default        ← "Use Groq for speed"
         ↓ (if fails)
7️⃣ Fallback Chain        ← "Try OpenAI as backup"
```

---

## 🎨 **TASK-TYPE AUTO-ROUTING**

The system **automatically** picks the best provider for each task type:

| Task Type          | Provider    | Model                    | Why?                  |
|--------------------|-------------|--------------------------|----------------------|
| 💬 **Chat**        | Groq        | llama3-70b-8192         | 10x faster (800ms)   |
| 🧠 **Research**    | Mistral     | mistral-large-latest    | Best reasoning       |
| ✍️ **Writing**     | Claude      | claude-3-opus           | Most creative        |
| 💻 **Code**        | OpenAI      | gpt-4                   | Best for coding      |
| 🌍 **Translation** | Google      | gemini-pro              | Best multilingual    |
| ⚡ **Real-time**   | Groq        | llama3-8b-8192          | Ultra-fast (400ms)   |

---

## 🔧 **HOW USERS CONTROL IT**

### **Option 1: Set Default Provider**
```typescript
User Settings:
  default_provider: 'groq'  // Use Groq for everything
```

### **Option 2: Task-Specific Overrides**
```typescript
User Settings:
  task_overrides: {
    'code': 'openai',      // OpenAI for code
    'research': 'mistral', // Mistral for research
    'chat': 'groq'         // Groq for chat
  }
```

### **Option 3: Skill-Level Preferences**
```typescript
Agent Configuration:
  skills: [
    {
      name: 'analyze_data',
      preferred_llm: {
        provider: 'mistral',
        model: 'mistral-large-latest'
      }
    }
  ]
```

### **Option 4: Provider Priority**
```typescript
User Settings:
  provider_preferences: {
    groq:     { enabled: true,  priority: 1 },
    mistral:  { enabled: true,  priority: 2 },
    openai:   { enabled: true,  priority: 3 },
    anthropic: { enabled: false, priority: 999 }
  }
```

---

## 📊 **EMBEDDINGS** (Separate from Chat LLMs)

### **ALWAYS OpenAI** 🔒

```
Chat Completions:
  ✅ Groq, Mistral, Claude, OpenAI, Google (dynamic)

Embeddings:
  ✅ OpenAI ONLY (text-embedding-ada-002)
  ❌ Groq doesn't provide embeddings
  ❌ Mistral doesn't provide embeddings
```

**Why?**
- Groq = Chat completions only
- Embeddings need consistency (same model = same dimensions)
- OpenAI ada-002 is industry standard

---

## 🔄 **FALLBACK SYSTEM**

Every provider has an automatic fallback:

```
Groq fails      → OpenAI ✅
Mistral fails   → OpenAI ✅
Claude fails    → OpenAI ✅
Google fails    → OpenAI ✅
OpenAI fails    → ERROR ❌ (ultimate fallback)
```

**Result:** System rarely fails completely!

---

## 💡 **REAL-WORLD EXAMPLES**

### Example 1: Simple Chat
```
User: "Hello, how are you?"

Selection:
  ├─ No skill preference
  ├─ Task type: "simple_tasks"
  ├─ Recommendation: Groq (speed)
  └─ SELECTED: Groq/llama3-70b-8192

Speed: ⚡ 800ms
```

### Example 2: Code Generation
```
Skill: generate_code
Skill Preference: OpenAI/gpt-4

Selection:
  ├─ Skill has preference ✅
  └─ SELECTED: OpenAI/gpt-4

Speed: 💻 2000ms (high quality)
```

### Example 3: User Override
```
User Settings:
  task_overrides: { 'research': 'mistral' }

Task: "Analyze this data"

Selection:
  ├─ No skill preference
  ├─ User override: Mistral ✅
  └─ SELECTED: Mistral/mistral-large-latest

Speed: 🧠 3000ms (deep analysis)
```

### Example 4: Groq Unavailable (Fallback)
```
Task: "Quick question"

Selection:
  ├─ Default: Groq
  ├─ Try Groq: ❌ API down
  ├─ Fallback: OpenAI ✅
  └─ SELECTED: OpenAI/gpt-3.5-turbo

Speed: 🔄 2500ms (graceful degradation)
```

---

## 🎯 **QUICK ANSWERS**

**Q: Is it always Groq?**  
A: No! It's dynamic based on task, user settings, and availability.

**Q: Can users choose their LLM?**  
A: Yes! Via default provider, task overrides, or provider preferences.

**Q: What about embeddings?**  
A: Always OpenAI. Groq doesn't provide embeddings.

**Q: What if Groq is down?**  
A: Auto-fallback to OpenAI. Users don't notice.

**Q: Can organizations control this?**  
A: Yes! Org can set policies, quotas, and allowed providers.

**Q: Which is fastest?**  
A: Groq (800ms) → Google (2200ms) → OpenAI (2000ms) → Mistral (2500ms) → Claude (3000ms)

**Q: Which is best quality?**  
A: Depends on task:
- Reasoning: Mistral > Claude > OpenAI
- Creative: Claude > Mistral > OpenAI  
- Code: OpenAI > Claude > Mistral
- Speed: Groq > All

---

## 📈 **PROVIDER COMPARISON**

| Provider    | Speed  | Quality   | Cost      | Best For        |
|-------------|--------|-----------|-----------|-----------------|
| **Groq**    | ⚡⚡⚡⚡⚡ | ⭐⭐⭐     | 💰        | Speed           |
| **Mistral** | ⚡⚡     | ⭐⭐⭐⭐⭐   | 💰💰💰     | Reasoning       |
| **Claude**  | ⚡⚡     | ⭐⭐⭐⭐⭐   | 💰💰💰💰   | Creativity      |
| **OpenAI**  | ⚡⚡⚡   | ⭐⭐⭐⭐    | 💰💰       | Code, Fallback  |
| **Google**  | ⚡⚡⚡   | ⭐⭐⭐⭐    | 💰💰       | Multilingual    |

---

## ✅ **BOTTOM LINE**

1. **Default:** Groq (speed)
2. **Smart Routing:** Auto-selects best provider per task
3. **User Control:** Full customization available
4. **Never Fails:** Automatic fallbacks
5. **Embeddings:** Always OpenAI (Groq doesn't have it)

**Your system is intelligent, not hardcoded!** 🎯

