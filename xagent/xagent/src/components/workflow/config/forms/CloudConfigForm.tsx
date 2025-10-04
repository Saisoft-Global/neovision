import React, { useState } from 'react';
import type { WorkflowNode } from '../../../../types/workflow';

interface CloudConfigFormProps {
  node: WorkflowNode;
  onUpdate: (node: WorkflowNode) => void;
}

export const CloudConfigForm: React.FC<CloudConfigFormProps> = ({ node, onUpdate }) => {
  const [config, setConfig] = useState({
    provider: node.parameters?.provider || 'aws',
    service: node.parameters?.service || '',
    operation: node.parameters?.operation || '',
    parameters: node.parameters?.parameters || {},
    credentials: node.parameters?.credentials || {},
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate({
      ...node,
      parameters: config,
    });
  };

  const renderServiceOptions = () => {
    switch (config.provider) {
      case 'aws':
        return (
          <>
            <option value="s3">S3</option>
            <option value="lambda">Lambda</option>
            <option value="dynamodb">DynamoDB</option>
            <option value="sqs">SQS</option>
          </>
        );
      case 'azure':
        return (
          <>
            <option value="blob">Blob Storage</option>
            <option value="functions">Functions</option>
            <option value="cosmos">Cosmos DB</option>
            <option value="queue">Queue Storage</option>
          </>
        );
      case 'gcp':
        return (
          <>
            <option value="storage">Cloud Storage</option>
            <option value="functions">Cloud Functions</option>
            <option value="firestore">Firestore</option>
            <option value="pubsub">Pub/Sub</option>
          </>
        );
      default:
        return null;
    }
  };

  const renderCredentialsFields = () => {
    switch (config.provider) {
      case 'aws':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">Access Key ID</label>
              <input
                type="text"
                value={config.credentials.accessKeyId || ''}
                onChange={(e) => setConfig({
                  ...config,
                  credentials: { ...config.credentials, accessKeyId: e.target.value }
                })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Secret Access Key</label>
              <input
                type="password"
                value={config.credentials.secretAccessKey || ''}
                onChange={(e) => setConfig({
                  ...config,
                  credentials: { ...config.credentials, secretAccessKey: e.target.value }
                })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Region</label>
              <input
                type="text"
                value={config.credentials.region || ''}
                onChange={(e) => setConfig({
                  ...config,
                  credentials: { ...config.credentials, region: e.target.value }
                })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
          </>
        );
      case 'azure':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">Tenant ID</label>
              <input
                type="text"
                value={config.credentials.tenantId || ''}
                onChange={(e) => setConfig({
                  ...config,
                  credentials: { ...config.credentials, tenantId: e.target.value }
                })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Client ID</label>
              <input
                type="text"
                value={config.credentials.clientId || ''}
                onChange={(e) => setConfig({
                  ...config,
                  credentials: { ...config.credentials, clientId: e.target.value }
                })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Client Secret</label>
              <input
                type="password"
                value={config.credentials.clientSecret || ''}
                onChange={(e) => setConfig({
                  ...config,
                  credentials: { ...config.credentials, clientSecret: e.target.value }
                })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
          </>
        );
      case 'gcp':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">Project ID</label>
              <input
                type="text"
                value={config.credentials.projectId || ''}
                onChange={(e) => setConfig({
                  ...config,
                  credentials: { ...config.credentials, projectId: e.target.value }
                })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Service Account Key</label>
              <textarea
                value={config.credentials.serviceAccountKey || ''}
                onChange={(e) => setConfig({
                  ...config,
                  credentials: { ...config.credentials, serviceAccountKey: e.target.value }
                })}
                rows={4}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder="Paste your service account key JSON here"
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
        <label className="block text-sm font-medium text-gray-700">Cloud Provider</label>
        <select
          value={config.provider}
          onChange={(e) => setConfig({ ...config, provider: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
        >
          <option value="aws">AWS</option>
          <option value="azure">Azure</option>
          <option value="gcp">Google Cloud</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Service</label>
        <select
          value={config.service}
          onChange={(e) => setConfig({ ...config, service: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
        >
          <option value="">Select a service</option>
          {renderServiceOptions()}
        </select>
      </div>

      <div className="space-y-4 border-t pt-4">
        <h3 className="font-medium">Credentials</h3>
        {renderCredentialsFields()}
      </div>

      <div className="space-y-4 border-t pt-4">
        <h3 className="font-medium">Operation Parameters</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700">Operation</label>
          <input
            type="text"
            value={config.operation}
            onChange={(e) => setConfig({ ...config, operation: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            placeholder="e.g., putObject, invoke, sendMessage"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Parameters</label>
          <textarea
            value={JSON.stringify(config.parameters, null, 2)}
            onChange={(e) => {
              try {
                const params = JSON.parse(e.target.value);
                setConfig({ ...config, parameters: params });
              } catch (error) {
                // Handle invalid JSON
              }
            }}
            rows={4}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono"
            placeholder="Enter parameters as JSON"
          />
        </div>
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