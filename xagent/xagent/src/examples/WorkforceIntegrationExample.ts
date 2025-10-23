/**
 * Workforce Integration Example
 * Shows how to integrate existing agents with the hierarchical workforce system
 */

import { workforceAgentFactory } from '../services/workforce/WorkforceAgentFactory';
import { humanInTheLoopWorkflows } from '../services/workforce/HumanInTheLoopWorkflows';
import { workforceIntegration } from '../services/workforce/WorkforceIntegration';

export async function demonstrateWorkforceIntegration() {
  console.log('🏢 WORKFORCE INTEGRATION DEMONSTRATION');
  console.log('=' .repeat(60));

  // Step 1: Initialize workforce system
  console.log('\n📋 STEP 1: Initialize Workforce System');
  workforceAgentFactory.initializeWorkforce();
  
  // Step 2: Create pre-configured workforce agents
  console.log('\n👥 STEP 2: Create Workforce Agents');
  const workforceAgents = await workforceAgentFactory.createPreconfiguredWorkforceAgents();
  
  console.log(`✅ Created ${workforceAgents.size} workforce agents:`);
  workforceAgents.forEach((agent, id) => {
    console.log(`   - ${agent.name} (${agent.workforceLevel}) in ${agent.department}`);
  });

  // Step 3: Demonstrate task processing with automatic escalation
  console.log('\n🎯 STEP 3: Task Processing with Escalation');
  
  // Example 1: Simple task (Worker level)
  console.log('\n📞 Example 1: Simple Customer Inquiry');
  const simpleInquiry = {
    type: 'customer_inquiry',
    content: 'What are your business hours?',
    department: 'Customer Service',
    priority: 'medium'
  };

  const result1 = await workforceAgentFactory.processTaskWithWorkforce(simpleInquiry);
  console.log('Result:', result1);
  // Expected: { success: true, agentId: 'ai-customer-support-worker' }

  // Example 2: Complex task (Manager level)
  console.log('\n🔧 Example 2: Complex Technical Issue');
  const complexIssue = {
    type: 'technical_support',
    content: 'Customer reporting system integration problems with multiple APIs',
    department: 'Customer Service',
    priority: 'high',
    complexity: 6,
    requiresApproval: false
  };

  const result2 = await workforceAgentFactory.processTaskWithWorkforce(complexIssue);
  console.log('Result:', result2);
  // Expected: { success: false, escalated: true, escalationReason: "Complexity 6 exceeds agent limit 3" }

  // Example 3: Policy violation (Human escalation)
  console.log('\n⚠️ Example 3: Policy Violation');
  const policyIssue = {
    type: 'policy_violation',
    content: 'Customer requesting refund outside policy terms',
    department: 'Customer Service',
    priority: 'high',
    riskLevel: 'high',
    requiresApproval: true,
    budget: 500
  };

  const result3 = await workforceAgentFactory.processTaskWithWorkforce(policyIssue);
  console.log('Result:', result3);
  // Expected: { success: false, escalated: true, humanInteractionId: "human-interaction-..." }

  // Step 4: Handle human response
  if (result3.humanInteractionId) {
    console.log('\n👤 STEP 4: Handle Human Response');
    
    const humanResponse = {
      decision: 'approve' as const,
      feedback: 'Approved with modifications: Offer 50% refund instead of full refund',
      modifications: {
        refundAmount: 250,
        conditions: ['Customer must return product', 'Refund processed within 5 business days']
      }
    };

    const responseResult = await workforceIntegration.handleHumanResponse(
      result3.humanInteractionId,
      humanResponse
    );

    console.log('Human Response Result:', responseResult);
    // Expected: { success: true, nextAction: "Apply modifications and re-execute", shouldContinue: true }
  }

  // Step 5: Show workforce statistics
  console.log('\n📊 STEP 5: Workforce Statistics');
  const stats = workforceAgentFactory.getWorkforceStats();
  console.log('Workforce Stats:', stats);

  const integrationStats = workforceIntegration.getWorkforceStats();
  console.log('Integration Stats:', integrationStats);

  const interactionStats = humanInTheLoopWorkflows.getInteractionStats();
  console.log('Interaction Stats:', interactionStats);

  console.log('\n🎉 WORKFORCE INTEGRATION DEMONSTRATION COMPLETE!');
}

/**
 * Example: How to integrate existing agents with workforce system
 */
export async function integrateExistingAgents() {
  console.log('\n🔗 INTEGRATING EXISTING AGENTS WITH WORKFORCE');
  console.log('=' .repeat(60));

  // Example: Convert existing EmailAgent to workforce-aware
  console.log('\n📧 Example: Converting EmailAgent to Workforce-Aware');
  
  // This would be done in your existing agent creation code:
  /*
  import { EmailAgent } from '../services/agent/agents/EmailAgent';
  import { createWorkforceAgent, WORKFORCE_AGENT_CONFIGS } from '../services/workforce/WorkforceAgentWrapper';

  // Create existing agent
  const emailAgent = new EmailAgent('email-agent-001', {
    name: 'Email Agent',
    type: 'email',
    description: 'Handles email processing and responses',
    // ... other config
  });

  // Convert to workforce-aware agent
  const workforceEmailAgent = createWorkforceAgent(emailAgent, {
    level: WorkforceLevel.WORKER,
    department: 'Communications',
    confidenceThreshold: 0.8,
    maxComplexity: 4,
    aiSupervisor: 'ai-communications-manager'
  });

  // Now the agent can handle escalation automatically
  const result = await workforceEmailAgent.processMessage({
    type: 'email_processing',
    content: 'Process this complex email with multiple attachments and legal requirements',
    priority: 'high',
    complexity: 7
  });

  if (result.escalated) {
    console.log('Task escalated:', result.reason);
    // Handle escalation...
  }
  */

  console.log('✅ Integration pattern demonstrated');
}

/**
 * Example: Custom workforce agent creation
 */
export async function createCustomWorkforceAgent() {
  console.log('\n🛠️ CREATING CUSTOM WORKFORCE AGENT');
  console.log('=' .repeat(60));

  // Example: Create a custom sales agent with workforce integration
  const customSalesAgent = await workforceAgentFactory.createWorkforceAgent({
    name: 'AI Sales Representative',
    type: 'sales',
    description: 'Handles sales inquiries and lead qualification',
    personality: {
      friendliness: 0.9,
      formality: 0.6,
      proactiveness: 0.8,
      detail_orientation: 0.7
    },
    skills: [
      { name: 'lead_qualification', level: 5 },
      { name: 'sales_presentation', level: 4 },
      { name: 'objection_handling', level: 4 }
    ],
    workforce: {
      level: 'manager' as any,
      department: 'Sales',
      confidenceThreshold: 0.8,
      maxComplexity: 6,
      humanSupervisor: 'human-sales-manager'
    }
  });

  console.log('✅ Created custom sales agent:', customSalesAgent.getWorkforceInfo());

  // Test the custom agent
  const salesTask = {
    type: 'lead_qualification',
    content: 'Qualify this enterprise lead with complex requirements',
    department: 'Sales',
    priority: 'high',
    complexity: 7
  };

  const result = await customSalesAgent.processMessage(salesTask);
  console.log('Sales task result:', result);
}

// Main execution function
export async function runWorkforceIntegrationExamples() {
  try {
    await demonstrateWorkforceIntegration();
    await integrateExistingAgents();
    await createCustomWorkforceAgent();
    
    console.log('\n🎉 ALL WORKFORCE INTEGRATION EXAMPLES COMPLETED!');
    console.log('\n📋 SUMMARY:');
    console.log('✅ Existing agents can be wrapped with workforce capabilities');
    console.log('✅ Automatic escalation based on confidence and complexity');
    console.log('✅ Human-in-the-loop workflows for approvals and interventions');
    console.log('✅ Pre-configured workforce hierarchy for common scenarios');
    console.log('✅ Custom workforce agents for specific business needs');
    
  } catch (error) {
    console.error('❌ Error running workforce integration examples:', error);
  }
}

// Export for use in other modules
export {
  demonstrateWorkforceIntegration,
  integrateExistingAgents,
  createCustomWorkforceAgent
};


