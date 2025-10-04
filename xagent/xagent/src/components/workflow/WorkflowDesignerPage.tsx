import React, { useEffect } from 'react';
import { Plus, Save, Play } from 'lucide-react';
import { WorkflowCanvas } from './canvas/WorkflowCanvas';
import { NodePalette } from './palette/NodePalette';
import { NodeConfigPanel } from './config/NodeConfigPanel';
import { WorkflowList } from './list/WorkflowList';
import { useWorkflowStore } from '../../store/workflowStore';
import { Alert } from '../common/Alert';

export const WorkflowDesignerPage: React.FC = () => {
  const {
    workflows,
    selectedWorkflow,
    selectedNode,
    error,
    isLoading,
    fetchWorkflows,
    createWorkflow,
    deleteWorkflow,
    selectWorkflow,
    selectNode,
    updateNode,
    addNode,
    removeNode,
    addConnection,
    removeConnection,
    executeWorkflow,
  } = useWorkflowStore();

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const handleCreateWorkflow = () => {
    createWorkflow({
      name: 'New Workflow',
      description: 'A new workflow',
      nodes: [],
      connections: [],
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Workflow Designer</h1>
        <button
          onClick={handleCreateWorkflow}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          <span>New Workflow</span>
        </button>
      </div>

      {error && <Alert type="error" message={error} />}

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-3">
          <div className="space-y-6">
            <WorkflowList
              workflows={workflows}
              selectedWorkflow={selectedWorkflow}
              onSelect={selectWorkflow}
              onDelete={deleteWorkflow}
              onExecute={executeWorkflow}
            />
            {selectedWorkflow && (
              <NodePalette
                onAddNode={(type) => {
                  addNode(selectedWorkflow.id, {
                    id: crypto.randomUUID(),
                    type,
                    label: `New ${type} Node`,
                    description: `Configure this ${type} node`,
                    position: { x: 100, y: 100 },
                    action: 'process',
                    parameters: {},
                  });
                }}
              />
            )}
          </div>
        </div>

        <div className="col-span-6">
          {selectedWorkflow ? (
            <WorkflowCanvas
              nodes={selectedWorkflow.nodes}
              connections={selectedWorkflow.connections}
              onNodeSelect={selectNode}
              onNodeRemove={(nodeId) => removeNode(selectedWorkflow.id, nodeId)}
              onNodePositionChange={(nodeId, x, y) => {
                const node = selectedWorkflow.nodes.find((n) => n.id === nodeId);
                if (node) {
                  updateNode(selectedWorkflow.id, {
                    ...node,
                    position: { x, y },
                  });
                }
              }}
              onConnectionCreate={(fromId, toId) => {
                const fromNode = selectedWorkflow.nodes.find((n) => n.id === fromId);
                const toNode = selectedWorkflow.nodes.find((n) => n.id === toId);
                if (fromNode && toNode) {
                  addConnection(selectedWorkflow.id, {
                    from: fromId,
                    to: toId,
                    startPoint: {
                      x: fromNode.position.x + 150,
                      y: fromNode.position.y + 30,
                    },
                    endPoint: {
                      x: toNode.position.x,
                      y: toNode.position.y + 30,
                    },
                    midPoint: {
                      x: (fromNode.position.x + toNode.position.x) / 2,
                      y: (fromNode.position.y + toNode.position.y) / 2,
                    },
                  });
                }
              }}
              onConnectionRemove={(fromId, toId) =>
                removeConnection(selectedWorkflow.id, fromId, toId)
              }
            />
          ) : (
            <div className="h-[600px] bg-gray-50 border rounded-lg flex items-center justify-center">
              <p className="text-gray-500">Select or create a workflow to begin</p>
            </div>
          )}
        </div>

        <div className="col-span-3">
          {selectedNode && (
            <NodeConfigPanel
              node={selectedNode}
              onUpdate={(node) => updateNode(selectedWorkflow!.id, node)}
              onClose={() => selectNode(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
};