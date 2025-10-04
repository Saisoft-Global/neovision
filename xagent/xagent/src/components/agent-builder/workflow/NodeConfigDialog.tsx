import React from 'react';
import type { WorkflowNode } from '../../../types/workflow';

interface NodeConfigDialogProps {
  node: WorkflowNode;
  onClose: () => void;
  onSave: (updates: Partial<WorkflowNode>) => void;
}

export const NodeConfigDialog: React.FC<NodeConfigDialogProps> = ({
  node,
  onClose,
  onSave,
}) => {
  const [config, setConfig] = React.useState({
    label: node.label,
    description: node.description,
    action: node.action,
    parameters: node.parameters,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(config);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <h2 className="text-lg font-semibold">Configure Workflow Step</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Label
            </label>
            <input
              type="text"
              value={config.label}
              onChange={(e) => setConfig({ ...config, label: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              value={config.description}
              onChange={(e) => setConfig({ ...config, description: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Action
            </label>
            <select
              value={config.action}
              onChange={(e) => setConfig({ ...config, action: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="analyze">Analyze Content</option>
              <option value="extract">Extract Information</option>
              <option value="generate">Generate Response</option>
              <option value="schedule">Schedule Meeting</option>
              <option value="notify">Send Notification</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};