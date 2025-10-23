import { getSupabaseClient } from '../../config/supabase';

export class ModelVersionManager {
  private static instance: ModelVersionManager;
  private supabase;

  private constructor() {
    this.supabase = getSupabaseClient();
  }

  public static getInstance(): ModelVersionManager {
    if (!this.instance) {
      this.instance = new ModelVersionManager();
    }
    return this.instance;
  }

  async createVersion(modelId: string, metadata: any): Promise<string> {
    const { data, error } = await this.supabase
      .from('model_versions')
      .insert({
        model_id: modelId,
        version: await this.getNextVersion(modelId),
        metadata,
        status: 'active',
        created_at: new Date(),
      })
      .select()
      .single();

    if (error) throw error;
    return data.id;
  }

  async rollbackToVersion(modelId: string, version: number): Promise<void> {
    const { error: deactivateError } = await this.supabase
      .from('model_versions')
      .update({ status: 'inactive' })
      .eq('model_id', modelId)
      .eq('status', 'active');

    if (deactivateError) throw deactivateError;

    const { error: activateError } = await this.supabase
      .from('model_versions')
      .update({ status: 'active' })
      .eq('model_id', modelId)
      .eq('version', version);

    if (activateError) throw activateError;
  }

  private async getNextVersion(modelId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from('model_versions')
      .select('version')
      .eq('model_id', modelId)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return (data?.version || 0) + 1;
  }
}