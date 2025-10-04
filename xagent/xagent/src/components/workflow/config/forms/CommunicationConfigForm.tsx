import React, { useState } from 'react';
import type { WorkflowNode } from '../../../../types/workflow';

interface CommunicationConfigFormProps {
  node: WorkflowNode;
  onUpdate: (node: WorkflowNode) => void;
}

export const CommunicationConfigForm: React.FC<CommunicationConfigFormProps> = ({ node, onUpdate }) => {
  const [config, setConfig] = useState({
    type: node.parameters?.type || 'email',
    operation: node.parameters?.operation || 'send',
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

  const renderCredentialsFields = () => {
    switch (config.type) {
      case 'email':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">SMTP Host</label>
              <input
                type="text"
                value={config.credentials.smtpHost || ''}
                onChange={(e) => setConfig({
                  ...config,
                  credentials: { ...config.credentials, smtpHost: e.target.value }
                })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">SMTP Port</label>
              <input
                type="text"
                value={config.credentials.smtpPort || ''}
                onChange={(e) => setConfig({
                  ...config,
                  credentials: { ...config.credentials, smtpPort: e.target.value }
                })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
          </>
        );
      case 'slack':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700">Slack Token</label>
            <input
              type="password"
              value={config.credentials.slackToken || ''}
              onChange={(e) => setConfig({
                ...config,
                credentials: { ...config.credentials, slackToken: e.target.value }
              })}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
        );
      case 'teams':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700">Webhook URL</label>
            <input
              type="text"
              value={config.credentials.webhookUrl || ''}
              onChange={(e) => setConfig({
                ...config,
                credentials: { ...config.credentials, webhookUrl: e.target.value }
              })}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
        );
      case 'whatsapp':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">Access Token</label>
              <input
                type="password"
                value={config.credentials.accessToken || ''}
                onChange={(e) => setConfig({
                  ...config,
                  credentials: { ...config.credentials, accessToken: e.target.value }
                })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone Number ID</label>
              <input
                type="text"
                value={config.credentials.phoneNumberId || ''}
                onChange={(e) => setConfig({
                  ...config,
                  credentials: { ...config.credentials, phoneNumberId: e.target.value }
                })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
          </>
        );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Communication Type</label>
        <select
          value={config.type}
          onChange={(e) => setConfig({ ...config, type: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
        >
          <option value="email">Email</option>
          <option value="slack">Slack</option>
          <option value="teams">Microsoft Teams</option>
          <option value="whatsapp">WhatsApp</option>
        </select>
      </div>

      <div className="space-y-4 border-t pt-4">
        <h3 className="font-medium">Credentials</h3>
        {renderCredentialsFields()}
      </div>

      <div className="space-y-4 border-t pt-4">
        <h3 className="font-medium">Message Configuration</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Recipients</label>
          <input
            type="text"
            value={config.parameters.recipients || ''}
            onChange={(e) => setConfig({
              ...config,
              parameters: { ...config.parameters, recipients: e.target.value }
            })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            placeholder="Comma-separated recipients"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Subject/Title</label>
          <input
            type="text"
            value={config.parameters.subject || ''}
            onChange={(e) => setConfig({
              ...config,
              parameters: { ...config.parameters, subject: e.target.value }
            })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Message Content</label>
          <textarea
            value={config.parameters.content || ''}
            onChange={(e) => setConfig({
              ...config,
              parameters: { ...config.parameters, content: e.target.value }
            })}
            rows={4}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
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