import React from 'react';
import { Settings } from 'lucide-react';

interface IntegrationCardProps {
  integration: {
    type: string;
    name: string;
    connected: boolean;
  };
  onConnect: (type: string, config: any) => Promise<void>;
}

export const IntegrationCard: React.FC<IntegrationCardProps> = ({
  integration,
  onConnect,
}) => {
  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium">{integration.name}</h3>
        <div className={`w-2 h-2 rounded-full ${
          integration.connected ? 'bg-green-500' : 'bg-gray-300'
        }`} />
      </div>
      
      <button
        onClick={() => onConnect(integration.type, {})}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50"
      >
        <Settings className="w-4 h-4" />
        <span>Configure</span>
      </button>
    </div>
  );
};