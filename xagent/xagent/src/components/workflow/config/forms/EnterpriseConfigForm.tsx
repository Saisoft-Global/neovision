import React, { useState } from 'react';
import type { WorkflowNode } from '../../../../types/workflow';

interface EnterpriseConfigFormProps {
  node: WorkflowNode;
  onUpdate: (node: WorkflowNode) => void;
}

export const EnterpriseConfigForm: React.FC<EnterpriseConfigFormProps> = ({ node, onUpdate }) => {
  const [config, setConfig] = useState({
    system: node.parameters?.system || 'sap',
    operation: node.parameters?.operation || '',
    entity: node.parameters?.entity || '',
    action: node.parameters?.action || '',
    parameters: node.parameters?.parameters || {},
    credentials: node.parameters?.credentials || {
      clientId: '',
      clientSecret: '',
      instanceUrl: '',
      environment: 'production',
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate({
      ...node,
      parameters: config,
    });
  };

  const renderSystemSpecificFields = () => {
    switch (config.system) {
      case 'sap':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">SAP System ID</label>
              <input
                type="text"
                value={config.parameters.systemId || ''}
                onChange={(e) => setConfig({
                  ...config,
                  parameters: { ...config.parameters, systemId: e.target.value }
                })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">SAP Client</label>
              <input
                type="text"
                value={config.parameters.client || ''}
                onChange={(e) => setConfig({
                  ...config,
                  parameters: { ...config.parameters, client: e.target.value }
                })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
          </>
        );
      case 'salesforce':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">Object Type</label>
              <input
                type="text"
                value={config.parameters.objectType || ''}
                onChange={(e) => setConfig({
                  ...config,
                  parameters: { ...config.parameters, objectType: e.target.value }
                })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder="e.g., Account, Contact, Opportunity"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">SOQL Query</label>
              <textarea
                value={config.parameters.soql || ''}
                onChange={(e) => setConfig({
                  ...config,
                  parameters: { ...config.parameters, soql: e.target.value }
                })}
                rows={3}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder="SELECT Id, Name FROM Account WHERE..."
              />
            </div>
          </>
        );
      case 'dynamics':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">Entity Name</label>
              <input
                type="text"
                value={config.parameters.entityName || ''}
                onChange={(e) => setConfig({
                  ...config,
                  parameters: { ...config.parameters, entityName: e.target.value }
                })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder="e.g., account, contact, opportunity"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Filter Query</label>
              <textarea
                value={config.parameters.filter || ''}
                onChange={(e) => setConfig({
                  ...config,
                  parameters: { ...config.parameters, filter: e.target.value }
                })}
                rows={3}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder="$filter=name eq 'Test' and revenue gt 1000"
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
        <label className="block text-sm font-medium text-gray-700">Enterprise System</label>
        <select
          value={config.system}
          onChange={(e) => setConfig({ ...config, system: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
        >
          <option value="sap">SAP</option>
          <option value="salesforce">Salesforce</option>
          <option value="dynamics">Microsoft Dynamics</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Operation</label>
        <select
          value={config.operation}
          onChange={(e) => setConfig({ ...config, operation: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
        >
          <option value="read">Read Data</option>
          <option value="create">Create Record</option>
          <option value="update">Update Record</option>
          <option value="delete">Delete Record</option>
          <option value="query">Custom Query</option>
        </select>
      </div>

      <div className="space-y-4 border-t pt-4">
        <h3 className="font-medium">Connection Details</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Instance URL</label>
          <input
            type="text"
            value={config.credentials.instanceUrl}
            onChange={(e) => setConfig({
              ...config,
              credentials: { ...config.credentials, instanceUrl: e.target.value }
            })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            placeholder="https://your-instance.example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Client ID</label>
          <input
            type="text"
            value={config.credentials.clientId}
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
            value={config.credentials.clientSecret}
            onChange={(e) => setConfig({
              ...config,
              credentials: { ...config.credentials, clientSecret: e.target.value }
            })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Environment</label>
          <select
            value={config.credentials.environment}
            onChange={(e) => setConfig({
              ...config,
              credentials: { ...config.credentials, environment: e.target.value }
            })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          >
            <option value="production">Production</option>
            <option value="sandbox">Sandbox</option>
            <option value="development">Development</option>
          </select>
        </div>
      </div>

      <div className="space-y-4 border-t pt-4">
        <h3 className="font-medium">System-Specific Configuration</h3>
        {renderSystemSpecificFields()}
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