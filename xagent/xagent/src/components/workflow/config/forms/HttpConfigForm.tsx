import React, { useState } from 'react';
import type { WorkflowNode } from '../../../../types/workflow';

interface HttpConfigFormProps {
  node: WorkflowNode;
  onUpdate: (node: WorkflowNode) => void;
}

export const HttpConfigForm: React.FC<HttpConfigFormProps> = ({ node, onUpdate }) => {
  const [config, setConfig] = useState({
    method: node.parameters?.method || 'GET',
    url: node.parameters?.url || '',
    headers: node.parameters?.headers || {},
    body: node.parameters?.body || '',
    authentication: node.parameters?.authentication || {
      type: 'none',
      credentials: {},
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate({
      ...node,
      parameters: config,
    });
  };

  const renderAuthFields = () => {
    switch (config.authentication.type) {
      case 'basic':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">Username</label>
              <input
                type="text"
                value={config.authentication.credentials.username || ''}
                onChange={(e) => setConfig({
                  ...config,
                  authentication: {
                    ...config.authentication,
                    credentials: {
                      ...config.authentication.credentials,
                      username: e.target.value,
                    },
                  },
                })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                value={config.authentication.credentials.password || ''}
                onChange={(e) => setConfig({
                  ...config,
                  authentication: {
                    ...config.authentication,
                    credentials: {
                      ...config.authentication.credentials,
                      password: e.target.value,
                    },
                  },
                })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
          </>
        );
      case 'bearer':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700">Token</label>
            <input
              type="password"
              value={config.authentication.credentials.token || ''}
              onChange={(e) => setConfig({
                ...config,
                authentication: {
                  ...config.authentication,
                  credentials: {
                    ...config.authentication.credentials,
                    token: e.target.value,
                  },
                },
              })}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
        );
      case 'oauth2':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">Client ID</label>
              <input
                type="text"
                value={config.authentication.credentials.clientId || ''}
                onChange={(e) => setConfig({
                  ...config,
                  authentication: {
                    ...config.authentication,
                    credentials: {
                      ...config.authentication.credentials,
                      clientId: e.target.value,
                    },
                  },
                })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Client Secret</label>
              <input
                type="password"
                value={config.authentication.credentials.clientSecret || ''}
                onChange={(e) => setConfig({
                  ...config,
                  authentication: {
                    ...config.authentication,
                    credentials: {
                      ...config.authentication.credentials,
                      clientSecret: e.target.value,
                    },
                  },
                })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Token URL</label>
              <input
                type="text"
                value={config.authentication.credentials.tokenUrl || ''}
                onChange={(e) => setConfig({
                  ...config,
                  authentication: {
                    ...config.authentication,
                    credentials: {
                      ...config.authentication.credentials,
                      tokenUrl: e.target.value,
                    },
                  },
                })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">HTTP Method</label>
        <select
          value={config.method}
          onChange={(e) => setConfig({ ...config, method: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="PATCH">PATCH</option>
          <option value="DELETE">DELETE</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">URL</label>
        <input
          type="text"
          value={config.url}
          onChange={(e) => setConfig({ ...config, url: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          placeholder="https://api.example.com/endpoint"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Headers</label>
        <textarea
          value={JSON.stringify(config.headers, null, 2)}
          onChange={(e) => {
            try {
              const headers = JSON.parse(e.target.value);
              setConfig({ ...config, headers });
            } catch (error) {
              // Handle invalid JSON
            }
          }}
          rows={4}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono"
          placeholder="Enter headers as JSON"
        />
      </div>

      {config.method !== 'GET' && (
        <div>
          <label className="block text-sm font-medium text-gray-700">Request Body</label>
          <textarea
            value={typeof config.body === 'string' ? config.body : JSON.stringify(config.body, null, 2)}
            onChange={(e) => {
              try {
                const body = JSON.parse(e.target.value);
                setConfig({ ...config, body });
              } catch (error) {
                setConfig({ ...config, body: e.target.value });
              }
            }}
            rows={4}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono"
            placeholder="Enter request body"
          />
        </div>
      )}

      <div className="space-y-4 border-t pt-4">
        <h3 className="font-medium">Authentication</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700">Authentication Type</label>
          <select
            value={config.authentication.type}
            onChange={(e) => setConfig({
              ...config,
              authentication: {
                type: e.target.value,
                credentials: {},
              },
            })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          >
            <option value="none">None</option>
            <option value="basic">Basic Auth</option>
            <option value="bearer">Bearer Token</option>
            <option value="oauth2">OAuth 2.0</option>
          </select>
        </div>

        {renderAuthFields()}
      </div>

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