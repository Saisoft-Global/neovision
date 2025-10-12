# 🧠 Core Intelligence Skills System

## Overview

Every agent in the xAgent platform is **automatically equipped with core intelligence skills** that enable natural language understanding, reasoning, and intelligent task completion. These skills are foundational and ensure all agents can understand human intent and complete work effectively.

---

## 🎯 Core Skills Automatically Attached to ALL Agents

When any agent is created via `AgentFactory`, it automatically receives these 5 core skills:

### 1. **Natural Language Understanding** (Level 5)
- **Purpose**: Understand and process natural language inputs from users
- **Capabilities**:
  - Intent recognition
  - Context awareness
  - Semantic understanding
- **Example**: Understanding "Schedule a meeting next Tuesday" means the user wants to create a calendar event

### 2. **Natural Language Generation** (Level 5)
- **Purpose**: Generate human-like responses in natural language
- **Capabilities**:
  - Contextual response generation
  - Tone adjustment based on personality
  - Clarity optimization
- **Example**: Responding naturally to user queries with appropriate tone and context

### 3. **Task Comprehension** (Level 5)
- **Purpose**: Understand and decompose complex tasks
- **Capabilities**:
  - Goal extraction from user requests
  - Step planning and sequencing
  - Dependency analysis
- **Example**: Breaking down "Prepare quarterly report" into data gathering, analysis, and report generation steps

### 4. **Reasoning** (Level 4)
- **Purpose**: Logical reasoning and problem-solving
- **Capabilities**:
  - Deductive reasoning (from general to specific)
  - Inductive reasoning (from specific to general)
  - Causal analysis (understanding cause and effect)
- **Example**: Inferring that if a task is urgent and the agent is busy, it should prioritize or delegate

### 5. **Context Retention** (Level 4)
- **Purpose**: Maintain and use conversation context
- **Capabilities**:
  - Memory recall from previous interactions
  - Context continuity across conversation turns
  - Reference resolution (understanding "it", "that", etc.)
- **Example**: Remembering the project discussed 3 messages ago when user says "Add John to that project"

---

## 🏗️ Architecture

### How It Works

```
┌─────────────────────────────────────────────────────────┐
│                    AgentFactory                          │
│                                                          │
│  1. Agent Creation Request                              │
│     ↓                                                    │
│  2. enrichConfigWithCoreSkills()                        │
│     - Adds 5 core intelligence skills                   │
│     - Merges with agent-specific skills                 │
│     - Prevents duplicates                               │
│     ↓                                                    │
│  3. instantiateAgent()                                  │
│     ↓                                                    │
│  4. Agent with Full Capabilities                        │
│     [Core Skills + Specific Skills]                     │
└─────────────────────────────────────────────────────────┘
```

### Implementation Details

**File**: `src/services/agent/AgentFactory.ts`

```typescript
const CORE_AGENT_SKILLS: AgentSkill[] = [
  { name: 'natural_language_understanding', level: 5, config: {...} },
  { name: 'natural_language_generation', level: 5, config: {...} },
  { name: 'task_comprehension', level: 5, config: {...} },
  { name: 'reasoning', level: 4, config: {...} },
  { name: 'context_retention', level: 4, config: {...} }
];

// Automatically merges core skills when creating any agent
private enrichConfigWithCoreSkills(config: AgentConfig): AgentConfig {
  return {
    ...config,
    skills: [...CORE_AGENT_SKILLS, ...config.skills]
  };
}
```

---

## 💻 How to Use

### For Agent Developers

#### 1. **Creating an Agent** (Core Skills Added Automatically)

```typescript
import { AgentFactory } from './services/agent/AgentFactory';

const factory = AgentFactory.getInstance();

// Create an HR agent - core skills are automatically included
const hrAgent = await factory.createAgent('hr', {
  personality: {
    friendliness: 0.8,
    formality: 0.7,
    proactiveness: 0.6,
    detail_orientation: 0.9,
  },
  skills: [
    // Only specify agent-SPECIFIC skills
    { name: 'employee_onboarding', level: 5 },
    { name: 'payroll_processing', level: 4 },
    // Core skills are automatically added, no need to include them here!
  ],
  knowledge_bases: [],
  llm_config: {
    provider: 'openai',
    model: 'gpt-4-turbo-preview',
    temperature: 0.7,
  },
});

// Agent will have 7 total skills:
// - 5 core skills (automatically added)
// - 2 specific skills (manually specified)
```

#### 2. **Checking Agent Capabilities**

```typescript
// Check if agent has a specific skill
if (agent.hasSkill('natural_language_understanding', 5)) {
  console.log('Agent has expert-level NLU');
}

// Get all core capabilities
const coreCapabilities = agent.getCoreCapabilities();
console.log(coreCapabilities);
// Output: ['natural_language_understanding', 'natural_language_generation', 
//          'task_comprehension', 'reasoning', 'context_retention']

// Get all skills (core + specific)
const allSkills = agent.getSkills();
console.log(allSkills.map(s => s.name));
```

#### 3. **Skills in Action** (Automatic via BaseAgent)

The `BaseAgent` class automatically leverages these skills:

```typescript
// When you call generateResponse(), the system prompt includes:
// "You have advanced natural language understanding, task comprehension, 
//  reasoning, and context retention abilities. Use these to understand 
//  user intent deeply and provide intelligent, contextual responses."

const response = await agent.generateResponse(
  "Schedule a meeting with the design team next week",
  context
);
// Agent uses NLU to understand intent, task comprehension to break down steps,
// reasoning to find optimal time, and generates natural language response
```

---

## 🎨 UI Integration

### Displaying Skills in Agent Builder

The `SkillsSelector` component shows both core and specific skills:

```typescript
// In your agent builder UI
<SkillsSelector 
  skills={agent.getSkills()} // Includes all skills
  onChange={handleSkillChange}
/>
```

**Note**: Core skills are read-only in the UI (they're always present and can't be removed).

---

## 🔧 Customization

### Adding New Core Skills

To add a new core skill that ALL agents should have:

1. **Update `CORE_AGENT_SKILLS` in `AgentFactory.ts`**:

```typescript
const CORE_AGENT_SKILLS: AgentSkill[] = [
  // ... existing core skills
  {
    name: 'emotional_intelligence',
    level: 4,
    config: {
      description: 'Ability to understand and respond to user emotions',
      capabilities: ['sentiment_analysis', 'empathy_generation', 'tone_adaptation']
    }
  }
];
```

2. **Update `getCoreCapabilities()` in `BaseAgent.ts`**:

```typescript
public getCoreCapabilities(): string[] {
  const coreSkills = this.config.skills.filter(skill => 
    ['natural_language_understanding', 'natural_language_generation', 
     'task_comprehension', 'reasoning', 'context_retention',
     'emotional_intelligence' // Add new skill here
    ].includes(skill.name)
  );
  return coreSkills.map(skill => skill.name);
}
```

### Upgrading Existing Agents

Existing agents in the database will automatically receive core skills when loaded:

```typescript
// When calling getAgent(), core skills are automatically enriched
const agent = await factory.getAgent(agentId);
// Agent now has core skills even if it was created before this feature
```

---

## 🧪 Testing

### Verify Core Skills Are Present

```typescript
import { AgentFactory } from './services/agent/AgentFactory';

describe('Core Intelligence Skills', () => {
  it('should automatically add core skills to new agents', async () => {
    const factory = AgentFactory.getInstance();
    
    const agent = await factory.createAgent('test', {
      personality: { /* ... */ },
      skills: [{ name: 'custom_skill', level: 3 }],
      knowledge_bases: [],
      llm_config: { /* ... */ }
    });
    
    // Verify core skills are present
    expect(agent.hasSkill('natural_language_understanding')).toBe(true);
    expect(agent.hasSkill('natural_language_generation')).toBe(true);
    expect(agent.hasSkill('task_comprehension')).toBe(true);
    expect(agent.hasSkill('reasoning')).toBe(true);
    expect(agent.hasSkill('context_retention')).toBe(true);
    
    // Verify custom skill is also present
    expect(agent.hasSkill('custom_skill')).toBe(true);
    
    // Total skills should be 6 (5 core + 1 custom)
    expect(agent.getSkills().length).toBe(6);
  });
});
```

---

## 📊 Benefits

### ✅ Consistency
- Every agent has the same foundational intelligence capabilities
- Predictable behavior across all agent types

### ✅ No Boilerplate
- Developers don't need to remember to add core skills
- Focus on agent-specific capabilities only

### ✅ Maintainability
- Core skills defined in one place (`AgentFactory`)
- Easy to update or enhance core capabilities platform-wide

### ✅ Backward Compatibility
- Existing agents automatically get core skills when loaded
- No migration scripts needed

### ✅ Type Safety
- Skills are typed via `AgentSkill` interface
- TypeScript ensures correct structure

---

## 🚀 Examples

### Example 1: HR Assistant with Core Skills

```typescript
const hrAgent = await factory.createAgent('hr', {
  personality: { friendliness: 0.8, formality: 0.7, proactiveness: 0.6, detail_orientation: 0.9 },
  skills: [
    { name: 'employee_onboarding', level: 5 },
    { name: 'benefits_administration', level: 4 }
  ],
  // ... rest of config
});

// Agent can now:
// ✓ Understand "Can you help me with my 401k?" (NLU)
// ✓ Comprehend the task involves benefits lookup (Task Comprehension)
// ✓ Reason about which benefit documents to retrieve (Reasoning)
// ✓ Remember user's previous benefits questions (Context Retention)
// ✓ Generate a helpful, contextual response (NLG)
```

### Example 2: Finance Agent with Core Skills

```typescript
const financeAgent = await factory.createAgent('finance', {
  personality: { friendliness: 0.6, formality: 0.9, proactiveness: 0.7, detail_orientation: 1.0 },
  skills: [
    { name: 'financial_analysis', level: 5 },
    { name: 'expense_tracking', level: 4 }
  ],
  // ... rest of config
});

// Agent can now:
// ✓ Understand complex financial queries (NLU)
// ✓ Break down "Analyze Q4 expenses" into data retrieval + analysis + reporting (Task Comprehension)
// ✓ Apply financial reasoning rules (Reasoning)
// ✓ Remember previous reports user requested (Context Retention)
// ✓ Generate clear financial summaries (NLG)
```

---

## 🎓 Best Practices

### DO ✅
- Let `AgentFactory` handle core skills automatically
- Only specify agent-specific skills in templates/config
- Use `agent.hasSkill()` to check for capabilities before executing specialized actions
- Document agent-specific skills clearly

### DON'T ❌
- Don't manually add core skills to agent configs (they're automatic)
- Don't remove or override core skills (they're protected)
- Don't assume skills beyond core + specified (check with `hasSkill()`)

---

## 🔗 Related Files

- **`src/services/agent/AgentFactory.ts`** - Core skills definition and injection
- **`src/services/agent/BaseAgent.ts`** - Core skills usage and methods
- **`src/services/agent/templates/AgentTemplate.ts`** - Agent templates documentation
- **`src/types/agent-framework.ts`** - Skill type definitions
- **`src/components/agent-builder/SkillsSelector.tsx`** - UI for managing skills

---

## 📞 Support

For questions or issues with the core intelligence skills system, refer to:
- This documentation
- Code comments in `AgentFactory.ts` and `BaseAgent.ts`
- Platform architecture documentation


