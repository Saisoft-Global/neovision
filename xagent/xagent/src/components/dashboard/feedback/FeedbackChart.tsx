import React from 'react';
import { BarChart3 } from 'lucide-react';

interface FeedbackChartProps {
  data: Record<string, any>;
}

export const FeedbackChart: React.FC<FeedbackChartProps> = ({ data }) => {
  if (!data) return null;

  return (
    <div className="space-y-4">
      {Object.entries(data).map(([type, metrics]) => (
        <div key={type} className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium capitalize">{type}</span>
            <span className="text-sm text-gray-500">
              {metrics.averageScore.toFixed(2)} avg score
            </span>
          </div>
          <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all"
              style={{ width: `${metrics.positiveRate}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};