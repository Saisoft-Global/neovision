import { z } from 'zod';

/**
 * Dynamic Tools & Skills Framework
 * 
 * Architecture:
 * - Tool: External system integration (Gmail, Salesforce, etc.)
 * - Skill: Specific capability within a tool (parse_email, create_lead, etc.)
 * - Function: Executable code that performs the action
 */

// Parameter definition for a skill
export const SkillParameterSchema = z.object({
  name: z.string(),
  type: z.enum(['string', 'number', 'boolean', 'object', 'array']),
  description: z.string(),
  required: z.boolean(),
  default: z.unknown().optional(),
});

// Tool configuration
export const ToolConfigSchema = z.object({
  apiKey: z.string().optional(),
  endpoint: z.string().optional(),
  authType: z.enum(['oauth', 'api_key', 'basic', 'none']),
  credentials: z.record(z.string()).optional(),
});

// Skill within a tool
export const ToolSkillSchema = z.object({
  name: z.string(),
  description: z.string(),
  toolId: z.string(),
  parameters: z.array(SkillParameterSchema),
  requiredAuth: z.array(z.string()).optional(),
});

// Tool definition
export const ToolSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  type: z.enum(['email', 'crm', 'calendar', 'database', 'file_storage', 'analytics', 'custom']),
  config: ToolConfigSchema,
  isActive: z.boolean().default(true),
});

// Export types
export type SkillParameter = z.infer<typeof SkillParameterSchema>;
export type ToolConfig = z.infer<typeof ToolConfigSchema>;
export type ToolSkillDefinition = z.infer<typeof ToolSkillSchema>;
export type ToolDefinition = z.infer<typeof ToolSchema>;

/**
 * Extended ToolSkill with executable function
 * (Can't be in Zod schema since functions aren't serializable)
 */
export interface ToolSkill extends ToolSkillDefinition {
  execute: (params: Record<string, any>, context?: any) => Promise<any>;
}

/**
 * Extended Tool with skills
 */
export interface Tool extends ToolDefinition {
  skills: ToolSkill[];
}

/**
 * Result of skill execution
 */
export interface SkillExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    skillName: string;
    toolName: string;
    executionTime: number;
    timestamp: string;
  };
}

/**
 * Intent analysis result from natural language
 */
export interface IntentAnalysis {
  skillName: string;
  confidence: number;
  parameters: Record<string, any>;
  reasoning?: string;
}

/**
 * Tool attachment record (for agents)
 */
export interface ToolAttachment {
  toolId: string;
  attachedAt: string;
  permissions?: string[];
}


