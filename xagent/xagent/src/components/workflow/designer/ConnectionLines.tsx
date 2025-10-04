import React from 'react';
import { WorkflowConnection } from '../connections/WorkflowConnection';
import { useWorkflowStore } from '../../../store/workflowStore';

export const ConnectionLines: React.FC = () => {
  const { selectedWorkflow, removeConnection } = useWorkflowStore();

  if (!selectedWorkflow) return null;

  return (
    <svg className="absolute inset-0 pointer-events-none">
      {selectedWorkflow.connections.map((connection, index) => (
        <WorkflowConnection
          key={`${connection.from}-${connection.to}`}
          connection={connection}
          onRemove={() => removeConnection(
            selectedWorkflow.id,
            connection.from,
            connection.to
          )}
        />
      ))}
    </svg>
  );
};