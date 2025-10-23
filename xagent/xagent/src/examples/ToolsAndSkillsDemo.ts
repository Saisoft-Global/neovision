/**
 * Complete Demo of the Tools & Skills Framework
 * 
 * This demonstrates:
 * 1. Registering tools
 * 2. Creating tool-enabled agents
 * 3. Attaching tools to agents
 * 4. Executing skills from natural language
 * 5. Multi-tool scenarios
 */

import { ToolRegistry } from '../services/tools/ToolRegistry';
import { ToolEnabledAgent } from '../services/agent/ToolEnabledAgent';
import { EmailTool } from '../services/tools/implementations/EmailTool';
import { CRMTool } from '../services/tools/implementations/CRMTool';
import type { AgentConfig } from '../types/agent-framework';

/**
 * Demo 1: Basic Email Tool Usage
 */
export async function demo1_BasicEmailTool() {
  console.log('\n🎯 DEMO 1: Basic Email Tool Usage\n');
  
  // 1. Get tool registry instance
  const registry = ToolRegistry.getInstance();
  
  // 2. Register Email Tool
  registry.registerTool(EmailTool);
  
  // 3. Create an agent
  const agentConfig: AgentConfig = {
    personality: {
      friendliness: 0.8,
      formality: 0.7,
      proactiveness: 0.6,
      detail_orientation: 0.9
    },
    skills: [], // Start with no skills
    knowledge_bases: [],
    llm_config: {
      provider: 'openai',
      model: 'gpt-4-turbo-preview',
      temperature: 0.7
    }
  };
  
  const agent = new ToolEnabledAgent('demo-agent-1', agentConfig, registry);
  
  // 4. Attach Email Tool
  agent.attachTool('email-tool');
  
  // Agent now has 5 core skills + 5 email skills = 10 total skills!
  console.log('Agent skills:', agent.getAvailableSkills());
  console.log('Agent stats:', agent.getStatistics());
  
  // 5. Execute skill directly
  console.log('\n📧 Executing parse_email skill directly...');
  const result1 = await agent.executeSkill('parse_email', {
    emailContent: `
      From: john@example.com
      Subject: Urgent: Q4 Budget Review
      Date: 2024-01-15
      
      Hi Team,
      
      We need to review the Q4 budget by end of this week. Please prepare your reports.
      
      Thanks,
      John
    `
  });
  
  console.log('Parse result:', JSON.stringify(result1, null, 2));
  
  // 6. Execute from natural language prompt
  console.log('\n🗣️  Executing from natural language...');
  const result2 = await agent.executeFromPrompt(
    "Summarize this email and tell me if it's critical: 'From CEO: Board meeting moved to tomorrow 9am. Your presence is mandatory.'"
  );
  
  console.log('Natural language result:', JSON.stringify(result2, null, 2));
}

/**
 * Demo 2: CRM Tool Usage
 */
export async function demo2_CRMTool() {
  console.log('\n🎯 DEMO 2: CRM Tool Usage\n');
  
  const registry = ToolRegistry.getInstance();
  registry.registerTool(CRMTool);
  
  const agentConfig: AgentConfig = {
    personality: {
      friendliness: 0.6,
      formality: 0.9,
      proactiveness: 0.7,
      detail_orientation: 1.0
    },
    skills: [],
    knowledge_bases: [],
    llm_config: {
      provider: 'openai',
      model: 'gpt-4-turbo-preview',
      temperature: 0.3
    }
  };
  
  const agent = new ToolEnabledAgent('sales-agent', agentConfig, registry);
  agent.attachTool('crm-tool');
  
  // Create a lead
  console.log('\n📝 Creating a lead...');
  const result1 = await agent.executeSkill('create_lead', {
    leadData: {
      firstName: 'Jane',
      lastName: 'Smith',
      company: 'Acme Corp',
      email: 'jane@acme.com',
      phone: '555-0123',
      source: 'Website'
    }
  });
  
  console.log('Lead created:', JSON.stringify(result1, null, 2));
  
  // Natural language: Query leads
  console.log('\n🔍 Querying leads with natural language...');
  const result2 = await agent.executeFromPrompt(
    "Find all leads from companies containing 'Acme' that have status 'new'"
  );
  
  console.log('Query result:', JSON.stringify(result2, null, 2));
  
  // Analyze pipeline
  console.log('\n📊 Analyzing sales pipeline...');
  const result3 = await agent.executeSkill('analyze_pipeline', {
    timeframe: 'this_quarter',
    includeForecasting: true
  });
  
  console.log('Pipeline analysis:', JSON.stringify(result3, null, 2));
}

/**
 * Demo 3: Multi-Tool Agent (Email + CRM)
 */
export async function demo3_MultiToolAgent() {
  console.log('\n🎯 DEMO 3: Multi-Tool Agent (Email + CRM)\n');
  
  const registry = ToolRegistry.getInstance();
  
  // Ensure tools are registered
  if (!registry.getTool('email-tool')) {
    registry.registerTool(EmailTool);
  }
  if (!registry.getTool('crm-tool')) {
    registry.registerTool(CRMTool);
  }
  
  // Create a productivity agent with multiple tools
  const agentConfig: AgentConfig = {
    personality: {
      friendliness: 0.9,
      formality: 0.6,
      proactiveness: 0.95,
      detail_orientation: 0.8
    },
    skills: [],
    knowledge_bases: [],
    llm_config: {
      provider: 'openai',
      model: 'gpt-4-turbo-preview',
      temperature: 0.7
    }
  };
  
  const agent = new ToolEnabledAgent('multi-tool-agent', agentConfig, registry);
  
  // Attach both tools
  agent.attachTool('email-tool');
  agent.attachTool('crm-tool');
  
  // Agent now has: 5 core + 5 email + 5 CRM = 15 skills!
  console.log('Agent skills:', agent.getAvailableSkills());
  console.log('Agent stats:', agent.getStatistics());
  
  // Complex scenario: Email about a new lead
  console.log('\n📧 Processing email about new lead...');
  
  const emailContent = `
    From: potential-client@bigcorp.com
    Subject: Interested in your services
    
    Hi,
    
    I'm Sarah Johnson from BigCorp Inc. We're interested in your enterprise solution.
    Can you send me more information?
    
    Best regards,
    Sarah Johnson
    VP of Operations
    BigCorp Inc.
    sarah.johnson@bigcorp.com
    (555) 987-6543
  `;
  
  // Step 1: Parse and classify email
  const parsed = await agent.executeFromPrompt(
    `Parse and classify this email: ${emailContent}`
  );
  console.log('1️⃣  Email parsed:', JSON.stringify(parsed.data, null, 2));
  
  // Step 2: Create lead from email
  const lead = await agent.executeFromPrompt(
    `Create a CRM lead for Sarah Johnson from BigCorp Inc., email: sarah.johnson@bigcorp.com, phone: (555) 987-6543. Source: Email inquiry.`
  );
  console.log('2️⃣  Lead created:', JSON.stringify(lead.data, null, 2));
  
  // Step 3: Draft reply
  const reply = await agent.executeFromPrompt(
    `Draft a professional reply to Sarah thanking her for her interest and offering to schedule a demo call`
  );
  console.log('3️⃣  Reply drafted:', JSON.stringify(reply.data, null, 2));
}

/**
 * Demo 4: Tool Registry Features
 */
export async function demo4_ToolRegistry() {
  console.log('\n🎯 DEMO 4: Tool Registry Features\n');
  
  const registry = ToolRegistry.getInstance();
  
  // Get statistics
  console.log('Registry stats:', registry.getStatistics());
  
  // Search skills
  console.log('\n🔍 Searching for "email" skills...');
  const emailSkills = registry.searchSkills('email');
  console.log('Found skills:', emailSkills.map(s => s.name));
  
  // Get all skills
  console.log('\n📋 All available skills:');
  const allSkills = registry.getAllSkills();
  allSkills.forEach(skill => {
    console.log(`  - ${skill.name}: ${skill.description}`);
  });
}

/**
 * Demo 5: Error Handling
 */
export async function demo5_ErrorHandling() {
  console.log('\n🎯 DEMO 5: Error Handling\n');
  
  const registry = ToolRegistry.getInstance();
  const agentConfig: AgentConfig = {
    personality: {
      friendliness: 0.8,
      formality: 0.7,
      proactiveness: 0.6,
      detail_orientation: 0.9
    },
    skills: [],
    knowledge_bases: [],
    llm_config: {
      provider: 'openai',
      model: 'gpt-4-turbo-preview',
      temperature: 0.7
    }
  };
  
  const agent = new ToolEnabledAgent('test-agent', agentConfig, registry);
  agent.attachTool('email-tool');
  
  // Try to execute a skill the agent doesn't have
  console.log('❌ Attempting to use unavailable skill...');
  const result1 = await agent.executeSkill('nonexistent_skill', {});
  console.log('Result:', result1);
  
  // Try with missing required parameter
  console.log('\n❌ Attempting skill with missing parameter...');
  const result2 = await agent.executeSkill('parse_email', {
    // Missing emailContent parameter
  });
  console.log('Result:', result2);
}

/**
 * Run all demos
 */
export async function runAllDemos() {
  console.log('🚀 TOOLS & SKILLS FRAMEWORK DEMO\n');
  console.log('================================\n');
  
  try {
    await demo1_BasicEmailTool();
    await demo2_CRMTool();
    await demo3_MultiToolAgent();
    await demo4_ToolRegistry();
    await demo5_ErrorHandling();
    
    console.log('\n✅ All demos completed successfully!');
  } catch (error) {
    console.error('\n❌ Demo failed:', error);
  }
}

// Export individual demos for testing
export default {
  demo1_BasicEmailTool,
  demo2_CRMTool,
  demo3_MultiToolAgent,
  demo4_ToolRegistry,
  demo5_ErrorHandling,
  runAllDemos
};



