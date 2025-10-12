# 🚀 Core Skills Quick Start Guide

## TL;DR

**Every agent in xAgent now automatically gets 5 core intelligence skills** that enable natural language understanding and intelligent task completion. You don't need to do anything - it's automatic!

---

## What Changed?

### Before ❌
```typescript
// You had to manually add NLU skills to every agent
const agent = await factory.createAgent('hr', {
  skills: [
    { name: 'natural_language_understanding', level: 5 },  // Manual
    { name: 'task_comprehension', level: 5 },              // Manual
    { name: 'employee_onboarding', level: 5 },
    // ...
  ]
});
```

### After ✅
```typescript
// Core skills are automatically added!
const agent = await factory.createAgent('hr', {
  skills: [
    // Just add your agent-specific skills
    { name: 'employee_onboarding', level: 5 },
    { name: 'payroll_processing', level: 4 },
  ]
  // Core NLU skills are automatically included!
});

// Agent now has 7 skills total:
// - 5 core intelligence skills (auto-added)
// - 2 agent-specific skills (manually specified)
```

---

## The 5 Auto-Attached Core Skills

All agents automatically get these skills:

1. **Natural Language Understanding** (Level 5)
   - Understands user intent from natural language
   - Example: "Schedule a meeting" → Creates calendar event

2. **Natural Language Generation** (Level 5)
   - Generates human-like responses
   - Adjusts tone based on personality

3. **Task Comprehension** (Level 5)
   - Breaks down complex tasks into steps
   - Example: "Prepare report" → Data gather + Analysis + Generate

4. **Reasoning** (Level 4)
   - Logical problem-solving
   - Makes intelligent decisions

5. **Context Retention** (Level 4)
   - Remembers conversation history
   - Resolves references like "it", "that project"

---

## How to Use

### Creating an Agent (Automatic)

```typescript
import { AgentFactory } from './services/agent/AgentFactory';

const factory = AgentFactory.getInstance();

// Create any agent - core skills are automatically added
const agent = await factory.createAgent('customer_support', {
  personality: {
    friendliness: 1.0,
    formality: 0.6,
    proactiveness: 0.8,
    detail_orientation: 0.7,
  },
  skills: [
    // Only specify agent-SPECIFIC skills
    { name: 'ticket_management', level: 5 },
    { name: 'customer_communication', level: 5 },
  ],
  knowledge_bases: [],
  llm_config: {
    provider: 'openai',
    model: 'gpt-4-turbo-preview',
    temperature: 0.7,
  },
});

// Agent automatically has core skills + your specific skills!
```

### Checking Agent Capabilities

```typescript
// Check for a specific skill
if (agent.hasSkill('natural_language_understanding', 5)) {
  console.log('Agent has expert-level NLU ✓');
}

// Get all core capabilities
const coreCapabilities = agent.getCoreCapabilities();
console.log('Core skills:', coreCapabilities);
// Output: ['natural_language_understanding', 'natural_language_generation', 
//          'task_comprehension', 'reasoning', 'context_retention']

// Get all skills (core + specific)
const allSkills = agent.getSkills();
console.log('Total skills:', allSkills.length); // 7 (5 core + 2 specific)
```

---

## UI Changes

The **Agent Builder UI** now shows two sections:

### 1. Core Intelligence Skills (Purple Section)
- Read-only display of auto-attached core skills
- Shows skill level with purple stars
- Includes descriptions
- Badge: "Auto-attached"

### 2. Agent-Specific Skills (Editable Section)
- Add/edit/remove your custom skills
- Yellow stars for skill levels
- Fully customizable

---

## Example Scenarios

### Scenario 1: Simple Chat
```typescript
// User says: "What's the weather like?"
// Agent uses:
// - NLU to understand the query
// - Reasoning to determine it needs weather data
// - NLG to respond naturally
```

### Scenario 2: Complex Task
```typescript
// User says: "Prepare Q4 financial report for the board"
// Agent uses:
// - NLU to understand the request
// - Task Comprehension to break into: gather data → analyze → format → generate
// - Reasoning to determine board-appropriate detail level
// - Context Retention to remember previous board reports
// - NLG to create professional report
```

### Scenario 3: Conversational Context
```typescript
// User: "Create a new project called Alpha"
// Agent: "Project Alpha created"
// User: "Add John to it"  // "it" refers to Alpha
// Agent uses:
// - Context Retention to remember "it" = Project Alpha
// - NLU to understand the action
// - NLG to confirm: "John added to Project Alpha"
```

---

## For Existing Agents

**No migration needed!** Existing agents in your database will automatically receive core skills when loaded:

```typescript
// Loading an old agent that was created before this feature
const oldAgent = await factory.getAgent('old-agent-id-123');

// oldAgent now has core skills automatically!
console.log(oldAgent.getCoreCapabilities());
// Works perfectly!
```

---

## Developer Benefits

✅ **Less Boilerplate** - Don't manually add core skills to every agent  
✅ **Consistency** - All agents have same foundational intelligence  
✅ **Maintainability** - Update core skills in one place  
✅ **Type Safety** - Full TypeScript support  
✅ **Backward Compatible** - Existing agents work without changes  

---

## FAQs

### Q: Can I remove core skills?
**A:** No, core skills are required for all agents and cannot be removed. They're the foundation of agent intelligence.

### Q: Can I override core skill levels?
**A:** No, core skills are standardized. Focus on adding agent-specific skills.

### Q: Will this break my existing agents?
**A:** No! Existing agents automatically get core skills when loaded. No migration needed.

### Q: Can I add more core skills?
**A:** Yes! Edit `CORE_AGENT_SKILLS` in `AgentFactory.ts`. See full documentation for details.

### Q: Do I need to update my agent templates?
**A:** No, but they'll work better! The system automatically enriches all agents.

---

## Next Steps

1. ✅ **Start creating agents** - Core skills are automatic
2. ✅ **Focus on specific skills** - Add only what makes your agent unique
3. ✅ **Check the UI** - See core skills in the Agent Builder
4. ✅ **Test capabilities** - Use `hasSkill()` and `getCoreCapabilities()`

For detailed documentation, see: **CORE_INTELLIGENCE_SKILLS_SYSTEM.md**

---

**You're all set!** Every agent now has the intelligence to understand natural language and complete work effectively. 🎉


