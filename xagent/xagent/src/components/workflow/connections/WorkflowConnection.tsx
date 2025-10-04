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
  // Calculate the bezier curve control points
  const dx = connection.endPoint.x - connection.startPoint.x;
  const controlPoint1 = {
    x: connection.startPoint.x + dx * 0.5,
    y: connection.startPoint.y,
  };
  const controlPoint2 = {
    x: connection.endPoint.x - dx * 0.5,
    y: connection.endPoint.y,
  };

  // Create the SVG path
  const path = `
    M ${connection.startPoint.x} ${connection.startPoint.y}
    C ${controlPoint1.x} ${controlPoint1.y},
      ${controlPoint2.x} ${controlPoint2.y},
      ${connection.endPoint.x} ${connection.endPoint.y}
  `;

  return (
    <svg className="absolute inset-0 pointer-events-none">
      <defs>
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
      </defs>
      
      <path
        d={path}
        fill="none"
        stroke="#94a3b8"
        strokeWidth="2"
        markerEnd="url(#arrowhead)"
        className="transition-colors hover:stroke-blue-500"
      />
      
      <g 
        transform={`translate(${connection.midPoint.x - 10}, ${connection.midPoint.y - 10})`}
        className="cursor-pointer"
        onClick={onRemove}
      >
        <circle
          r="8"
          cx="10"
          cy="10"
          fill="white"
          stroke="#94a3b8"
          className="hover:stroke-red-500"
        />
        <X className="w-4 h-4 text-gray-400 hover:text-red-500" />
      </g>
    </svg>
  );
};