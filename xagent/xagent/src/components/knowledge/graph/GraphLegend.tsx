import React from 'react';

export const GraphLegend: React.FC = () => {
  const nodeTypes = [
    { type: 'concept', color: '#60A5FA', label: 'Concept' },
    { type: 'entity', color: '#34D399', label: 'Entity' },
    { type: 'document', color: '#F472B6', label: 'Document' },
    { type: 'fact', color: '#A78BFA', label: 'Fact' },
  ];

  return (
    <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm p-4 rounded-lg shadow-sm border">
      <h3 className="text-sm font-medium mb-2">Node Types</h3>
      <div className="space-y-2">
        {nodeTypes.map(({ type, color, label }) => (
          <div key={type} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-sm text-gray-600">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};