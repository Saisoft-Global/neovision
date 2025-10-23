# 🧪 AGENT TESTING FRAMEWORK - COMPLETE GUIDE

## 📋 **Overview**

This testing framework provides everything you need to validate agent accuracy, performance, and reliability before beta launch.

---

## 🏗️ **Architecture**

```
┌─────────────────────────────────────────────────────────────────┐
│                  TESTING FRAMEWORK                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. TEST INFRASTRUCTURE (Vitest)                                │
│     ├─ vitest.config.ts                                         │
│     ├─ tests/setup.ts                                           │
│     └─ Test runners & utilities                                 │
│                                                                  │
│  2. TEST DATASETS (JSON scenarios)                              │
│     ├─ productivity-agent-scenarios.json (100 scenarios)        │
│     ├─ sales-copilot-scenarios.json (100 scenarios)             │
│     ├─ travel-agent-scenarios.json (100 scenarios)              │
│     └─ banking-teller-scenarios.json (100 scenarios)            │
│                                                                  │
│  3. UNIT TESTS (Fast, isolated)                                 │
│     └─ tests/unit/agents/*.test.ts                              │
│                                                                  │
│  4. ACCURACY MEASUREMENT                                         │
│     └─ tests/accuracy/AgentAccuracyTester.ts                    │
│         ├─ Runs all scenarios                                   │
│         ├─ Measures pass/fail                                   │
│         ├─ Generates reports                                    │
│         └─ Identifies patterns                                  │
│                                                                  │
│  5. MONITORING & OBSERVABILITY                                   │
│     └─ src/services/monitoring/AgentMonitor.ts                  │
│         ├─ Tracks all agent actions                             │
│         ├─ Measures performance                                 │
│         ├─ Detects anomalies                                    │
│         └─ Exports metrics                                      │
│                                                                  │
│  6. SAFETY RAILS                                                 │
│     └─ src/components/agent/SafetyRails.tsx                     │
│         ├─ Confirmation dialogs                                 │
│         ├─ Risk assessment                                      │
│         ├─ 2FA for critical actions                             │
│         └─ Reversibility checks                                 │
│                                                                  │
│  7. TESTING DASHBOARD                                            │
│     └─ src/pages/AgentTestingDashboard.tsx                      │
│         ├─ Real-time performance                                │
│         ├─ Success rates                                        │
│         ├─ Error tracking                                       │
│         └─ Health status                                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 **Quick Start**

### **Step 1: Install Dependencies**

```bash
npm install --save-dev vitest @vitest/ui vitest-coverage-v8
```

### **Step 2: Run Unit Tests**

```bash
npm run test
```

### **Step 3: Run Accuracy Tests**

```bash
# Test Productivity AI Agent
npx ts-node tests/accuracy/AgentAccuracyTester.ts productivity

# Test Sales Copilot
npx ts-node tests/accuracy/AgentAccuracyTester.ts sales

# Test all agents
npm run test:accuracy
```

### **Step 4: View Testing Dashboard**

```bash
npm run dev
# Navigate to /testing-dashboard
```

---

## 📊 **Test Datasets**

### **Productivity AI Agent (100 scenarios)**

| Category | Count | Examples |
|----------|-------|----------|
| Email Classification | 20 | Urgent, Spam, Newsletter, Meeting Request |
| Task Extraction | 20 | Multi-task emails, Deadlines, Ambiguous |
| Auto-Response | 15 | Invoices, Routine queries, Executive emails |
| Meeting Scheduling | 15 | Calendar conflicts, Multi-participant |
| Context Understanding | 20 | Thread continuity, References |
| Daily Summary | 10 | Mixed email types, Prioritization |

**Sample Scenario:**

```json
{
  "id": "prod-001",
  "category": "email_classification",
  "input": {
    "email": {
      "from": "boss@company.com",
      "subject": "URGENT: Q4 Budget Approval Needed",
      "body": "Hi, I need you to approve the Q4 marketing budget by EOD today..."
    }
  },
  "expected_output": {
    "classification": "urgent",
    "priority": "high",
    "requires_action": true,
    "action_items": ["Review Q4 marketing budget", "Provide approval by EOD"]
  },
  "pass_criteria": {
    "must_classify_as": "urgent",
    "must_not_auto_respond": true,
    "confidence_threshold": 0.9
  }
}
```

---

## 🎯 **How to Add New Test Scenarios**

1. **Choose a category** (e.g., "email_classification")
2. **Define input** (email, context, settings)
3. **Define expected output** (classification, action_items, response)
4. **Define pass criteria** (what makes this test pass?)

**Example:**

```json
{
  "id": "prod-XXX",
  "category": "new_category",
  "input": { /* your test input */ },
  "expected_output": { /* what should happen */ },
  "pass_criteria": { /* how to validate */ }
}
```

---

## 📈 **Accuracy Measurement**

### **Run Accuracy Tests:**

```bash
cd tests/accuracy
npx ts-node AgentAccuracyTester.ts productivity
```

### **Output:**

```
🧪 Running 100 test scenarios...
✅ prod-001: email_classification (1250ms)
✅ prod-002: email_classification (980ms)
✅ prod-003: task_extraction (1450ms)
❌ prod-004: auto_response (2100ms)
...

============================================================
📊 AGENT ACCURACY REPORT
============================================================
Agent Type: productivity
Test Date: 2025-01-22T...
Total Scenarios: 100
Passed: 87 (87.0%)
Failed: 13
Avg Duration: 1350ms

📈 Accuracy by Category:
  ✅ email_classification: 19/20 (95.0%)
  ✅ task_extraction: 18/20 (90.0%)
  ⚠️  auto_response: 12/15 (80.0%)
  ✅ meeting_scheduling: 14/15 (93.3%)
  ✅ context_understanding: 17/20 (85.0%)
  ✅ daily_summary: 7/10 (70.0%)

❌ Failed Scenarios:
  • prod-004: Failed criterion: confidence_threshold
  • prod-015: Failed criterion: must_extract_all_tasks
  ...
============================================================
```

### **Report Files:**

- `reports/accuracy-productivity-1705937000000.json`
- Includes detailed results for every scenario
- Can be analyzed programmatically

---

## 🔍 **Monitoring & Observability**

### **Track Agent Actions:**

```typescript
import { agentMonitor } from './services/monitoring/AgentMonitor';

// Track successful action
await agentMonitor.trackAction(
  agentId,
  'productivity',
  'process_email',
  {
    success: true,
    duration_ms: 1250,
    confidence: 0.95,
    metadata: { classification: 'urgent' }
  }
);

// Track failure
await agentMonitor.trackAction(
  agentId,
  'productivity',
  'auto_respond',
  {
    success: false,
    duration_ms: 2100,
    error: 'Confidence too low',
    metadata: { confidence: 0.65 }
  }
);
```

### **Get Performance Stats:**

```typescript
const stats = await agentMonitor.getPerformanceStats(agentId, 24); // Last 24 hours

console.log(`Success Rate: ${stats.success_rate}%`);
console.log(`Avg Duration: ${stats.avg_duration_ms}ms`);
console.log(`Total Actions: ${stats.total_actions}`);
```

### **Detect Anomalies:**

```typescript
const { hasAnomalies, issues } = await agentMonitor.detectAnomalies(agentId);

if (hasAnomalies) {
  console.log('🚨 ALERT: Agent performance issues detected');
  issues.forEach(issue => console.log(`  • ${issue}`));
}
```

---

## 🛡️ **Safety Rails**

### **Usage:**

```typescript
import { useSafetyRails, SAFETY_RULES } from './components/agent/SafetyRails';

const { SafetyRailsComponent, requestConfirmation } = useSafetyRails();

// Before risky action
const confirmed = await requestConfirmation(SAFETY_RULES.block_bank_card);

if (confirmed) {
  // Proceed with action
  await agent.blockCard(cardId);
} else {
  // User cancelled
  console.log('Action cancelled by user');
}

// Render safety component
return <>{SafetyRailsComponent}</>;
```

### **Available Safety Rules:**

- `send_email_to_executive` - High risk
- `block_bank_card` - Critical risk (requires 2FA)
- `book_flight` - High risk (financial)
- `send_bulk_emails` - Medium risk
- `auto_respond_email` - Low risk

---

## 📊 **Testing Dashboard**

Access at: `/testing-dashboard`

**Features:**
- Real-time agent performance
- Success rate tracking
- Response time monitoring
- Error detection
- Health status indicators

---

## ✅ **Pre-Launch Checklist**

### **Week 1: Core Testing**
- [ ] Run all unit tests (`npm run test`)
- [ ] Run accuracy tests for all agents
- [ ] Fix failing scenarios (target: 90%+ accuracy)
- [ ] Measure performance (target: <5s per action)

### **Week 2: Safety & Monitoring**
- [ ] Add safety confirmations for all risky actions
- [ ] Set up monitoring for all agents
- [ ] Create anomaly detection alerts
- [ ] Test error handling (network failures, API timeouts)

### **Week 3: Beta Preparation**
- [ ] Create user documentation
- [ ] Set up feedback collection
- [ ] Prepare rollback procedures
- [ ] Train support team

---

## 🎯 **Success Criteria**

| Metric | Target | Status |
|--------|--------|--------|
| **Accuracy Rate** | >90% | ⏳ Pending |
| **Success Rate** | >95% | ⏳ Pending |
| **Avg Response Time** | <5s | ⏳ Pending |
| **Timeout Rate** | <5% | ⏳ Pending |
| **User Satisfaction** | >4.5/5 | ⏳ Pending |

---

## 🚀 **Next Steps**

1. **Run the tests!**
   ```bash
   npm run test:accuracy
   ```

2. **Review the reports**
   - Check `reports/` directory
   - Identify failure patterns

3. **Fix issues**
   - Improve prompts
   - Add validation
   - Enhance context

4. **Repeat until 90%+ accuracy** ✅

---

## 📞 **Support**

Need help? Check:
- Test scenarios: `tests/datasets/`
- Example tests: `tests/unit/agents/ProductivityAgent.test.ts`
- Monitoring code: `src/services/monitoring/AgentMonitor.ts`

**You're ready to build reliable, production-grade AI agents!** 🎉


