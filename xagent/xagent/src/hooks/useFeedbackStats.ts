import { useState, useEffect } from 'react';
import { FeedbackCollector } from '../services/feedback/FeedbackCollector';
import type { FeedbackEntry } from '../types/feedback';

interface FeedbackStats {
  successRate: number;
  totalFeedback: number;
  averageScore: number;
}

export function useFeedbackStats(entityType: string, entityId?: string) {
  const [stats, setStats] = useState<FeedbackStats>({
    successRate: 0,
    totalFeedback: 0,
    averageScore: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const feedback = await FeedbackCollector.getInstance().getFeedbackByType(
          `${entityType}_quality`
        );

        const filteredFeedback = entityId
          ? feedback.filter(f => f[`${entityType}Id` as keyof FeedbackEntry] === entityId)
          : feedback;

        const totalFeedback = filteredFeedback.length;
        if (totalFeedback === 0) {
          setStats({
            successRate: 0,
            totalFeedback: 0,
            averageScore: 0,
          });
          return;
        }

        const successfulFeedback = filteredFeedback.filter(f => f.score >= 0.5).length;
        const totalScore = filteredFeedback.reduce((sum, f) => sum + (f.score || 0), 0);

        setStats({
          successRate: (successfulFeedback / totalFeedback) * 100,
          totalFeedback,
          averageScore: totalScore / totalFeedback,
        });
      } catch (error) {
        console.error('Failed to load feedback stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();
  }, [entityType, entityId]);

  return { stats, isLoading };
}