import React from 'react';
import { BarChart3, TrendingUp, Users } from 'lucide-react';
import { useFeedbackStats } from '../../hooks/useFeedbackStats';

interface FeedbackStatsProps {
  entityType: 'response' | 'workflow' | 'agent';
  entityId?: string;
}

export const FeedbackStats: React.FC<FeedbackStatsProps> = ({
  entityType,
  entityId,
}) => {
  const { stats, isLoading } = useFeedbackStats(entityType, entityId);

  if (isLoading) {
    return <div className="animate-pulse">Loading stats...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center space-x-2 text-blue-600 mb-2">
          <TrendingUp className="w-5 h-5" />
          <h3 className="font-medium">Success Rate</h3>
        </div>
        <p className="text-2xl font-bold">{stats.successRate}%</p>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center space-x-2 text-green-600 mb-2">
          <Users className="w-5 h-5" />
          <h3 className="font-medium">Total Feedback</h3>
        </div>
        <p className="text-2xl font-bold">{stats.totalFeedback}</p>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center space-x-2 text-purple-600 mb-2">
          <BarChart3 className="w-5 h-5" />
          <h3 className="font-medium">Average Score</h3>
        </div>
        <p className="text-2xl font-bold">{stats.averageScore.toFixed(2)}</p>
      </div>
    </div>
  );
};