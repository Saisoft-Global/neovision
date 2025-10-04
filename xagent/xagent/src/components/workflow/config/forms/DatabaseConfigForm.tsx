import React, { useState } from 'react';
import type { WorkflowNode } from '../../../../types/workflow';

interface DatabaseConfigFormProps {
  node: WorkflowNode;
  onUpdate: (node: WorkflowNode) => void;
}

export const DatabaseConfigForm: React.FC<DatabaseConfigFormProps> = ({ node, onUpdate }) => {
  const [config, setConfig] = useState({
    type: node.parameters?.type || 'postgres',
    operation: node.parameters?.operation || 'query',
    query: node.parameters?.query || '',
    connection: node.parameters?.connection || {
      host: '',
      port: '',
      database: '',
      username: '',
      password: '',
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
        <label className="block text-sm font-medium text-gray-700">Database Type</label>
        <select
          value={config.type}
          onChange={(e) => setConfig({ ...config, type: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
        >
          <option value="postgres">PostgreSQL</option>
          <option value="mysql">MySQL</option>
          <option value="mongodb">MongoDB</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Operation</label>
        <select
          value={config.operation}
          onChange={(e) => setConfig({ ...config, operation: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
        >
          <option value="query">Query</option>
          <option value="insert">Insert</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Query/Statement</label>
        <textarea
          value={config.query}
          onChange={(e) => setConfig({ ...config, query: e.target.value })}
          rows={4}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          placeholder="Enter your SQL query or MongoDB statement"
        />
      </div>

      <div className="space-y-4 border-t pt-4 mt-4">
        <h3 className="font-medium">Connection Details</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Host</label>
            <input
              type="text"
              value={config.connection.host}
              onChange={(e) => setConfig({
                ...config,
                connection: { ...config.connection, host: e.target.value }
              })}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Port</label>
            <input
              type="text"
              value={config.connection.port}
              onChange={(e) => setConfig({
                ...config,
                connection: { ...config.connection, port: e.target.value }
              })}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Database Name</label>
          <input
            type="text"
            value={config.connection.database}
            onChange={(e) => setConfig({
              ...config,
              connection: { ...config.connection, database: e.target.value }
            })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Username</label>
          <input
            type="text"
            value={config.connection.username}
            onChange={(e) => setConfig({
              ...config,
              connection: { ...config.connection, username: e.target.value }
            })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <input
            type="password"
            value={config.connection.password}
            onChange={(e) => setConfig({
              ...config,
              connection: { ...config.connection, password: e.target.value }
            })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="pt-4">
        <button
          type="submit"
          className="w-full bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Save Configuration
        </button>
      </div>
    </form>
  );
};