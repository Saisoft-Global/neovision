import React from 'react';
import { RotateCcw, Check, AlertTriangle } from 'lucide-react';

interface VersionHistoryProps {
  onRollback: (version: number) => Promise<void>;
}

export const VersionHistory: React.FC<VersionHistoryProps> = ({ onRollback }) => {
  const versions = [
    { version: 3, date: '2024-02-15', status: 'active', metrics: { accuracy: 0.945 } },
    { version: 2, date: '2024-02-01', status: 'inactive', metrics: { accuracy: 0.932 } },
    { version: 1, date: '2024-01-15', status: 'inactive', metrics: { accuracy: 0.918 } },
  ];

  return (
    <div className="space-y-4">
      {versions.map((v) => (
        <div key={v.version} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <div className="flex items-center gap-2">
              {v.status === 'active' ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-gray-400" />
              )}
              <span className="font-medium">Version {v.version}</span>
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {v.date} • Accuracy: {v.metrics.accuracy.toFixed(3)}
            </div>
          </div>
          
          {v.status !== 'active' && (
            <button
              onClick={() => onRollback(v.version)}
              className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Rollback</span>
            </button>
          )}
        </div>
      ))}
    </div>
  );
};