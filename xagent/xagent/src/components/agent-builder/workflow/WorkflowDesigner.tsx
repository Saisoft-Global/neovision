import React from 'react';
import { Plus } from 'lucide-react';
import { WorkflowNode } from './WorkflowNode';
import { WorkflowConnection } from './WorkflowConnection';
import { useWorkflowDesigner } from '../../../hooks/useWorkflowDesigner';
import type { Workflow } from '../../../types/workflow';

interface WorkflowDesignerProps {
  workflows: Workflow[];
  onChange: (workflows: Workflow[]) => void;
}

export const WorkflowDesigner: React.FC<WorkflowDesignerProps> = ({ workflows, onChange }) => {
  const {
    selectedWorkflow,
    nodes,
    connections,
    addNode,
    updateNode,
    removeNode,
    addConnection,
    removeConnection,
  } = useWorkflowDesigner(workflows[0]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Workflow Designer</h2>
        <button
          onClick={() => addNode()}
          className="flex items-center space-x-1 text-blue-600 hover:text-blue-700"
        >
          <Plus className="w-4 h-4" />
          <span>Add Step</span>
        </button>
      </div>

      <div className="relative h-[600px] border rounded-lg bg-gray-50 overflow-hidden">
        <div className="absolute inset-0">
          {connections.map((connection) => (
            <WorkflowConnection
              key={`${connection.from}-${connection.to}`}
              connection={connection}
              onRemove={() => removeConnection(connection)}
            />
          ))}
          
          {nodes.map((node) => (
            <WorkflowNode
              key={node.id}
              node={node}
              onUpdate={updateNode}
              onRemove={() => removeNode(node.id)}
              onConnect={(targetId) => addConnection(node.id, targetId)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};