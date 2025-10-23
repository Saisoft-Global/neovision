import { z } from 'zod';

// ===========================
// LLM CONFIGURATION
// ===========================

/**
 * Supported LLM Providers
 */
export const LLMProviderEnum = z.enum([
  'openai',      // GPT-3.5, GPT-4
  'anthropic',   // Claude 3
  'mistral',     // Mistral Large, Medium, Small
  'google',      // Gemini Pro, Ultra
  'groq',        // Fast inference
  'ollama',      // Local models
  'rasa',        // Open source
  'cohere',      // Command models
  'perplexity',  // Research-focused
  'together',    // Open models
  'replicate'    // Various models
]);

export type LLMProvider = z.infer<typeof LLMProviderEnum>;

/**
 * LLM Configuration Schema
 */
export const LLMConfigSchema = z.object({
  provider: LLMProviderEnum,
  model: z.string(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().optional(),
  topP: z.number().min(0).max(1).optional(),
  
  // Metadata for optimization
  reason: z.string().optional(),           // Why this LLM?
  costPerMillion: z.number().optional(),   // Cost tracking
  avgLatency: z.number().optional(),       // Performance tracking
});

export type LLMConfig = z.infer<typeof LLMConfigSchema>;

// ===========================
// AGENT FUNCTIONS
// ===========================

/**
 * Function Parameter Schema
 */
export const FunctionParameterSchema = z.object({
  name: z.string(),
  type: z.string(),
  description: z.string(),
  required: z.boolean().default(false),
  default: z.unknown().optional(),
});

export type FunctionParameter = z.infer<typeof FunctionParameterSchema>;

/**
 * Function Return Type Schema
 */
export const FunctionReturnSchema = z.object({
  type: z.string(),
  description: z.string(),
});

export type FunctionReturn = z.infer<typeof FunctionReturnSchema>;

/**
 * Agent Function Schema
 * Represents a single executable function
 */
export const AgentFunctionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  type: z.enum(['mcp', 'api', 'local', 'workflow']),
  
  // For MCP functions
  mcpServer: z.string().optional(),
  mcpEndpoint: z.string().optional(),
  
  // For API functions
  apiEndpoint: z.string().optional(),
  apiMethod: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).optional(),
  apiHeaders: z.record(z.string()).optional(),
  
  // For local functions
  implementation: z.string().optional(), // Function reference/path
  
  // For workflow functions
  workflowId: z.string().optional(),
  
  // Common
  parameters: z.array(FunctionParameterSchema).optional(),
  returns: FunctionReturnSchema.optional(),
  requiresAuth: z.boolean().default(false),
  timeout: z.number().optional(), // Milliseconds
});

export type AgentFunction = z.infer<typeof AgentFunctionSchema>;

// ===========================
// AGENT TOOLS
// ===========================

/**
 * Agent Tool Schema
 * A tool provides multiple functions
 */
export const AgentToolSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  type: z.enum(['mcp', 'integration', 'local', 'workflow']),
  provider: z.string().optional(), // 'google', 'salesforce', etc.
  
  // Functions this tool provides
  functions: z.array(AgentFunctionSchema),
  
  // Tool-level configuration
  config: z.object({
    apiKey: z.string().optional(),
    endpoint: z.string().optional(),
    timeout: z.number().optional(),
  }).optional(),
  
  // Availability
  isAvailable: z.boolean().default(true),
  lastChecked: z.date().optional(),
});

export type AgentTool = z.infer<typeof AgentToolSchema>;

// ===========================
// AGENT CAPABILITIES
// ===========================

/**
 * Agent Capability Schema
 * A capability uses one or more tools to accomplish a task
 */
export const AgentCapabilitySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  
  // Tools required for this capability
  requiredTools: z.array(z.string()), // Tool IDs
  
  // Execution strategy
  executionStrategy: z.enum(['direct', 'workflow', 'hybrid']),
  
  // Which workflow to use (if workflow-based)
  workflowId: z.string().optional(),
  
  // Metadata
  estimatedDuration: z.number().optional(), // Milliseconds
  successRate: z.number().min(0).max(1).optional(),
  isAvailable: z.boolean().default(true),
});

export type AgentCapability = z.infer<typeof AgentCapabilitySchema>;

// ===========================
// AGENT SKILLS
// ===========================

/**
 * Agent Skill Schema (Enhanced)
 * A skill is a high-level ability that uses capabilities
 */
export const AgentSkillSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  level: z.number().min(1).max(5),
  description: z.string().optional(),
  
  // Capabilities for this skill
  capabilities: z.array(AgentCapabilitySchema).optional(),
  
  // Preferred LLM for this skill
  preferred_llm: LLMConfigSchema.optional(),
  
  // Original config (backward compatible)
  config: z.record(z.unknown()).optional(),
});

export type AgentSkill = z.infer<typeof AgentSkillSchema>;

// ===========================
// AGENT CORE
// ===========================

export const AgentPersonalitySchema = z.object({
  friendliness: z.number().min(0).max(1),
  formality: z.number().min(0).max(1),
  proactiveness: z.number().min(0).max(1),
  detail_orientation: z.number().min(0).max(1),
});

export type AgentPersonality = z.infer<typeof AgentPersonalitySchema>;

export const AgentKnowledgeBaseSchema = z.object({
  name: z.string(),
  type: z.enum(['pinecone', 'neo4j', 'postgres']),
  connection_config: z.record(z.unknown()),
});

export type AgentKnowledgeBase = z.infer<typeof AgentKnowledgeBaseSchema>;

/**
 * Agent Configuration Schema (Enhanced)
 */
export const AgentConfigSchema = z.object({
  personality: AgentPersonalitySchema,
  skills: z.array(AgentSkillSchema),
  knowledge_bases: z.array(AgentKnowledgeBaseSchema),
  
  // Primary LLM (default for all tasks)
  llm_config: LLMConfigSchema,
  
  // Task-specific LLM overrides
  llm_overrides: z.object({
    research: LLMConfigSchema.optional(),
    analysis: LLMConfigSchema.optional(),
    writing: LLMConfigSchema.optional(),
    code: LLMConfigSchema.optional(),
    summarization: LLMConfigSchema.optional(),
    translation: LLMConfigSchema.optional(),
    conversation: LLMConfigSchema.optional(),
  }).optional(),
  
  // Fallback LLM (if primary fails)
  fallback_llm: LLMConfigSchema.optional(),
  
  // Workflows
  workflows: z.array(z.string()).optional(),
  
  // System prompt
  system_prompt: z.object({
    role: z.string().optional(),
    goal: z.string().optional(),
    instructions: z.string().optional(),
  }).optional(),
  
  // Workforce capabilities
  workforce: z.object({
    level: z.enum(['worker', 'manager', 'director']),
    department: z.string(),
    confidenceThreshold: z.number().min(0.1).max(1.0).optional(),
    maxComplexity: z.number().min(1).max(10).optional(),
    humanSupervisor: z.string().optional(),
    aiSupervisor: z.string().optional(),
  }).optional(),
});

export type AgentConfig = z.infer<typeof AgentConfigSchema>;