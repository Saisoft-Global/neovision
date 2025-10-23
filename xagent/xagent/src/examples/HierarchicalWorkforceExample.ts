/**
 * Hierarchical Workforce System - Complete Usage Example
 * Demonstrates how AI agents work at different levels with human escalation
 */

import { workforceIntegration } from '../services/workforce/WorkforceIntegration';
import { humanInTheLoopWorkflows } from '../services/workforce/HumanInTheLoopWorkflows';
import { initializeWorkforceHierarchy } from '../services/workforce/WorkforceHierarchy';
import { WorkforceLevel } from '../services/workforce/HierarchicalWorkforceManager';

// Example: Customer Support Scenario
export async function customerSupportWorkflowExample() {
  console.log('🏢 HIERARCHICAL WORKFORCE EXAMPLE: Customer Support');
  console.log('=' .repeat(60));

  // Initialize workforce hierarchy
  initializeWorkforceHierarchy();

  // Scenario 1: Simple customer inquiry (Worker level)
  console.log('\n📞 SCENARIO 1: Simple Customer Inquiry');
  const simpleInquiry = {
    id: 'inquiry-001',
    type: 'customer_inquiry',
    description: 'Customer asking about product pricing',
    priority: 'medium',
    customerId: 'customer-123',
    department: 'Customer Service'
  };

  const workerResult = await workforceIntegration.processTaskWithWorkforce(
    'ai-customer-support-worker',
    simpleInquiry,
    { confidence: 0.9, complexity: 2 }
  );

  console.log('✅ Worker Result:', workerResult);
  // Expected: { success: true, escalated: false }

  // Scenario 2: Complex technical issue (Manager level)
  console.log('\n🔧 SCENARIO 2: Complex Technical Issue');
  const complexIssue = {
    id: 'issue-002',
    type: 'technical_support',
    description: 'Customer reporting system integration problems',
    priority: 'high',
    complexity: 6,
    customerId: 'customer-456',
    department: 'Customer Service',
    requiresApproval: false
  };

  const managerResult = await workforceIntegration.processTaskWithWorkforce(
    'ai-customer-support-worker',
    complexIssue,
    { confidence: 0.6, complexity: 6 }
  );

  console.log('⬆️ Manager Escalation:', managerResult);
  // Expected: { success: false, escalated: true, escalationReason: "Complexity 6 exceeds agent limit 3" }

  // Scenario 3: Policy violation (Human escalation)
  console.log('\n⚠️ SCENARIO 3: Policy Violation');
  const policyIssue = {
    id: 'policy-003',
    type: 'policy_violation',
    description: 'Customer requesting refund outside policy',
    priority: 'high',
    riskLevel: 'high',
    customerId: 'customer-789',
    department: 'Customer Service',
    requiresApproval: true,
    budget: 500
  };

  const policyResult = await workforceIntegration.processTaskWithWorkforce(
    'ai-customer-support-manager',
    policyIssue,
    { confidence: 0.7, complexity: 5 }
  );

  console.log('👤 Human Escalation:', policyResult);
  // Expected: { success: false, escalated: true, humanInteractionId: "human-interaction-..." }

  // Scenario 4: Strategic decision (Director level)
  console.log('\n🎯 SCENARIO 4: Strategic Decision');
  const strategicDecision = {
    id: 'strategic-004',
    type: 'strategic_customer_retention',
    description: 'Major customer threatening to leave - retention strategy needed',
    priority: 'critical',
    complexity: 8,
    customerId: 'enterprise-customer-001',
    department: 'Customer Service',
    requiresApproval: true,
    budget: 50000,
    riskLevel: 'high'
  };

  const strategicResult = await workforceIntegration.processTaskWithWorkforce(
    'ai-customer-director',
    strategicDecision,
    { confidence: 0.8, complexity: 8 }
  );

  console.log('🎯 Strategic Escalation:', strategicResult);
  // Expected: { success: false, escalated: true, humanInteractionId: "human-interaction-..." }

  // Scenario 5: Human response processing
  if (policyResult.humanInteractionId) {
    console.log('\n👤 SCENARIO 5: Human Response Processing');
    
    const humanResponse = {
      decision: 'approve' as const,
      feedback: 'Approved with modifications: Offer 50% refund instead of full refund',
      modifications: {
        refundAmount: 250,
        conditions: ['Customer must return product', 'Refund processed within 5 business days']
      }
    };

    const responseResult = await workforceIntegration.handleHumanResponse(
      policyResult.humanInteractionId,
      humanResponse
    );

    console.log('✅ Human Response Result:', responseResult);
    // Expected: { success: true, nextAction: "Apply modifications and re-execute", shouldContinue: true }
  }

  // Get workforce statistics
  console.log('\n📊 WORKFORCE STATISTICS');
  const stats = workforceIntegration.getWorkforceStats();
  console.log('Total Agents:', stats.totalAgents);
  console.log('Agents by Level:', stats.agentsByLevel);
  console.log('Agents by Department:', stats.agentsByDepartment);
  console.log('Escalation Stats:', stats.escalationStats);
  console.log('Interaction Stats:', stats.interactionStats);
}

// Example: Finance Department Workflow
export async function financeWorkflowExample() {
  console.log('\n💰 FINANCE DEPARTMENT WORKFLOW EXAMPLE');
  console.log('=' .repeat(60));

  // Scenario 1: Expense approval (Manager level)
  console.log('\n💳 SCENARIO 1: Expense Approval');
  const expenseRequest = {
    id: 'expense-001',
    type: 'expense_approval',
    description: 'Employee requesting $3,000 for conference attendance',
    priority: 'medium',
    amount: 3000,
    department: 'Finance',
    requiresApproval: true,
    employeeId: 'emp-123'
  };

  const expenseResult = await workforceIntegration.processTaskWithWorkforce(
    'ai-finance-manager',
    expenseRequest,
    { confidence: 0.8, complexity: 4 }
  );

  console.log('💳 Expense Result:', expenseResult);
  // Expected: { success: false, escalated: true, humanInteractionId: "human-interaction-..." }

  // Scenario 2: Budget decision (Human escalation)
  console.log('\n📊 SCENARIO 2: Budget Decision');
  const budgetDecision = {
    id: 'budget-002',
    type: 'budget_allocation',
    description: 'Allocating $50,000 for new department equipment',
    priority: 'high',
    amount: 50000,
    department: 'Finance',
    requiresApproval: true,
    riskLevel: 'medium'
  };

  const budgetResult = await workforceIntegration.processTaskWithWorkforce(
    'ai-finance-director',
    budgetDecision,
    { confidence: 0.9, complexity: 7 }
  );

  console.log('📊 Budget Result:', budgetResult);
  // Expected: { success: false, escalated: true, humanInteractionId: "human-interaction-..." }

  // Process human approval
  if (expenseResult.humanInteractionId) {
    console.log('\n👤 Processing Human Approval');
    
    const approvalResponse = {
      decision: 'approve' as const,
      feedback: 'Approved - conference aligns with professional development goals',
      modifications: {
        approvedAmount: 3000,
        conditions: ['Submit receipts within 30 days', 'Provide conference summary report']
      }
    };

    const approvalResult = await workforceIntegration.handleHumanResponse(
      expenseResult.humanInteractionId,
      approvalResponse
    );

    console.log('✅ Approval Result:', approvalResult);
  }
}

// Example: HR Department Workflow
export async function hrWorkflowExample() {
  console.log('\n👥 HR DEPARTMENT WORKFLOW EXAMPLE');
  console.log('=' .repeat(60));

  // Scenario 1: Leave request (Manager level)
  console.log('\n🏖️ SCENARIO 1: Leave Request');
  const leaveRequest = {
    id: 'leave-001',
    type: 'leave_request',
    description: 'Employee requesting 2 weeks vacation',
    priority: 'medium',
    employeeId: 'emp-456',
    department: 'Human Resources',
    leaveDays: 10,
    startDate: new Date('2024-02-01'),
    endDate: new Date('2024-02-14')
  };

  const leaveResult = await workforceIntegration.processTaskWithWorkforce(
    'ai-hr-manager',
    leaveRequest,
    { confidence: 0.9, complexity: 3 }
  );

  console.log('🏖️ Leave Result:', leaveResult);
  // Expected: { success: true, escalated: false } - Simple approval

  // Scenario 2: Policy violation (Human escalation)
  console.log('\n⚠️ SCENARIO 2: Policy Violation');
  const policyViolation = {
    id: 'violation-002',
    type: 'policy_violation',
    description: 'Employee reported for inappropriate behavior',
    priority: 'high',
    riskLevel: 'high',
    employeeId: 'emp-789',
    department: 'Human Resources',
    requiresApproval: true,
    violationType: 'harassment'
  };

  const violationResult = await workforceIntegration.processTaskWithWorkforce(
    'ai-hr-manager',
    policyViolation,
    { confidence: 0.6, complexity: 8 }
  );

  console.log('⚠️ Violation Result:', violationResult);
  // Expected: { success: false, escalated: true, humanInteractionId: "human-interaction-..." }

  // Process human intervention
  if (violationResult.humanInteractionId) {
    console.log('\n👤 Processing Human Intervention');
    
    const interventionResponse = {
      decision: 'escalate' as const,
      feedback: 'Escalating to legal department for investigation',
      modifications: {
        nextSteps: ['Legal review', 'HR investigation', 'Employee suspension pending review']
      }
    };

    const interventionResult = await workforceIntegration.handleHumanResponse(
      violationResult.humanInteractionId,
      interventionResponse
    );

    console.log('⬆️ Intervention Result:', interventionResult);
  }
}

// Main execution function
export async function runHierarchicalWorkforceExamples() {
  try {
    await customerSupportWorkflowExample();
    await financeWorkflowExample();
    await hrWorkflowExample();
    
    console.log('\n🎉 ALL EXAMPLES COMPLETED SUCCESSFULLY!');
    console.log('\n📋 SUMMARY:');
    console.log('✅ AI Workers handle simple, routine tasks');
    console.log('✅ AI Managers handle complex tasks and team coordination');
    console.log('✅ AI Directors handle strategic decisions and cross-department coordination');
    console.log('✅ Humans handle critical decisions, policy violations, and strategic initiatives');
    console.log('✅ Intelligent escalation based on confidence, complexity, and risk');
    console.log('✅ Human-in-the-loop workflows for approval, review, and intervention');
    
  } catch (error) {
    console.error('❌ Error running examples:', error);
  }
}

// Export for use in other modules
export {
  customerSupportWorkflowExample,
  financeWorkflowExample,
  hrWorkflowExample
};


