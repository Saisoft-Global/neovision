import React, { useState } from 'react';
import type { WorkflowNode } from '../../../../types/workflow';

interface FileSystemConfigFormProps {
  node: WorkflowNode;
  onUpdate: (node: WorkflowNode) => void;
}

export const FileSystemConfigForm: React.FC<FileSystemConfigFormProps> = ({ node, onUpdate }) => {
  const [config, setConfig] = useState({
    operation: node.parameters?.operation || 'read',
    path: node.parameters?.path || '',
    content: node.parameters?.content || '',
    destination: node.parameters?.destination || '',
    options: node.parameters?.options || {
      encoding: 'utf-8',
      format: 'text',
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate({
      ...node,
      parameters: config,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Operation</label>
        <select
          value={config.operation}
          onChange={(e) => setConfig({ ...config, operation: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
        >
          <option value="read">Read File</option>
          <option value="write">Write File</option>
          <option value="delete">Delete File</option>
          <option value="move">Move File</option>
          <option value="transform">Transform File</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">File Path</label>
        <input
          type="text"
          value={config.path}
          onChange={(e) => setConfig({ ...config, path: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          placeholder="/path/to/file"
        />
      </div>

      {config.operation === 'move' && (
        <div>
          <label className="block text-sm font-medium text-gray-700">Destination Path</label>
          <input
            type="text"
            value={config.destination}
            onChange={(e) => setConfig({ ...config, destination: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            placeholder="/path/to/destination"
          />
        </div>
      )}

      {config.operation === 'write' && (
        <div>
          <label className="block text-sm font-medium text-gray-700">Content</label>
          <textarea
            value={config.content}
            onChange={(e) => setConfig({ ...config, content: e.target.value })}
            rows={4}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            placeholder="File content..."
          />
        </div>
      )}

      {config.operation === 'transform' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Target Format</label>
            <select
              value={config.options.format}
              onChange={(e) => setConfig({
                ...config,
                options: { ...config.options, format: e.target.value }
              })}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            >
              <option value="text">Text</option>
              <option value="json">JSON</option>
              <option value="xml">XML</option>
              <option value="csv">CSV</option>
              <option value="pdf">PDF</option>
              <option value="docx">DOCX</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Transformation Options</label>
            <textarea
              value={JSON.stringify(config.options, null, 2)}
              onChange={(e) => {
                try {
                  const options = JSON.parse(e.target.value);
                  setConfig({ ...config, options });
                } catch (error) {
                  // Handle invalid JSON
                }
              }}
              rows={4}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono"
              placeholder="Enter options as JSON"
            />
          </div>
        </div>
      )}

      <div className="pt-4">
        <button
          type="submit"
          className="w-full bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700"
        >
          Save Configuration
        </button>
      </div>
    </form>
  );
};