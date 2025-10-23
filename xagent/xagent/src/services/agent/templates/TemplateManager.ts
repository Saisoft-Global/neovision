import { getSupabaseClient } from '../../../config/supabase';
import type { AgentTemplate } from './AgentTemplate';
import { AGENT_TEMPLATES } from './AgentTemplate';
import { KnowledgeService } from '../../knowledge/KnowledgeService';

export class TemplateManager {
  private static instance: TemplateManager;
  private supabase;
  private knowledgeService: KnowledgeService;

  private constructor() {
    this.supabase = getSupabaseClient();
    this.knowledgeService = KnowledgeService.getInstance();
  }

  public static getInstance(): TemplateManager {
    if (!this.instance) {
      this.instance = new TemplateManager();
    }
    return this.instance;
  }

  async createAgentFromTemplate(templateId: string): Promise<string> {
    const template = AGENT_TEMPLATES[templateId];
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Create agent in database
    const { data: agent, error } = await this.supabase
      .from('agents')
      .insert({
        type: template.type,
        name: template.name,
        config: template.config,
      })
      .select()
      .single();

    if (error) throw error;

    // Load preloaded knowledge
    await this.loadPreloadedKnowledge(agent.id, template);

    // Set up default workflows
    await this.setupDefaultWorkflows(agent.id, template);

    return agent.id;
  }

  private async loadPreloadedKnowledge(agentId: string, template: AgentTemplate): Promise<void> {
    for (const knowledge of template.preloadedKnowledge) {
      const { data: content, error } = await this.supabase
        .from('knowledge_base')
        .select('content')
        .eq('type', knowledge)
        .single();

      if (!error && content) {
        await this.knowledgeService.addDocument({
          id: crypto.randomUUID(),
          title: knowledge,
          content: content.content,
          type: 'txt',
          metadata: {
            agentId,
            uploadedAt: new Date(),
            size: content.content.length,
            mimeType: 'text/plain',
          },
          status: 'pending',
        });
      }
    }
  }

  private async setupDefaultWorkflows(agentId: string, template: AgentTemplate): Promise<void> {
    const { data: workflows, error } = await this.supabase
      .from('workflow_templates')
      .select('*')
      .in('name', template.defaultWorkflows);

    if (!error && workflows) {
      await this.supabase
        .from('agent_workflows')
        .insert(
          workflows.map(workflow => ({
            agent_id: agentId,
            workflow_id: workflow.id,
          }))
        );
    }
  }
}