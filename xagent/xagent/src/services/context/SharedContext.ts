import { getSupabaseClient } from '../../config/supabase';

export class SharedContext {
  private static instance: SharedContext;
  private supabase;
  private cache: Map<string, any>;

  private constructor() {
    this.supabase = getSupabaseClient();
    this.cache = new Map();
  }

  public static getInstance(): SharedContext {
    if (!this.instance) {
      this.instance = new SharedContext();
    }
    return this.instance;
  }

  async get(key: string): Promise<any> {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const { data, error } = await this.supabase
      .from('shared_context')
      .select('value')
      .eq('key', key)
      .single();

    if (error) return null;
    
    this.cache.set(key, data.value);
    return data.value;
  }

  async set(key: string, value: any): Promise<void> {
    const { error } = await this.supabase
      .from('shared_context')
      .upsert({
        key,
        value,
        updated_at: new Date(),
      });

    if (error) throw error;
    this.cache.set(key, value);
  }

  async delete(key: string): Promise<void> {
    const { error } = await this.supabase
      .from('shared_context')
      .delete()
      .eq('key', key);

    if (error) throw error;
    this.cache.delete(key);
  }
}