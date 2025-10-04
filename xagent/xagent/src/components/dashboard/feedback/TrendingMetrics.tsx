import React from 'react';
import { TrendingUp, Users, BarChart3 } from 'lucide-react';

interface TrendingMetricsProps {
  trends: Record<string, any> | null;
}

export const TrendingMetrics: React.FC<TrendingMetricsProps> = ({ trends }) => {
  if (!trends) return null;

  const totalFeedback = Object.values(trends).reduce(
    (sum: number, t: any) => sum + t.count,
    0
  );

  const averageScore = Object.values(trends).reduce(
    (sum: number, t: any) => sum + t.averageScore * t.count,
    0
  ) / totalFeedback;

  const positiveRate = Object.values(trends).reduce(
    (sum: number, t: any) => sum + t.positiveRate * t.count,
    0
  ) / totalFeedback;

  return (
    <>
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center gap-2 text-green-600 mb-2">
          <TrendingUp className="w-5 h-5" />
          <h3 className="font-medium">Success Rate</h3>
        </div>
        <p className="text-2xl font-bold">{positiveRate.toFixed(1)}%</p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center gap-2 text-blue-600 mb-2">
          <Users className="w-5 h-5" />
          <h3 className="font-medium">Total Feedback</h3>
        </div>
        <p className="text-2xl font-bold">{totalFeedback}</p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center gap-2 text-purple-600 mb-2">
          <BarChart3 className="w-5 h-5" />
          <h3 className="font-medium">Average Score</h3>
        </div>
        <p className="text-2xl font-bold">{averageScore.toFixed(2)}</p>
      </div>
    </>
  );
};