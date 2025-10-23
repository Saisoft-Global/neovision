/**
 * Agent-Tool Mapping Configuration
 * 
 * Defines which tools are loaded for each agent type.
 * This ensures agents ONLY load tools they need, preventing:
 * - Memory waste (HR Agent loading banking tools)
 * - Security risks (unnecessary tool access)
 * - Confusion (wrong tools for wrong tasks)
 * 
 * PRINCIPLE: Each agent is a specialist with domain-specific tools!
 */

export interface AgentToolMapping {
  [agentType: string]: string[];
}

/**
 * Maps agent types to their allowed tools
 * 
 * HR Agent → Email, Calendar, Document tools
 * Banking Agent → Banking API tools
 * Travel Agent → Flight, Hotel booking tools
 * etc.
 */
export const AGENT_TOOL_MAPPING: AgentToolMapping = {
  // HR & People Management
  'hr': [
    'email-tool',           // For employee communication
    // Calendar tools would go here
    // Document tools would go here
  ],
  
  // Customer Support & Banking
  'customer_support': [
    '550e8400-e29b-41d4-a716-446655440001',  // HDFC Bank API
    '550e8400-e29b-41d4-a716-446655440002',  // ICICI Bank API
    'crm-tool',             // For customer management
    // Ticketing tools would go here
  ],
  
  // Travel & Booking
  'travel': [
    // Flight booking tools would go here
    // Hotel booking tools would go here
    // Browser automation for fallback
  ],
  
  // Sales & CRM
  'sales': [
    'crm-tool',             // Salesforce/HubSpot
    'email-tool',           // For outreach
    // Analytics tools would go here
  ],
  
  // Finance & Accounting
  'finance': [
    'zoho-tool',            // Invoice, Books
    // Accounting tools would go here
    // Payment tools would go here
  ],
  
  // Productivity & Task Management
  'productivity': [
    'email-tool',
    // Task management tools would go here
    // Calendar tools would go here
  ],
  
  // General/Default (minimal tools)
  'general': [
    'email-tool',           // Basic communication
  ],
  
  // Tool-Enabled (explicitly configured, loads from agent config)
  'tool_enabled': [], // Will load from agent.tools configuration
};

/**
 * Get tools for a specific agent type
 * 
 * @param agentType - Type of agent (hr, customer_support, travel, etc.)
 * @param customTools - Additional tools from agent configuration
 * @returns Array of tool IDs to load
 */
export function getToolsForAgent(
  agentType: string, 
  customTools: string[] = []
): string[] {
  // Get default tools for agent type
  const defaultTools = AGENT_TOOL_MAPPING[agentType] || AGENT_TOOL_MAPPING['general'];
  
  // For tool_enabled type, use only custom tools
  if (agentType === 'tool_enabled') {
    return customTools;
  }
  
  // Merge default tools with custom tools (remove duplicates)
  const allTools = [...new Set([...defaultTools, ...customTools])];
  
  console.log(`🔧 Agent type "${agentType}" will load ${allTools.length} tools:`, allTools);
  
  return allTools;
}

/**
 * Check if a tool is allowed for an agent type
 * 
 * @param agentType - Type of agent
 * @param toolId - Tool ID to check
 * @returns true if tool is allowed for this agent type
 */
export function isToolAllowedForAgent(agentType: string, toolId: string): boolean {
  const allowedTools = AGENT_TOOL_MAPPING[agentType] || [];
  return allowedTools.includes(toolId);
}

/**
 * Get agent types that can use a specific tool
 * 
 * @param toolId - Tool ID
 * @returns Array of agent types that use this tool
 */
export function getAgentTypesForTool(toolId: string): string[] {
  const agentTypes: string[] = [];
  
  for (const [agentType, tools] of Object.entries(AGENT_TOOL_MAPPING)) {
    if (tools.includes(toolId)) {
      agentTypes.push(agentType);
    }
  }
  
  return agentTypes;
}

/**
 * Validate tool attachment
 * Prevents attaching wrong tools to wrong agents
 * 
 * @param agentType - Type of agent
 * @param toolId - Tool ID to attach
 * @returns Validation result with message
 */
export function validateToolAttachment(
  agentType: string, 
  toolId: string
): { valid: boolean; message: string } {
  // tool_enabled type can have any tools
  if (agentType === 'tool_enabled') {
    return { valid: true, message: 'Tool-enabled agents can use any tools' };
  }
  
  const allowedTools = AGENT_TOOL_MAPPING[agentType] || [];
  const isAllowed = allowedTools.includes(toolId);
  
  if (isAllowed) {
    return { valid: true, message: `Tool ${toolId} is allowed for ${agentType} agents` };
  } else {
    const appropriateAgents = getAgentTypesForTool(toolId);
    const suggestion = appropriateAgents.length > 0
      ? `This tool is meant for: ${appropriateAgents.join(', ')} agents`
      : 'This tool is not mapped to any agent type yet';
    
    return { 
      valid: false, 
      message: `⚠️ Tool ${toolId} is not typically used by ${agentType} agents. ${suggestion}`
    };
  }
}



