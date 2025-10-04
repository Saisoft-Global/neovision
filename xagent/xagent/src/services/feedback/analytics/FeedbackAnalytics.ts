import { supabase } from '../../../config/supabase';
import type { FeedbackEntry } from '../../../types/feedback';

export class FeedbackAnalytics {
  private static instance: FeedbackAnalytics;

  private constructor() {}

  public static getInstance(): FeedbackAnalytics {
    if (!this.instance) {
      this.instance = new FeedbackAnalytics();
    }
    return this.instance;
  }

  async getFeedbackTrends(timeframe: 'day' | 'week' | 'month'): Promise<any> {
    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .gte('timestamp', this.getTimeframeDate(timeframe));

    if (error) throw error;
    return this.analyzeTrends(data);
  }

  // ... rest of the class implementation remains the same
}