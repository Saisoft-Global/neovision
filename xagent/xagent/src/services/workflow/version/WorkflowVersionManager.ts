import { getSupabaseClient } from '../../../config/supabase';
import type { Workflow } from '../../../types/workflow';

export class WorkflowVersionManager {
  private supabase;

  constructor() {
    this.supabase = getSupabaseClient();
  }

  async createVersion(workflow: Workflow): Promise<string> {
    const { data, error } = await this.supabase
      .from('workflow_versions')
      .insert({
        workflow_id: workflow.id,
        version: await this.getNextVersion(workflow.id),
        content: workflow,
        created_at: new Date(),
      })
      .select()
      .single();

    if (error) throw error;
    return data.id;
  }

  private async getNextVersion(workflowId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from('workflow_versions')
      .select('version')
      .eq('workflow_id', workflowId)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return (data?.version || 0) + 1;
  }

  async getVersion(workflowId: string, version?: number): Promise<Workflow> {
    const query = this.supabase
      .from('workflow_versions')
      .select('*')
      .eq('workflow_id', workflowId);

    if (version) {
      query.eq('version', version);
    } else {
      query.order('version', { ascending: false }).limit(1);
    }

    const { data, error } = await query.single();
    if (error) throw error;
    return data.content;
  }

  async getHistory(workflowId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('workflow_versions')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('version', { ascending: false });

    if (error) throw error;
    return data;
  }
}