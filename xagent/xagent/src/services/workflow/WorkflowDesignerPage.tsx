import React, { useState } from 'react';
import { Plus, Play, Save } from 'lucide-react';
import { WorkflowNode } from './nodes/WorkflowNode';
import { WorkflowConnection } from './connections/WorkflowConnection';
import { NodeConfigModal } from './modals/NodeConfigModal';
import { useWorkflowDesigner } from './hooks/useWorkflowDesigner';
import { validateWorkflow } from './utils/workflowValidation';
import { WorkflowManager } from '../../services/workflow/WorkflowManager';
import type { Workflow } from '../../types/workflow';
import { Alert } from '../common/Alert';

export const WorkflowDesignerPage: React.FC = () => {
  const {
    nodes,
    connections,
    selectedNode,
    addNode,
    updateNode,
    removeNode,
    addConnection,
    removeConnection,
    setSelectedNode,
  } = useWorkflowDesigner();

  const [showNodeConfig, setShowNodeConfig] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const workflowManager = WorkflowManager.getInstance();

  const handleNodeUpdate = (updatedNode: WorkflowNode) => {
    updateNode(updatedNode);
    setShowNodeConfig(false);
  };

  const handleNodeSelect = (node: WorkflowNode) => {
    setSelectedNode(node);
    setShowNodeConfig(true);
  };

  const handleSaveWorkflow = async () => {
    const workflow: Workflow = {
      id: crypto.randomUUID(),
      name: 'Custom Workflow',
      description: 'Custom workflow created in designer',
      nodes,
      connections,
    };

    const validation = validateWorkflow(workflow);
    if (!validation.isValid) {
      setError(validation.errors.join('\n'));
      return;
    }

    try {
      await workflowManager.createWorkflow(JSON.stringify(workflow));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save workflow');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Workflow Designer</h1>
        <div className="flex items-center space-x-4">
          <button
            onClick={addNode}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            <span>Add Step</span>
          </button>
          <button
            onClick={handleSaveWorkflow}
            className="flex items-center space-x-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50"
          >
            <Save className="w-4 h-4" />
            <span>Save</span>
          </button>
        </div>
      </div>

      {error && (
        <Alert
          type="error"
          message={error}
        />
      )}

      <div className="bg-gray-50 border rounded-lg h-[600px] relative">
        {nodes.map(node => (
          <WorkflowNode
            key={node.id}
            node={node}
            onSelect={() => handleNodeSelect(node)}
            onRemove={() => removeNode(node.id)}
          />
        ))}
        {connections.map((connection, index) => (
          <WorkflowConnection
            key={index}
            connection={connection}
            onRemove={() => removeConnection(connection.from, connection.to)}
          />
        ))}
      </div>

      {showNodeConfig && selectedNode && (
        <NodeConfigModal
          node={selectedNode}
          onClose={() => setShowNodeConfig(false)}
          onSave={handleNodeUpdate}
        />
      )}
    </div>
  );
};