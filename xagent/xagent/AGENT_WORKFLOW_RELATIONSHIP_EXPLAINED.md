# 🔗 AGENT-WORKFLOW RELATIONSHIP - How They're Connected

## 🎯 **YOUR QUESTION:**
> "How are agents in the agent builder associated with workflows in our current setup?"

---

## ✅ **ANSWER: Many-to-Many Relationship via Database**

Your platform uses a **database-level association**, not inline storage. This is actually a **BETTER architecture**!

---

## 🏗️ **CURRENT ARCHITECTURE:**

### **Database Schema:**

```sql
┌─────────────────────────────────────────────────┐
│            agents table                          │
├─────────────────────────────────────────────────┤
│ id             | uuid (PK)                       │
│ name           | text                            │
│ type           | text                            │
│ config         | jsonb (personality, skills)     │
│ status         | text                            │
│ created_by     | uuid (user_id)                  │
└─────────────────┬───────────────────────────────┘
                  │
                  │ many-to-many relationship
                  │
┌─────────────────▼───────────────────────────────┐
│        agent_workflows table (junction)         │
├─────────────────────────────────────────────────┤
│ id             | uuid (PK)                       │
│ agent_id       | uuid (FK → agents)              │
│ workflow_id    | uuid (FK → workflows)           │
│ created_at     | timestamptz                     │
└─────────────────┬───────────────────────────────┘
                  │
                  │
┌─────────────────▼───────────────────────────────┐
│            workflows table                       │
├─────────────────────────────────────────────────┤
│ id             | uuid (PK)                       │
│ name           | text                            │
│ description    | text                            │
│ nodes          | jsonb (workflow steps)          │
│ connections    | jsonb (flow connections)        │
│ created_by     | uuid (user_id)                  │
└─────────────────────────────────────────────────┘
```

---

## 🔄 **HOW IT WORKS:**

### **Step 1: Workflows Exist Independently**

```
Workflow Table (Standalone):
┌──────────────────────────────────────────────┐
│ ID: workflow-001                             │
│ Name: "Employee Onboarding"                  │
│ Nodes: [                                     │
│   { step: "Create Email", action: "..." },   │
│   { step: "Create HR Profile", action: "..." }│
│   { step: "Schedule Orientation", ... },     │
│   { step: "Send Welcome", ... }              │
│ ]                                            │
│ Created by: user-123                         │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ ID: workflow-002                             │
│ Name: "Leave Request Processing"             │
│ Nodes: [...]                                 │
└──────────────────────────────────────────────┘
```

These workflows can be:
- Created in `/workflows` page (standalone)
- Reused by multiple agents
- Shared across the platform

---

### **Step 2: Agent Created**

```
Agent Table:
┌──────────────────────────────────────────────┐
│ ID: agent-001                                │
│ Name: "HR Assistant"                         │
│ Type: "hr"                                   │
│ Config: {                                    │
│   personality: { ... },                      │
│   skills: [ ... ],                           │
│   llm_config: { ... }                        │
│ }                                            │
│ Created by: user-123                         │
└──────────────────────────────────────────────┘

Note: Workflows NOT stored in config!
```

---

### **Step 3: Association Created**

```
Agent_Workflows Table (Junction):
┌──────────────────────────────────────────────┐
│ agent_id: agent-001                          │
│ workflow_id: workflow-001 (Employee Onboard) │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ agent_id: agent-001                          │
│ workflow_id: workflow-002 (Leave Request)    │
└──────────────────────────────────────────────┘
```

**This links:** HR Assistant → 2 workflows

---

### **Step 4: Runtime Execution**

```
User chats with HR Assistant:
"Onboard new employee John"

1. Agent recognizes intent: "onboarding"

2. Query database:
   SELECT w.* FROM workflows w
   JOIN agent_workflows aw ON w.id = aw.workflow_id
   WHERE aw.agent_id = 'agent-001'
   AND w.name LIKE '%onboard%'

3. Found: "Employee Onboarding" workflow

4. Execute workflow:
   - Create email
   - Create HR profile
   - Schedule orientation
   - Send welcome

5. Return result to user
```

---

## 🎨 **VISUAL DATA FLOW:**

```
┌────────────────────────────────────────────────────────┐
│              AGENT BUILDER (UI)                         │
├────────────────────────────────────────────────────────┤
│                                                         │
│  1. User Creates Agent                                 │
│     ├─ Name: "HR Assistant"                            │
│     ├─ Personality: { ... }                            │
│     ├─ Skills: [ ... ]                                 │
│     └─ LLM: { ... }                                    │
│                                                         │
│  2. User Attaches Workflows (Optional)                 │
│     ├─ Browse available workflows                      │
│     ├─ Select: "Employee Onboarding"                   │
│     ├─ Select: "Leave Request Processing"              │
│     └─ Or: [Create New Workflow]                       │
│                                                         │
│  3. Click "Save Agent"                                 │
│                                                         │
└────────────────────┬───────────────────────────────────┘
                     ↓
┌────────────────────▼───────────────────────────────────┐
│                DATABASE WRITES                          │
├────────────────────────────────────────────────────────┤
│                                                         │
│  Write #1: Insert into agents table                    │
│  ┌──────────────────────────────────────────────────┐ │
│  │ INSERT INTO agents (id, name, type, config)      │ │
│  │ VALUES ('agent-001', 'HR Assistant', 'hr', {...})│ │
│  └──────────────────────────────────────────────────┘ │
│                                                         │
│  Write #2: Link workflows (for each selected)          │
│  ┌──────────────────────────────────────────────────┐ │
│  │ INSERT INTO agent_workflows                      │ │
│  │ (agent_id, workflow_id)                          │ │
│  │ VALUES                                            │ │
│  │   ('agent-001', 'workflow-001'),                 │ │
│  │   ('agent-001', 'workflow-002')                  │ │
│  └──────────────────────────────────────────────────┘ │
│                                                         │
└────────────────────┬───────────────────────────────────┘
                     ↓
              ✅ Agent Saved!
              ✅ Workflows Linked!
```

---

## 🔍 **HOW WORKFLOWS ARE RETRIEVED AT RUNTIME:**

```typescript
// When agent needs to execute a workflow:

// File: src/services/agent/templates/TemplateManager.ts (Lines 77-93)

async setupDefaultWorkflows(agentId: string, template: AgentTemplate) {
  // 1. Find workflows by name
  const { data: workflows } = await supabase
    .from('workflow_templates')
    .select('*')
    .in('name', template.defaultWorkflows);

  // 2. Create links in agent_workflows table
  if (workflows) {
    await supabase
      .from('agent_workflows')
      .insert(
        workflows.map(workflow => ({
          agent_id: agentId,        // ← Links agent
          workflow_id: workflow.id  // ← to workflow
        }))
      );
  }
}
```

---

## 📊 **EXAMPLE: Real Data Flow**

### **Scenario: Create HR Assistant**

#### **Database State BEFORE:**

```
agents table:
  (empty)

workflows table:
  ┌──────────────────────────────────────┐
  │ id: wf-001                           │
  │ name: "Employee Onboarding"          │
  └──────────────────────────────────────┘
  ┌──────────────────────────────────────┐
  │ id: wf-002                           │
  │ name: "Leave Request"                │
  └──────────────────────────────────────┘

agent_workflows table:
  (empty)
```

#### **User Creates Agent:**

```javascript
// In Agent Builder:
{
  name: "HR Assistant",
  type: "hr",
  personality: { ... },
  skills: [ ... ],
  workflows: [] // ← This is passed to WorkflowDesigner component
}

// User clicks "Attach Workflow" in WorkflowDesigner
// Selects: "Employee Onboarding", "Leave Request"
```

#### **Database State AFTER:**

```
agents table:
  ┌──────────────────────────────────────┐
  │ id: agent-001                        │
  │ name: "HR Assistant"                 │
  │ type: "hr"                           │
  │ config: { personality, skills, llm } │
  └──────────────────────────────────────┘

workflows table:
  (unchanged - workflows already existed)

agent_workflows table: (NEW!)
  ┌──────────────────────────────────────┐
  │ agent_id: agent-001                  │
  │ workflow_id: wf-001                  │
  └──────────────────────────────────────┘
  ┌──────────────────────────────────────┐
  │ agent_id: agent-001                  │
  │ workflow_id: wf-002                  │
  └──────────────────────────────────────┘
```

**Result:** HR Assistant is now linked to 2 workflows!

---

## 🔄 **HOW WORKFLOWS ARE USED BY AGENTS:**

### **Runtime Flow:**

```
User: "Onboard John Doe"
  ↓
1. Message goes to HR Assistant (agent-001)
  ↓
2. Agent analyzes intent: "onboarding"
  ↓
3. Agent queries for its workflows:
   
   SELECT w.*
   FROM workflows w
   JOIN agent_workflows aw ON w.id = aw.workflow_id
   WHERE aw.agent_id = 'agent-001'
   AND w.name LIKE '%onboard%'
  ↓
4. Found: "Employee Onboarding" workflow
  ↓
5. Agent executes workflow nodes in sequence:
   Node 1: Create email ✅
   Node 2: Create HR profile ✅
   Node 3: Schedule orientation ✅
   Node 4: Send welcome ✅
  ↓
6. Return success to user
```

---

## 💡 **KEY INSIGHTS:**

### **1. Workflows are SHARED Resources**

```
One workflow can be used by multiple agents:

"Leave Request" workflow
  ├─► Used by: HR Assistant
  ├─► Used by: Manager Assistant
  └─► Used by: Payroll Agent

Benefit: Create once, use everywhere!
```

### **2. Agents Don't "Own" Workflows**

```
❌ WRONG: Workflow stored IN agent config
✅ RIGHT: Workflow linked TO agent via junction table

Why better?
  - Workflows can be updated centrally
  - Multiple agents can share workflows
  - Easier to manage and version
```

### **3. Workflows are Templates**

```
Think of workflows as:
  "Reusable procedure templates"

Not:
  "Agent-specific code"
```

---

## 🔧 **HOW IT WORKS IN YOUR CODE:**

### **In AgentBuilder Component:**

```typescript
// File: src/components/agent-builder/AgentBuilder.tsx (Line 66-68)

<WorkflowDesigner
  workflows={config.workflows}  // ← Array of workflow IDs
  onChange={(workflows) => updateConfig({ workflows })}
/>
```

**What `config.workflows` contains:**
```typescript
// NOT the full workflow objects
// Just an array of workflow IDs or references

config.workflows = [
  'workflow-001',  // Employee Onboarding
  'workflow-002'   // Leave Request
]
```

### **When Agent is Saved:**

```typescript
// Pseudo-code based on TemplateManager.ts

async saveAgent(agentConfig) {
  // 1. Save agent to agents table
  const agent = await supabase
    .from('agents')
    .insert({
      name: agentConfig.name,
      type: agentConfig.type,
      config: {
        personality: agentConfig.personality,
        skills: agentConfig.skills,
        llm_config: agentConfig.llm_config
        // Note: workflows NOT stored here!
      }
    });

  // 2. Link workflows to agent
  if (agentConfig.workflows) {
    await supabase
      .from('agent_workflows')
      .insert(
        agentConfig.workflows.map(workflowId => ({
          agent_id: agent.id,
          workflow_id: workflowId
        }))
      );
  }
}
```

---

## 📊 **COMPLETE DATA MODEL:**

```
┌─────────────────────────────────────────────────────────┐
│                     USER                                 │
│                  (user-123)                              │
└────────┬────────────────────────────────────────────────┘
         │
         │ creates
         ↓
┌────────▼────────────────────────────────────────────────┐
│                   AGENTS                                 │
├─────────────────────────────────────────────────────────┤
│  Agent 1: HR Assistant                                  │
│  ├─ ID: agent-001                                       │
│  ├─ Type: hr                                            │
│  ├─ Personality: { ... }                                │
│  ├─ Skills: [ ... ]                                     │
│  └─ LLM: { provider: 'openai', model: 'gpt-4' }        │
│                                                         │
│  Agent 2: Sales Assistant                               │
│  └─ ID: agent-002                                       │
└─────────┬───────────────────────────────────────────────┘
          │
          │ can use (many-to-many)
          ↓
┌─────────▼───────────────────────────────────────────────┐
│              AGENT_WORKFLOWS (Links)                     │
├─────────────────────────────────────────────────────────┤
│  agent-001 ←→ workflow-001 (Onboarding)                │
│  agent-001 ←→ workflow-002 (Leave Request)             │
│  agent-002 ←→ workflow-003 (Lead Qualification)        │
│  agent-002 ←→ workflow-001 (Onboarding) ← Shared!      │
└─────────┬───────────────────────────────────────────────┘
          │
          │ references
          ↓
┌─────────▼───────────────────────────────────────────────┐
│                  WORKFLOWS (Templates)                   │
├─────────────────────────────────────────────────────────┤
│  Workflow 1: Employee Onboarding                        │
│  ├─ ID: workflow-001                                    │
│  ├─ Nodes: [ Create Email, HR Profile, ... ]           │
│  └─ Used by: agent-001, agent-002                       │
│                                                         │
│  Workflow 2: Leave Request Processing                   │
│  ├─ ID: workflow-002                                    │
│  └─ Used by: agent-001 only                             │
│                                                         │
│  Workflow 3: Lead Qualification                         │
│  └─ ID: workflow-003                                    │
│      └─ Used by: agent-002 only                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 **IN THE AGENT BUILDER:**

### **What Happens When You Use WorkflowDesigner Component:**

```typescript
// In AgentBuilder.tsx (Line 66-68):

<WorkflowDesigner
  workflows={config.workflows}
  onChange={(workflows) => updateConfig({ workflows })}
/>
```

**This component allows you to:**

1. **Browse Available Workflows**
   ```
   Shows all workflows from `workflows` table
   that you have access to
   ```

2. **Attach Workflows to Agent**
   ```
   Select checkboxes:
   ☑ Employee Onboarding
   ☑ Leave Request Processing
   ☐ Sales Pipeline
   
   Updates: config.workflows = ['wf-001', 'wf-002']
   ```

3. **Create New Workflow**
   ```
   Opens visual workflow designer
   Saves new workflow to `workflows` table
   Auto-links to current agent
   ```

4. **Design/Edit Workflows**
   ```
   Visual node-based editor
   Drag & drop workflow steps
   Save changes to `workflows` table
   ```

---

## 🔑 **KEY BENEFITS OF THIS ARCHITECTURE:**

### **1. Reusability** ♻️

```
One Workflow → Multiple Agents

Example:
  "Email Response" workflow
  ├─ Used by: Customer Support Agent
  ├─ Used by: Sales Agent
  └─ Used by: HR Agent

Update workflow once → All agents get update!
```

### **2. Modularity** 🧩

```
Agents and Workflows are separate concerns:

Agent = WHO (personality, skills, role)
Workflow = WHAT (procedures, automation)

You can:
  - Create agents without workflows
  - Create workflows without agents
  - Mix and match later
```

### **3. Sharing & Collaboration** 👥

```
Team Member A creates workflows
Team Member B creates agents
Team Member B attaches A's workflows to agents

Workflows become organizational assets!
```

### **4. Version Control** 📝

```
Workflow Table has:
  - created_at
  - updated_at
  - version (if you add it)

You can:
  - Track workflow changes
  - Rollback if needed
  - A/B test different workflows
```

---

## 🎨 **CURRENT IMPLEMENTATION STATUS:**

### **What's Implemented:** ✅

```
✅ workflows table (database)
✅ agent_workflows junction table (database)
✅ WorkflowDesigner component (UI)
✅ WorkflowDesigner in AgentBuilder (UI)
✅ TemplateManager.setupDefaultWorkflows() (backend logic)
```

### **What's Missing:** ⚠️

```
⚠️ config.workflows is passed but not in AgentConfig type
⚠️ Workflow attachment logic in useAgentBuilder
⚠️ Workflow query/fetch in WorkflowDesigner
⚠️ Runtime workflow execution by agents
```

---

## 🔧 **TO MAKE IT FULLY FUNCTIONAL:**

### **Option 1: Complete the Implementation** (Recommended if you need workflows)

Add workflows to AgentConfig type:

```typescript
// src/types/agent-framework.ts

export const AgentConfigSchema = z.object({
  personality: AgentPersonalitySchema,
  skills: z.array(AgentSkillSchema),
  knowledge_bases: z.array(AgentKnowledgeBaseSchema),
  llm_config: z.object({
    provider: z.enum(['openai', 'rasa', 'ollama', 'groq']),
    model: z.string(),
    temperature: z.number().min(0).max(1),
  }),
  workflows: z.array(z.string()).optional(), // ← ADD THIS
});
```

Then implement workflow linking in useAgentBuilder:

```typescript
const saveAgent = async () => {
  // ... validation ...
  
  const factory = AgentFactory.getInstance();
  const agent = await factory.createAgent('custom', config);
  
  // Link workflows
  if (config.workflows && config.workflows.length > 0) {
    await supabase
      .from('agent_workflows')
      .insert(
        config.workflows.map(workflowId => ({
          agent_id: agent.id,
          workflow_id: workflowId
        }))
      );
  }
};
```

---

### **Option 2: Remove Workflows from Agent Builder** (Simpler)

```typescript
// Keep agent creation simple
// Separate workflows completely

Agent Builder → Creates agents only
Workflow Designer → Creates workflows only
Agents Page → Link agents to workflows later
```

---

## 🎯 **MY RECOMMENDATION:**

### **For Your Current State:**

```
SIMPLE BUILDER:
  ❌ Remove WorkflowDesigner component
  └─ Too complex for simple mode
  └─ Most users won't use workflows

ADVANCED BUILDER:
  ✅ Keep WorkflowDesigner component
  └─ But make it work properly:
     1. Add workflows to AgentConfig type
     2. Implement workflow attachment logic
     3. Show available workflows from database
     4. Allow create/attach/detach

STANDALONE WORKFLOWS PAGE:
  ✅ Keep /workflows route
  └─ For creating workflows independently
  └─ Can reference agents in workflow nodes
```

---

## ✅ **SUMMARY:**

### **"How are agents associated with workflows?"**

**Current Architecture:**
```
1. Workflows exist in `workflows` table (independent)
2. Agents exist in `agents` table (independent)
3. Association via `agent_workflows` junction table
4. Many-to-many relationship (one agent → many workflows)
5. WorkflowDesigner component in UI (but logic incomplete)
```

**Status:**
- ✅ Database schema exists
- ✅ UI components exist
- ⚠️ Linking logic incomplete
- ⚠️ Type definitions incomplete

**Recommendation:**
- For now: **Skip workflows in agent builder**
- Focus on: Core agent creation (personality, skills, LLM, KB)
- Later: Complete workflow integration if needed

---

**Want me to:**
1. **Remove workflows from Simple Builder** (clean it up)
2. **Complete workflow implementation** (make it work)
3. **Leave as-is** (current state)

**What would you prefer?** 🎯
