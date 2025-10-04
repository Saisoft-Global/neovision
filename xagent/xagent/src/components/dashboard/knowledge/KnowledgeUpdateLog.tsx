import React from 'react';
import { Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

interface KnowledgeUpdate {
  id: string;
  type: 'feedback' | 'user_action' | 'external';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface KnowledgeUpdateLogProps {
  updates: KnowledgeUpdate[];
}

export const KnowledgeUpdateLog: React.FC<KnowledgeUpdateLogProps> = ({ updates }) => {
  if (!updates.length) {
    return null;
  }

  const getUpdateIcon = (type: KnowledgeUpdate['type']) => {
    switch (type) {
      case 'feedback':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'user_action':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'external':
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
    }
  };

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold mb-4">Recent Updates</h2>
      <div className="space-y-4">
        {updates.map((update) => (
          <div key={update.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
            {getUpdateIcon(update.type)}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900">{update.content}</p>
              <time className="text-xs text-gray-500">
                {format(update.timestamp, 'PPp')}
              </time>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};