import { createClient } from '@supabase/supabase-js';
import type { KnowledgeNode, KnowledgeRelation } from '../../../types/knowledge';

export class KnowledgeVersionManager {
  private static instance: KnowledgeVersionManager;
  private supabase;

  private constructor() {
    this.supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    );
  }

  public static getInstance(): KnowledgeVersionManager {
    if (!this.instance) {
      this.instance = new KnowledgeVersionManager();
    }
    return this.instance;
  }

  async createVersion(
    nodes: KnowledgeNode[],
    relations: KnowledgeRelation[],
    metadata: Record<string, unknown>
  ): Promise<string> {
    const { data, error } = await this.supabase
      .from('knowledge_versions')
      .insert({
        version: await this.getNextVersion(),
        nodes,
        relations,
        metadata,
        created_at: new Date(),
        status: 'active',
      })
      .select()
      .single();

    if (error) throw error;
    return data.id;
  }

  async rollbackToVersion(versionId: string): Promise<void> {
    // Deactivate current version
    await this.supabase
      .from('knowledge_versions')
      .update({ status: 'inactive' })
      .eq('status', 'active');

    // Activate target version
    await this.supabase
      .from('knowledge_versions')
      .update({ status: 'active' })
      .eq('id', versionId);
  }

  private async getNextVersion(): Promise<number> {
    const { data, error } = await this.supabase
      .from('knowledge_versions')
      .select('version')
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return (data?.version || 0) + 1;
  }
}