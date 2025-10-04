import React from 'react';
import { Brain } from 'lucide-react';

interface AgentExpertiseProps {
  expertise: string[];
}

export const AgentExpertise: React.FC<AgentExpertiseProps> = ({ expertise }) => (
  <div className="flex items-center space-x-2 text-sm text-gray-600">
    <Brain className="w-4 h-4" />
    <span>{expertise.join(' • ')}</span>
  </div>
);