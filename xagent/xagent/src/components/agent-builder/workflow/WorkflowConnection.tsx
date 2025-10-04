import React from 'react';
import { X } from 'lucide-react';
import type { WorkflowConnection as ConnectionType } from '../../../types/workflow';

interface WorkflowConnectionProps {
  connection: ConnectionType;
  onRemove: () => void;
}

export const WorkflowConnection: React.FC<WorkflowConnectionProps> = ({
  connection,
  onRemove,
}) => {
  // Calculate path for the connection line
  const path = `M ${connection.startPoint.x} ${connection.startPoint.y} 
                C ${connection.startPoint.x + 100} ${connection.startPoint.y},
                  ${connection.endPoint.x - 100} ${connection.endPoint.y},
                  ${connection.endPoint.x} ${connection.endPoint.y}`;

  return (
    <g className="workflow-connection">
      <path
        d={path}
        fill="none"
        stroke="#94a3b8"
        strokeWidth="2"
        className="transition-colors hover:stroke-blue-500"
      />
      
      <circle
        cx={connection.midPoint.x}
        cy={connection.midPoint.y}
        r="5"
        fill="#94a3b8"
        className="cursor-pointer hover:fill-red-500"
        onClick={onRemove}
      />
      
      {/* Arrow head */}
      <marker
        id="arrowhead"
        markerWidth="10"
        markerHeight="7"
        refX="9"
        refY="3.5"
        orient="auto"
      >
        <polygon
          points="0 0, 10 3.5, 0 7"
          fill="#94a3b8"
        />
      </marker>
    </g>
  );
};