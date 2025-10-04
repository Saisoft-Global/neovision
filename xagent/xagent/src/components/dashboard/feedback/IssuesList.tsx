import React from 'react';
import { AlertCircle } from 'lucide-react';

interface IssuesListProps {
  issues: Record<string, number>;
}

export const IssuesList: React.FC<IssuesListProps> = ({ issues }) => {
  if (!issues) return null;

  return (
    <div className="space-y-4">
      {Object.entries(issues)
        .sort(([, a], [, b]) => b - a)
        .map(([category, count]) => (
          <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              <span className="font-medium capitalize">{category}</span>
            </div>
            <span className="px-2 py-1 bg-white rounded text-sm">
              {count} issues
            </span>
          </div>
        ))}
    </div>
  );
};