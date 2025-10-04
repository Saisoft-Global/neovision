import { z } from 'zod';

export const AgentPersonalitySchema = z.object({
  friendliness: z.number().min(0).max(1),
  formality: z.number().min(0).max(1),
  proactiveness: z.number().min(0).max(1),
  detail_orientation: z.number().min(0).max(1),
});

export const AgentSkillSchema = z.object({
  name: z.string(),
  level: z.number().min(1).max(5),
  config: z.record(z.unknown()).optional(),
});

export const AgentKnowledgeBaseSchema = z.object({
  name: z.string(),
  type: z.enum(['pinecone', 'neo4j', 'postgres']),
  connection_config: z.record(z.unknown()),
});

export const AgentConfigSchema = z.object({
  personality: AgentPersonalitySchema,
  skills: z.array(AgentSkillSchema),
  knowledge_bases: z.array(AgentKnowledgeBaseSchema),
  llm_config: z.object({
    provider: z.enum(['openai', 'rasa']),
    model: z.string(),
    temperature: z.number().min(0).max(1),
  }),
});

export type AgentPersonality = z.infer<typeof AgentPersonalitySchema>;
export type AgentSkill = z.infer<typeof AgentSkillSchema>;
export type AgentKnowledgeBase = z.infer<typeof AgentKnowledgeBaseSchema>;
export type AgentConfig = z.infer<typeof AgentConfigSchema>;