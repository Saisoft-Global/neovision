import { getSupabaseClient } from '../../config/supabase';
import type { FeedbackEntry } from '../../types/feedback';

export class FeedbackCollector {
  private static instance: FeedbackCollector;
  private supabase;

  private constructor() {
    this.supabase = getSupabaseClient();
  }

  public static getInstance(): FeedbackCollector {
    if (!this.instance) {
      this.instance = new FeedbackCollector();
    }
    return this.instance;
  }

  async collectFeedback(feedback: Omit<FeedbackEntry, 'id' | 'timestamp'>): Promise<void> {
    const { error } = await this.supabase
      .from('feedback')
      .insert({
        ...feedback,
        timestamp: new Date(),
      });

    if (error) throw error;
  }

  async getFeedbackByType(type: string): Promise<FeedbackEntry[]> {
    const { data, error } = await this.supabase
      .from('feedback')
      .select('*')
      .eq('type', type);

    if (error) throw error;
    return data;
  }
}