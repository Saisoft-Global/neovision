# 🔧 Foundation Environment Configuration Guide

## 📝 **ADD THESE TO YOUR `.env` FILE:**

```bash
# ============================================
# PHASE 1 FOUNDATION - LLM PROVIDERS
# ============================================

# OpenAI (GPT-3.5, GPT-4)
VITE_OPENAI_API_KEY=sk-...

# Mistral AI (RECOMMENDED for research & analysis!)
VITE_MISTRAL_API_KEY=your-mistral-key
# Get from: https://console.mistral.ai/

# Anthropic Claude (Best for writing)
VITE_ANTHROPIC_API_KEY=your-claude-key
# Get from: https://console.anthropic.com/

# Google Gemini (Good for multimodal)
VITE_GOOGLE_API_KEY=your-google-key
# Get from: https://makersuite.google.com/app/apikey

# Groq (Ultra-fast inference)
VITE_GROQ_API_KEY=your-groq-key
# Get from: https://console.groq.com/

# Ollama (Local, free)
VITE_OLLAMA_BASE_URL=http://localhost:11434

# ============================================
# EXAMPLE AGENT CONFIGURATIONS
# ============================================

# Research Agent using Mistral:
{
  "name": "Research Assistant",
  "llm_config": {
    "provider": "mistral",
    "model": "mistral-large-latest"
  }
}

# Support Agent using cheap model:
{
  "name": "Support Bot",
  "llm_config": {
    "provider": "openai",
    "model": "gpt-3.5-turbo"
  }
}

# Multi-skilled Agent with overrides:
{
  "name": "Universal Assistant",
  "llm_config": {
    "provider": "openai",
    "model": "gpt-4-turbo"
  },
  "llm_overrides": {
    "research": {
      "provider": "mistral",
      "model": "mistral-large-latest"
    },
    "writing": {
      "provider": "anthropic",
      "model": "claude-3-opus-20240229"
    }
  },
  "fallback_llm": {
    "provider": "openai",
    "model": "gpt-3.5-turbo"
  }
}
```

## 🎯 **QUICK START:**

### **Minimal Setup (Just OpenAI):**
```bash
VITE_OPENAI_API_KEY=sk-your-key
```

### **Recommended Setup (Multi-LLM):**
```bash
VITE_OPENAI_API_KEY=sk-your-key
VITE_MISTRAL_API_KEY=your-mistral-key
VITE_ANTHROPIC_API_KEY=your-claude-key
```

### **Full Setup (All Providers):**
```bash
# Add all 6 LLM providers
```

**Just add the keys you want to use - the system adapts automatically!** ✅

