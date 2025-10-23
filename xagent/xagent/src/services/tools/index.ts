/**
 * Tools & Skills Framework - Central Export
 * 
 * This file provides a single entry point for all tool-related functionality
 */

// Export the registry
export { ToolRegistry, toolRegistry } from './ToolRegistry';

// Export tool implementations
export { EmailTool } from './implementations/EmailTool';
export { CRMTool } from './implementations/CRMTool';

// Export types
export type { 
  Tool, 
  ToolSkill, 
  ToolConfig,
  SkillParameter,
  SkillExecutionResult,
  IntentAnalysis,
  ToolAttachment
} from '../../types/tool-framework';

/**
 * Initialize all tools
 * Call this once at application startup
 */
export function initializeTools(): void {
  const { toolRegistry } = require('./ToolRegistry');
  const { EmailTool } = require('./implementations/EmailTool');
  const { CRMTool } = require('./implementations/CRMTool');
  
  // Register all available tools
  toolRegistry.registerTool(EmailTool);
  toolRegistry.registerTool(CRMTool);
  
  console.log('✅ Tools initialized:', toolRegistry.getStatistics());
}

/**
 * Get all registered tool IDs
 */
export function getAvailableToolIds(): string[] {
  const { toolRegistry } = require('./ToolRegistry');
  return toolRegistry.getTools().map((t: any) => t.id);
}

/**
 * Get all registered tools with metadata
 */
export function getAvailableTools() {
  const { toolRegistry } = require('./ToolRegistry');
  return toolRegistry.getTools().map((tool: any) => ({
    id: tool.id,
    name: tool.name,
    description: tool.description,
    type: tool.type,
    isActive: tool.isActive,
    skillCount: tool.skills.length,
    skills: tool.skills.map((skill: any) => ({
      name: skill.name,
      description: skill.description,
      parameters: skill.parameters
    }))
  }));
}

