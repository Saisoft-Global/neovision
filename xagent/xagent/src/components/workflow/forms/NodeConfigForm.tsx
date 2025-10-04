import React, { useState } from 'react';
import type { WorkflowNode } from '../../../types/workflow';

interface NodeConfigFormProps {
  node: WorkflowNode;
  onSave: (node: WorkflowNode) => void;
  onCancel: () => void;
}

export const NodeConfigForm: React.FC<NodeConfigFormProps> = ({
  node,
  onSave,
  onCancel,
}) => {
  const [config, setConfig] = useState(node);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(config);
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Label
        </label>
        <input
          type="text"
          value={config.label}
          onChange={(e) => setConfig({ ...config, label: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          value={config.description}
          onChange={(e) => setConfig({ ...config, description: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Action
        </label>
        <select
          value={config.action}
          onChange={(e) => setConfig({ ...config, action: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="process">Process</option>
          <option value="analyze">Analyze</option>
          <option value="extract">Extract</option>
          <option value="transform">Transform</option>
          <option value="validate">Validate</option>
        </select>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 hover:text-gray-900"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Save Changes
        </button>
      </div>
    </form>
  );
};