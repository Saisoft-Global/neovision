import { createClient } from '@supabase/supabase-js';
import type { TrainingDataset } from '../../types/training';

export class DatasetManager {
  private static instance: DatasetManager;
  private supabase;

  private constructor() {
    this.supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    );
  }

  public static getInstance(): DatasetManager {
    if (!this.instance) {
      this.instance = new DatasetManager();
    }
    return this.instance;
  }

  async uploadDataset(dataset: TrainingDataset): Promise<void> {
    const { error } = await this.supabase
      .from('training_datasets')
      .insert({
        name: dataset.name,
        description: dataset.description,
        data: dataset.data,
        metadata: dataset.metadata,
      });

    if (error) throw error;
  }

  async getDatasetStatus(datasetId: string): Promise<string> {
    const { data, error } = await this.supabase
      .from('training_datasets')
      .select('status')
      .eq('id', datasetId)
      .single();

    if (error) throw error;
    return data.status;
  }
}