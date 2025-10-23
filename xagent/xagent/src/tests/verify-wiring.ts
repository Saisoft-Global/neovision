/**
 * Wiring Verification Test Script
 * 
 * Run this script to verify that all components are properly wired
 * Usage: Import and call verifyWiring() in your browser console or test file
 */

import { toolRegistry } from '../services/tools/ToolRegistry';
import { AgentFactory } from '../services/agent/AgentFactory';
import { getAvailableTools, getAvailableToolIds } from '../services/tools';
import { initializeTools, areToolsInitialized } from '../services/initialization/toolsInitializer';
import type { AgentConfig } from '../types/agent-framework';

export async function verifyWiring(): Promise<void> {
  console.log('🔍 Starting Wiring Verification...\n');
  
  const results: { test: string; status: 'PASS' | 'FAIL'; message?: string }[] = [];

  // Test 1: Tools Initialization
  try {
    if (!areToolsInitialized()) {
      initializeTools();
    }
    results.push({ test: 'Tools Initialization', status: 'PASS' });
  } catch (error) {
    results.push({ 
      test: 'Tools Initialization', 
      status: 'FAIL', 
      message: (error as Error).message 
    });
  }

  // Test 2: Tool Registry Access
  try {
    const stats = toolRegistry.getStatistics();
    if (stats.totalTools === 2 && stats.totalSkills === 10) {
      results.push({ test: 'Tool Registry Access', status: 'PASS' });
    } else {
      results.push({ 
        test: 'Tool Registry Access', 
        status: 'FAIL', 
        message: `Expected 2 tools and 10 skills, got ${stats.totalTools} tools and ${stats.totalSkills} skills` 
      });
    }
  } catch (error) {
    results.push({ 
      test: 'Tool Registry Access', 
      status: 'FAIL', 
      message: (error as Error).message 
    });
  }

  // Test 3: Get Available Tools
  try {
    const tools = getAvailableTools();
    if (tools.length === 2) {
      const hasEmailTool = tools.some(t => t.id === 'email-tool');
      const hasCRMTool = tools.some(t => t.id === 'crm-tool');
      
      if (hasEmailTool && hasCRMTool) {
        results.push({ test: 'Get Available Tools', status: 'PASS' });
      } else {
        results.push({ 
          test: 'Get Available Tools', 
          status: 'FAIL', 
          message: 'Email or CRM tool missing' 
        });
      }
    } else {
      results.push({ 
        test: 'Get Available Tools', 
        status: 'FAIL', 
        message: `Expected 2 tools, got ${tools.length}` 
      });
    }
  } catch (error) {
    results.push({ 
      test: 'Get Available Tools', 
      status: 'FAIL', 
      message: (error as Error).message 
    });
  }

  // Test 4: Tool IDs
  try {
    const toolIds = getAvailableToolIds();
    if (toolIds.includes('email-tool') && toolIds.includes('crm-tool')) {
      results.push({ test: 'Get Tool IDs', status: 'PASS' });
    } else {
      results.push({ 
        test: 'Get Tool IDs', 
        status: 'FAIL', 
        message: 'Tool IDs incorrect' 
      });
    }
  } catch (error) {
    results.push({ 
      test: 'Get Tool IDs', 
      status: 'FAIL', 
      message: (error as Error).message 
    });
  }

  // Test 5: AgentFactory Singleton
  try {
    const factory1 = AgentFactory.getInstance();
    const factory2 = AgentFactory.getInstance();
    
    if (factory1 === factory2) {
      results.push({ test: 'AgentFactory Singleton', status: 'PASS' });
    } else {
      results.push({ 
        test: 'AgentFactory Singleton', 
        status: 'FAIL', 
        message: 'Multiple instances created' 
      });
    }
  } catch (error) {
    results.push({ 
      test: 'AgentFactory Singleton', 
      status: 'FAIL', 
      message: (error as Error).message 
    });
  }

  // Test 6: Create Tool-Enabled Agent (if Supabase configured)
  try {
    const factory = AgentFactory.getInstance();
    
    const config: AgentConfig = {
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

    const agent = await factory.createToolEnabledAgent(config, ['email-tool']);
    
    // Check if agent has core skills + email skills
    const agentSkills = agent.getSkills();
    if (agentSkills.length >= 10) { // 5 core + 5 email minimum
      results.push({ test: 'Create Tool-Enabled Agent', status: 'PASS' });
    } else {
      results.push({ 
        test: 'Create Tool-Enabled Agent', 
        status: 'FAIL', 
        message: `Expected at least 10 skills, got ${agentSkills.length}` 
      });
    }
  } catch (error) {
    // This might fail if Supabase not configured - that's okay
    results.push({ 
      test: 'Create Tool-Enabled Agent', 
      status: 'FAIL', 
      message: `(Expected if Supabase not configured) ${(error as Error).message}` 
    });
  }

  // Test 7: Core Skills Present
  try {
    const factory = AgentFactory.getInstance();
    
    const config: AgentConfig = {
      personality: {
        friendliness: 0.8,
        formality: 0.7,
        proactiveness: 0.6,
        detail_orientation: 0.9
      },
      skills: [{ name: 'custom_skill', level: 3 }],
      knowledge_bases: [],
      llm_config: {
        provider: 'openai',
        model: 'gpt-4-turbo-preview',
        temperature: 0.7
      }
    };

    const agent = await factory.createAgent('task', config);
    const coreCapabilities = agent.getCoreCapabilities();
    
    const hasNLU = coreCapabilities.includes('natural_language_understanding');
    const hasNLG = coreCapabilities.includes('natural_language_generation');
    const hasReasoning = coreCapabilities.includes('reasoning');
    
    if (hasNLU && hasNLG && hasReasoning) {
      results.push({ test: 'Core Skills Auto-Attachment', status: 'PASS' });
    } else {
      results.push({ 
        test: 'Core Skills Auto-Attachment', 
        status: 'FAIL', 
        message: 'Core skills not properly attached' 
      });
    }
  } catch (error) {
    results.push({ 
      test: 'Core Skills Auto-Attachment', 
      status: 'FAIL', 
      message: (error as Error).message 
    });
  }

  // Test 8: Tool Skills Presence
  try {
    const emailTool = toolRegistry.getTool('email-tool');
    if (emailTool && emailTool.skills.length === 5) {
      const hasParseEmail = emailTool.skills.some(s => s.name === 'parse_email');
      const hasSummarize = emailTool.skills.some(s => s.name === 'summarize_email');
      
      if (hasParseEmail && hasSummarize) {
        results.push({ test: 'Tool Skills Presence', status: 'PASS' });
      } else {
        results.push({ 
          test: 'Tool Skills Presence', 
          status: 'FAIL', 
          message: 'Expected skills missing' 
        });
      }
    } else {
      results.push({ 
        test: 'Tool Skills Presence', 
        status: 'FAIL', 
        message: 'Email tool or skills not found' 
      });
    }
  } catch (error) {
    results.push({ 
      test: 'Tool Skills Presence', 
      status: 'FAIL', 
      message: (error as Error).message 
    });
  }

  // Print Results
  console.log('\n📊 Verification Results:\n');
  console.log('━'.repeat(60));
  
  let passCount = 0;
  let failCount = 0;

  results.forEach(result => {
    const icon = result.status === 'PASS' ? '✅' : '❌';
    const statusColor = result.status === 'PASS' ? '\x1b[32m' : '\x1b[31m';
    const resetColor = '\x1b[0m';
    
    console.log(`${icon} ${result.test}: ${statusColor}${result.status}${resetColor}`);
    
    if (result.message) {
      console.log(`   └─ ${result.message}`);
    }
    
    if (result.status === 'PASS') passCount++;
    else failCount++;
  });

  console.log('━'.repeat(60));
  console.log(`\n📈 Summary: ${passCount} passed, ${failCount} failed\n`);

  if (failCount === 0) {
    console.log('🎉 All wiring verification tests passed!');
    console.log('✅ System is properly wired and ready for use.\n');
  } else {
    console.log('⚠️  Some tests failed. Review the errors above.');
    console.log('   Common causes:');
    console.log('   - Supabase not configured (agent creation tests)');
    console.log('   - Database migration not applied');
    console.log('   - Missing environment variables\n');
  }

  return;
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).verifyWiring = verifyWiring;
  console.log('💡 Wiring verification available!');
  console.log('   Run: verifyWiring()');
}

export default verifyWiring;

