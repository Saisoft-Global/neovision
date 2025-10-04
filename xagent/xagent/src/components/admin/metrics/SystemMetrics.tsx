import React from 'react';
import { BarChart3, Users, Database } from 'lucide-react';
import { useSystemMetrics } from '../../../hooks/useSystemMetrics';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import { Alert } from '../../common/Alert';

export const SystemMetrics: React.FC = () => {
  const { metrics, isLoading, error } = useSystemMetrics();

  if (isLoading) {
    return <LoadingSpinner message="Loading system metrics..." />;
  }

  if (error) {
    return <Alert type="error" message={error} />;
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-medium mb-4">System Metrics</h3>
      
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <Users className="w-5 h-5" />
            <span className="font-medium">Active Users</span>
          </div>
          <p className="text-2xl font-bold">{metrics.active_users}</p>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <Database className="w-5 h-5" />
            <span className="font-medium">Storage</span>
          </div>
          <p className="text-2xl font-bold">{metrics.storage_used}GB</p>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 text-purple-600 mb-2">
            <BarChart3 className="w-5 h-5" />
            <span className="font-medium">API Calls</span>
          </div>
          <p className="text-2xl font-bold">{metrics.api_calls}</p>
        </div>
      </div>
    </div>
  );
};

export default SystemMetrics;