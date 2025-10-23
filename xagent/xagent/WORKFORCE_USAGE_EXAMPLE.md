# 🚀 **WORKFORCE CAPABILITIES USAGE EXAMPLE**

## 🎯 **HOW TO ADD WORKFORCE CAPABILITIES TO YOUR AGENTS**

---

## ✅ **STEP 1: Enable Workforce in Agent Builder**

1. **Go to Agent Builder** in your application
2. **Fill in basic agent details** (name, description, role, etc.)
3. **Toggle "Workforce Capabilities"** to enable
4. **Configure workforce settings:**
   - **Workforce Level**: Worker, Manager, or Director
   - **Department**: Customer Service, Operations, HR, Finance, Sales
   - **Confidence Threshold**: When to escalate (0.1 - 1.0)
   - **Max Complexity**: Task complexity limit (1 - 10)
5. **Create Agent** - It will now have workforce capabilities!

---

## 🎯 **STEP 2: Use Workforce Agent**

### **Basic Usage (Same as Before):**
```typescript
// Your existing code works the same
const result = await workforceAgent.processMessage(message, context);
console.log('Result:', result);
```

### **With Escalation Handling:**
```typescript
// Enhanced usage with escalation
const result = await workforceAgent.processMessage(message, context);

if (result.escalated) {
  console.log('Task escalated:', result.reason);
  
  if (result.humanInteractionId) {
    console.log('Human approval needed:', result.humanInteractionId);
    // Show human interaction UI
    showHumanApprovalUI(result.humanInteractionId);
  } else if (result.transferredTo) {
    console.log('Transferred to:', result.transferredTo);
    // Handle transfer to another agent
  }
} else {
  console.log('Task completed successfully:', result);
}
```

---

## 🎯 **STEP 3: Real-World Examples**

### **Example 1: Customer Support Worker**
```typescript
// Create a customer support worker
const csWorker = await AgentFactory.getInstance().createWorkforceAgent({
  name: 'Customer Support Worker',
  type: 'customer_support',
  description: 'Handles routine customer inquiries',
  workforce: {
    level: 'worker',
    department: 'Customer Service',
    confidenceThreshold: 0.8,
    maxComplexity: 3,
    aiSupervisor: 'ai-customer-support-manager'
  }
});

// Simple inquiry - handled by worker
const simpleResult = await csWorker.processMessage({
  type: 'customer_inquiry',
  content: 'What are your business hours?',
  complexity: 1
});
// Result: { success: true, agentId: 'cs-worker-001' }

// Complex issue - escalated to manager
const complexResult = await csWorker.processMessage({
  type: 'technical_support',
  content: 'System integration problems with multiple APIs',
  complexity: 6
});
// Result: { escalated: true, reason: 'Complexity 6 exceeds worker limit 3' }
```

### **Example 2: Finance Manager**
```typescript
// Create a finance manager
const financeManager = await AgentFactory.getInstance().createWorkforceAgent({
  name: 'Finance Manager',
  type: 'finance',
  description: 'Manages financial processes and budget decisions',
  workforce: {
    level: 'manager',
    department: 'Finance',
    confidenceThreshold: 0.85,
    maxComplexity: 6,
    humanSupervisor: 'human-finance-director'
  }
});

// Expense approval - escalated to human
const expenseResult = await financeManager.processMessage({
  type: 'expense_approval',
  content: 'Approve $15,000 software license renewal',
  budget: 15000,
  requiresApproval: true
});
// Result: { escalated: true, humanInteractionId: 'human-interaction-...' }
```

---

## 🎯 **STEP 4: Handle Human Interactions**

### **Get Pending Human Interactions:**
```typescript
import { humanInTheLoopWorkflows } from './services/workforce/HumanInTheLoopWorkflows';

// Get pending interactions for a human
const pendingInteractions = humanInTheLoopWorkflows.getPendingInteractions('human-user-id');
console.log('Pending interactions:', pendingInteractions);
```

### **Process Human Response:**
```typescript
// Human approves with modifications
const responseResult = await humanInTheLoopWorkflows.processHumanResponse(
  'human-interaction-123',
  {
    decision: 'approve',
    feedback: 'Approved with modifications: Use annual license instead of monthly',
    modifications: {
      licenseType: 'annual',
      cost: 12000
    }
  }
);

console.log('Human response processed:', responseResult);
```

---

## 🎯 **STEP 5: Monitor Workforce Performance**

### **Get Workforce Statistics:**
```typescript
const factory = AgentFactory.getInstance();

// Get comprehensive workforce stats
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

## 🎯 **STEP 6: Pre-configured Workforce**

### **Create All Pre-configured Agents:**
```typescript
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

console.log('Task processed:', result);
```

---

## 🎯 **ESCALATION FLOW EXAMPLES**

### **Customer Service Escalation:**
```
1. Customer asks simple question → AI Worker handles ✅
2. Customer has complex technical issue → Escalated to AI Manager ⬆️
3. Customer requests policy exception → Escalated to Human 👤
4. Human approves with conditions → AI Manager executes ✅
```

### **Finance Escalation:**
```
1. Employee requests $500 expense → AI Manager auto-approves ✅
2. Employee requests $5,000 expense → Escalated to Human 👤
3. Human approves with modifications → AI Manager executes ✅
4. Employee requests $50,000 expense → Escalated to Human + Board 👤
```

---

## 🎯 **BENEFITS**

✅ **Automatic Escalation** - Agents know when to escalate  
✅ **Human Oversight** - Critical decisions go to humans  
✅ **Organizational Structure** - Proper hierarchy and departments  
✅ **Audit Trail** - Full tracking of escalations and decisions  
✅ **Flexible Configuration** - Customize thresholds per agent  
✅ **Easy Integration** - Works with existing agent code  

---

## 🚀 **QUICK START**

1. **Enable workforce capabilities** in Agent Builder
2. **Configure escalation thresholds** for your use case
3. **Test with simple tasks** first
4. **Add escalation handling** to your agent usage code
5. **Monitor performance** and adjust thresholds as needed

The workforce system makes your agents smarter by adding organizational structure and human oversight while keeping your existing code working unchanged!



