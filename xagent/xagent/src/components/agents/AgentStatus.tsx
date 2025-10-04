import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

interface AgentStatusProps {
  isAvailable: boolean;
}

const AgentStatus: React.FC<AgentStatusProps> = ({ isAvailable }) => (
  <div className="flex items-center space-x-1">
    {isAvailable ? (
      <>
        <CheckCircle className="w-4 h-4 text-green-500" />
        <span className="text-sm text-green-500">Available</span>
      </>
    ) : (
      <>
        <XCircle className="w-4 h-4 text-red-500" />
        <span className="text-sm text-red-500">Busy</span>
      </>
    )}
  </div>
);

export default AgentStatus;