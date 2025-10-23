# 🚀 **ENHANCED AGENT FACTORY USAGE GUIDE**
## **Single Factory with Workforce Capabilities**

---

## 🎯 **WHAT CHANGED**

Your existing `AgentFactory` now has **workforce capabilities** built-in! No need for separate factories.

### **✅ What You Get:**
- **All existing functionality** - Your current code works unchanged
- **Workforce capabilities** - When you need escalation and hierarchy
- **Single factory** - No confusion about which factory to use
- **Backward compatible** - No breaking changes

---

## 🚀 **USAGE EXAMPLES**

### **1. Simple Agent (Existing Functionality)**
```typescript
import { AgentFactory } from './services/agent/AgentFactory';

const factory = AgentFactory.getInstance();

// Create simple agent (same as before)
const simpleAgent = await factory.createToolEnabledAgent({
  name: 'Email Agent',
  type: 'email',
  description: 'Handles email processing',
  // ... your existing config
}, tools);

// Use normally
const result = await simpleAgent.processMessage(message, context);
```

### **2. Workforce Agent (New Capability)**
```typescript
import { AgentFactory } from './services/agent/AgentFactory';

const factory = AgentFactory.getInstance();

// Create workforce-aware agent
const workforceAgent = await factory.createWorkforceAgent({
  name: 'Email Agent',
  type: 'email',
  description: 'Handles email processing',
  // ... your existing config
  workforce: {
    level: 'worker',
    department: 'Communications',
    confidenceThreshold: 0.8,
    maxComplexity: 4,
    aiSupervisor: 'ai-communications-manager'
  }
}, tools);

// Use with automatic escalation
const result = await workforceAgent.processMessage(message, context);
if (result.escalated) {
  console.log('Task escalated:', result.reason);
  // Handle escalation...
}
```

### **3. Pre-configured Workforce**
```typescript
import { AgentFactory } from './services/agent/AgentFactory';

const factory = AgentFactory.getInstance();

// Create all pre-configured workforce agents
const workforceAgents = await factory.createPreconfiguredWorkforceAgents();

// Process task with automatic agent selection
const result = await factory.processTaskWithWorkforce({
  type: 'customer_inquiry',
  content: 'Customer asking about product features',
  department: 'Customer Service',
  priority: 'medium'
});
```

---

## 🎯 **WORKFORCE CONFIGURATION**

### **Workforce Levels:**
- **`'worker'`** - Handles routine tasks (complexity 1-3)
- **`'manager'`** - Handles complex tasks (complexity 4-6)
- **`'director'`** - Handles strategic tasks (complexity 7-8)
- **`'human'`** - Human oversight (complexity 9-10)

### **Departments:**
- **`'Customer Service'`** - Customer support and inquiries
- **`'Operations'`** - Data processing and workflows
- **`'Human Resources'`** - Employee lifecycle and policies
- **`'Finance'`** - Budget and financial decisions
- **`'Sales'`** - Lead qualification and sales processes

### **Configuration Options:**
```typescript
workforce: {
  level: 'manager',                    // Workforce level
  department: 'Customer Service',      // Department
  confidenceThreshold: 0.8,           // Escalation threshold
  maxComplexity: 6,                   // Max task complexity
  humanSupervisor: 'human-cs-manager', // Human supervisor
  aiSupervisor: 'ai-cs-director'      // AI supervisor
}
```

---

## 🔄 **ESCALATION FLOW**

### **Automatic Escalation:**
```typescript
// Task complexity determines escalation
const result = await workforceAgent.processMessage({
  type: 'refund_request',
  amount: 10000,
  department: 'Customer Service',
  complexity: 7  // Will escalate to manager
});

if (result.escalated) {
  if (result.humanInteractionId) {
    // Human approval required
    console.log('Human approval needed:', result.humanInteractionId);
  } else if (result.transferredTo) {
    // Transferred to another AI agent
    console.log('Transferred to:', result.transferredTo);
  }
}
```

### **Escalation Triggers:**
- **Low confidence** - Agent unsure about response
- **High complexity** - Task exceeds agent's capabilities
- **Policy violation** - Requires human review
- **Budget limits** - Exceeds auto-approval limits
- **Risk level** - High-risk decisions

---

## 📊 **WORKFORCE STATISTICS**

### **Get Statistics:**
```typescript
const factory = AgentFactory.getInstance();

// Get workforce statistics
const stats = factory.getWorkforceStats();
console.log('Total agents:', stats.totalAgents);
console.log('Agents by level:', stats.agentsByLevel);
console.log('Agents by department:', stats.agentsByDepartment);
console.log('Average confidence:', stats.averageConfidence);
```

### **Filter Agents:**
```typescript
// Get agents by department
const csAgents = factory.getAgentsByDepartment('Customer Service');

// Get agents by level
const managers = factory.getAgentsByLevel('manager');

// Get specific agent
const agent = factory.getWorkforceAgent('ai-customer-support-worker');
```

---

## 🎯 **REAL-WORLD EXAMPLES**

### **Customer Service Flow:**
```typescript
// Simple inquiry → AI Worker handles
const simpleResult = await factory.processTaskWithWorkforce({
  type: 'customer_inquiry',
  content: 'What are your business hours?',
  department: 'Customer Service',
  complexity: 1
});
// Result: { success: true, agentId: 'ai-customer-support-worker' }

// Complex issue → AI Manager handles
const complexResult = await factory.processTaskWithWorkforce({
  type: 'technical_support',
  content: 'System integration problems',
  department: 'Customer Service',
  complexity: 6
});
// Result: { success: true, agentId: 'ai-customer-support-manager' }

// Policy violation → Human handles
const policyResult = await factory.processTaskWithWorkforce({
  type: 'policy_violation',
  content: 'Refund outside policy terms',
  department: 'Customer Service',
  complexity: 8,
  requiresApproval: true
});
// Result: { escalated: true, humanInteractionId: 'human-interaction-...' }
```

### **Finance Department:**
```typescript
// Expense approval → Human approval
const expenseResult = await factory.processTaskWithWorkforce({
  type: 'expense_approval',
  content: '$3,000 conference request',
  department: 'Finance',
  budget: 3000,
  requiresApproval: true
});
// Result: { escalated: true, humanInteractionId: 'human-interaction-...' }
```

---

## 🚀 **MIGRATION FROM EXISTING CODE**

### **No Changes Needed:**
Your existing code continues to work exactly the same:

```typescript
// This still works exactly as before
const agent = await factory.createToolEnabledAgent(config, tools);
const result = await agent.processMessage(message, context);
```

### **Add Workforce When Needed:**
```typescript
// Add workforce capabilities when you want escalation
const workforceAgent = await factory.createWorkforceAgent({
  ...config,  // Your existing config
  workforce: {
    level: 'worker',
    department: 'Customer Service',
    confidenceThreshold: 0.8,
    maxComplexity: 4
  }
}, tools);
```

---

## 🎉 **BENEFITS**

✅ **Single factory** - No confusion about which factory to use  
✅ **Backward compatible** - Existing code works unchanged  
✅ **Workforce capabilities** - When you need escalation and hierarchy  
✅ **Automatic escalation** - Intelligent routing based on complexity  
✅ **Human integration** - Built-in human-in-the-loop workflows  
✅ **Enterprise ready** - Multi-department coordination  
✅ **Easy to use** - Simple API for both simple and workforce agents  

---

## 📞 **SUPPORT**

The enhanced AgentFactory is designed to be **non-breaking** and **gradual**:

1. **Start with existing functionality** - Your current code works unchanged
2. **Add workforce capabilities** - When you need escalation
3. **Use pre-configured agents** - For common scenarios
4. **Customize as needed** - For specific business requirements

The factory gives you **the best of both worlds**: simple agents when you need them, workforce capabilities when you want them, all from a single, clean API.



