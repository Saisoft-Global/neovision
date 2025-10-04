import React from 'react';
import { WorkflowNode } from '../nodes/WorkflowNode';
import { useWorkflowStore } from '../../../store/workflowStore';

export const NodeList: React.FC = () => {
  const { selectedWorkflow, updateNode, removeNode, selectNode } = useWorkflowStore();

  if (!selectedWorkflow) return null;

  return (
    <>
      {selectedWorkflow.nodes.map(node => (
        <WorkflowNode
          key={node.id}
          node={node}
          onSelect={() => selectNode(node)}
          onRemove={() => removeNode(selectedWorkflow.id, node.id)}
          onPositionChange={(position) => 
            updateNode(selectedWorkflow.id, { ...node, position })
          }
        />
      ))}
    </>
  );
};