import { getSupabaseClient } from '../../../config/supabase';
import type { Workflow } from '../../../types/workflow';
import { WorkflowGenerator } from '../WorkflowGenerator';

export class WorkflowTemplateManager {
  private supabase;
  private generator: WorkflowGenerator;

  constructor() {
    this.supabase = getSupabaseClient();
    this.generator = new WorkflowGenerator();
  }

  async saveTemplate(workflow: Workflow, name: string): Promise<string> {
    const { data, error } = await this.supabase
      .from('workflow_templates')
      .insert({
        name,
        workflow: workflow,
        created_at: new Date(),
      })
      .select()
      .single();

    if (error) throw error;
    return data.id;
  }

  async getTemplate(templateId: string): Promise<Workflow> {
    const { data, error } = await this.supabase
      .from('workflow_templates')
      .select('workflow')
      .eq('id', templateId)
      .single();

    if (error) throw error;
    return data.workflow;
  }

  async listTemplates(): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('workflow_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async instantiateTemplate(
    templateId: string,
    parameters: Record<string, unknown>
  ): Promise<Workflow> {
    const template = await this.getTemplate(templateId);
    return this.generator.customizeWorkflow(template, parameters);
  }
}