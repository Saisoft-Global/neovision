import React from 'react';
import { TrendingUp, AlertCircle } from 'lucide-react';

export const TrainingMetrics: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <TrendingUp className="w-5 h-5" />
            <span className="font-medium">Accuracy</span>
          </div>
          <p className="text-2xl font-bold">94.5%</p>
        </div>
        
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 text-orange-500 mb-2">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Loss</span>
          </div>
          <p className="text-2xl font-bold">0.087</p>
        </div>
      </div>

      <div>
        <h4 className="font-medium mb-2">Training Progress</h4>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full w-3/4 bg-blue-600 rounded-full" />
        </div>
        <div className="flex justify-between mt-1 text-sm text-gray-500">
          <span>75% complete</span>
          <span>ETA: 45 minutes</span>
        </div>
      </div>
    </div>
  );
};