import { supabase } from '../../../config/supabase';
import type { FeedbackEntry } from '../../../types/feedback';

export class LearningMetrics {
  async trackLearningProgress(agentId: string, improvements: any[]): Promise<void> {
    const metrics = this.calculateMetrics(improvements);
    
    await this.storeLearningMetrics(agentId, metrics);
  }

  private calculateMetrics(improvements: any[]): Record<string, number> {
    return {
      improvementCount: improvements.length,
      averageConfidence: this.calculateAverageConfidence(improvements),
      successRate: this.calculateSuccessRate(improvements),
    };
  }

  private calculateAverageConfidence(improvements: any[]): number {
    if (!improvements.length) return 0;
    const sum = improvements.reduce((acc, imp) => acc + (imp.confidence || 0), 0);
    return sum / improvements.length;
  }

  private calculateSuccessRate(improvements: any[]): number {
    if (!improvements.length) return 0;
    const successful = improvements.filter(imp => imp.success).length;
    return (successful / improvements.length) * 100;
  }

  private async storeLearningMetrics(agentId: string, metrics: Record<string, number>): Promise<void> {
    const { error } = await supabase
      .from('agent_learning_metrics')
      .insert({
        agent_id: agentId,
        metrics,
        timestamp: new Date(),
      });

    if (error) throw error;
  }
}