import { Link2, Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../services/api/config';
import { getOverview, getTemplates, createEmailIntegration, createFolderIntegration, createWebhook } from '../services/api/integrations';
import { createWorkflow, listWorkflows, executeWorkflow } from '../services/api/workflows';

const Integrations = () => {
  const [integrations, setIntegrations] = useState([
    {
      id: '1',
      name: 'Salesforce',
      description: 'Sync processed documents with Salesforce records',
      connected: true,
    },
    {
      id: '2',
      name: 'Google Drive',
      description: 'Import documents from Google Drive',
      connected: true,
    },
    {
      id: '3',
      name: 'SharePoint',
      description: 'Connect with Microsoft SharePoint',
      connected: false,
    },
    {
      id: '4',
      name: 'Dropbox',
      description: 'Import documents from Dropbox',
      connected: false,
    },
  ]);
  const [overview, setOverview] = useState<{ total_integrations?: number; active_integrations?: number; documents_processed_7d?: number; success_rate?: number } | null>(null);
  const [templatesCount, setTemplatesCount] = useState<number | null>(null);
  const [showEmail, setShowEmail] = useState(false);
  const [showFolder, setShowFolder] = useState(false);
  const [showWebhook, setShowWebhook] = useState(false);
  const [showWorkflowBuilder, setShowWorkflowBuilder] = useState(false);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [currentUser, setCurrentUser] = useState<{id: string, organization_id: string} | null>(null);

  // Get current user from auth context or default admin user
  useEffect(() => {
    const getUser = async () => {
      // Try to get from localStorage (if using simple auth)
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          const user = JSON.parse(userData);
          setCurrentUser({ id: user.id, organization_id: user.organization_id });
        } catch (e) {
          // Fallback to default admin user
          await getDefaultAdminUser();
        }
      } else {
        // Get default admin user from backend
        await getDefaultAdminUser();
      }
    };
    getUser();
  }, []);

  const getDefaultAdminUser = async () => {
    try {
      const response = await fetch('/api/admin/default-user');
      const data = await response.json();
      if (data.status === 'success' && data.user) {
        setCurrentUser({ 
          id: data.user.user_id, 
          organization_id: data.user.organization_id 
        });
        // Store in localStorage for future use
        localStorage.setItem('user', JSON.stringify({
          id: data.user.user_id,
          organization_id: data.user.organization_id,
          email: data.user.email,
          role: data.user.role
        }));
      } else {
        // Final fallback
        setCurrentUser({ id: 'user123', organization_id: 'org123' });
      }
    } catch (e) {
      // Final fallback
      setCurrentUser({ id: 'user123', organization_id: 'org123' });
    }
  };

  // Non-breaking enhancement: fetch templates/overview if backend available
  useEffect(() => {
    if (!currentUser) return;
    
    const fetchData = async () => {
      try {
        const t = await getTemplates();
        if (Array.isArray(t)) setTemplatesCount(t.length);
        // We could display templates later in a modal; keep UI unchanged for now
      } catch {}
      try {
        const o = await getOverview(currentUser.id);
        if (o) setOverview(o);
      } catch {}
      try {
        const w = await listWorkflows(currentUser.id);
        if (w?.workflows) setWorkflows(w.workflows);
      } catch {}
    };
    fetchData();
  }, [currentUser]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Integrations</h1>

      {/* Optional overview badges (render only if API data available) */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-500">Total Integrations</div>
            <div className="text-2xl font-semibold">{overview.total_integrations ?? '-'}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-500">Active</div>
            <div className="text-2xl font-semibold">{overview.active_integrations ?? '-'}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-500">Docs (7d)</div>
            <div className="text-2xl font-semibold">{overview.documents_processed_7d ?? '-'}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-500">Success Rate</div>
            <div className="text-2xl font-semibold">{overview.success_rate != null ? `${overview.success_rate.toFixed?.(1) ?? overview.success_rate}%` : '-'}</div>
          </div>
        </div>
      )}

      {templatesCount != null && (
        <div className="mb-4 text-sm text-gray-600">
          {templatesCount} integration templates available
        </div>
      )}

      {/* Quick actions */}
      <div className="flex gap-3 mb-6">
        <button className="btn btn-primary text-sm" onClick={() => setShowEmail(true)}>Setup Email</button>
        <button className="btn btn-primary text-sm" onClick={() => setShowFolder(true)}>Setup Folder Monitoring</button>
        <button className="btn btn-primary text-sm" onClick={() => setShowWebhook(true)}>Add Webhook</button>
        <button className="btn btn-secondary text-sm" onClick={() => setShowWorkflowBuilder(true)}>Create Workflow</button>
      </div>

      {/* Workflows section */}
      {workflows.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Active Workflows</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workflows.map((workflow) => (
              <div key={workflow.id} className="bg-white rounded-lg shadow-sm p-4 border">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-gray-900">{workflow.name}</h3>
                  <span className={`px-2 py-1 text-xs rounded ${
                    workflow.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {workflow.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{workflow.description || 'No description'}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>Trigger: {workflow.trigger.type}</span>
                  <span>Actions: {workflow.actions.length}</span>
                  <span>Runs: {workflow.execution_count}</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <button 
                    className="text-xs text-blue-600 hover:underline"
                    onClick={() => executeWorkflow(workflow.id, { test: true })}
                  >
                    Test Run
                  </button>
                  <button className="text-xs text-red-600 hover:underline">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals (very lightweight inline forms) */}
      {showEmail && (
        <InlineModal title="Setup Email Integration" onClose={() => setShowEmail(false)}>
          <EmailForm onSubmit={async (payload) => {
            setBusy(true);
            try { 
              if (currentUser) {
                await createEmailIntegration({ name: payload.name, config: payload.config, user_id: currentUser.id, organization_id: currentUser.organization_id }); 
                setShowEmail(false); 
              }
            } finally { setBusy(false); }
          }} busy={busy} />
        </InlineModal>
      )}

      {showFolder && (
        <InlineModal title="Setup Folder Monitoring" onClose={() => setShowFolder(false)}>
          <FolderForm onSubmit={async (payload) => {
            setBusy(true);
            try { 
              if (currentUser) {
                await createFolderIntegration({ name: payload.name, config: payload.config, user_id: currentUser.id, organization_id: currentUser.organization_id }); 
                setShowFolder(false); 
              }
            } finally { setBusy(false); }
          }} busy={busy} />
        </InlineModal>
      )}

      {showWebhook && (
        <InlineModal title="Add Webhook" onClose={() => setShowWebhook(false)}>
          <WebhookForm onSubmit={async (payload) => {
            setBusy(true);
            try { 
              if (currentUser) {
                await createWebhook({ name: payload.name, config: payload.config, enabled: true, user_id: currentUser.id, organization_id: currentUser.organization_id }); 
                setShowWebhook(false); 
              }
            } finally { setBusy(false); }
          }} busy={busy} />
        </InlineModal>
      )}

      {showWorkflowBuilder && (
        <InlineModal title="Create Workflow" onClose={() => setShowWorkflowBuilder(false)}>
          <WorkflowBuilder onSubmit={async (payload) => {
            setBusy(true);
            try { 
              if (currentUser) {
                await createWorkflow({ 
                  name: payload.name, 
                  description: payload.description,
                  trigger: payload.trigger, 
                  actions: payload.actions, 
                  enabled: true, 
                  user_id: currentUser.id, 
                  organization_id: currentUser.organization_id 
                }); 
                setShowWorkflowBuilder(false);
                // Refresh workflows
                const w = await listWorkflows(currentUser.id);
                if (w?.workflows) setWorkflows(w.workflows);
              }
            } finally { setBusy(false); }
          }} busy={busy} />
        </InlineModal>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {integrations.map((integration) => (
          <div key={integration.id} className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Link2 className="w-8 h-8 text-blue-500" />
                <div>
                  <h3 className="font-medium text-gray-900">{integration.name}</h3>
                  <p className="text-sm text-gray-500">{integration.description}</p>
                </div>
              </div>
              {integration.connected ? (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <Check className="w-4 h-4" />
                  Connected
                </span>
              ) : (
                <button className="btn btn-primary text-sm">
                  Connect
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Integrations;

const WorkflowBuilder: React.FC<{ busy?: boolean; onSubmit: (payload: { name: string; description: string; trigger: any; actions: any[] }) => Promise<void> }> = ({ busy, onSubmit }) => {
  const [name, setName] = useState('Document Processing Workflow');
  const [description, setDescription] = useState('Automatically process documents and send to ERP');
  const [triggerType, setTriggerType] = useState<'email' | 'folder' | 'webhook'>('email');
  const [actions, setActions] = useState<any[]>([
    { type: 'process_document', config: { save_to_db: true }, delay_seconds: 0 }
  ]);

  const addAction = () => {
    setActions([...actions, { type: 'send_to_erp', config: { url: '' }, delay_seconds: 0 }]);
  };

  const updateAction = (index: number, field: string, value: any) => {
    const newActions = [...actions];
    newActions[index] = { ...newActions[index], [field]: value };
    setActions(newActions);
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const getTriggerConfig = () => {
    switch (triggerType) {
      case 'email':
        return { email_integration_id: 'default' };
      case 'folder':
        return { folder_path: '/data/incoming', file_patterns: ['.pdf', '.jpg'] };
      case 'webhook':
        return { webhook_endpoint: '/webhook/trigger' };
      default:
        return {};
    }
  };

  return (
    <form className="space-y-4" onSubmit={async (e) => {
      e.preventDefault();
      await onSubmit({
        name,
        description,
        trigger: { type: triggerType, config: getTriggerConfig() },
        actions
      });
    }}>
      <div>
        <label className="block text-sm text-gray-600 mb-1">Workflow Name</label>
        <input className="w-full border rounded px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      
      <div>
        <label className="block text-sm text-gray-600 mb-1">Description</label>
        <textarea className="w-full border rounded px-3 py-2" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div>
        <label className="block text-sm text-gray-600 mb-1">Trigger Type</label>
        <select className="w-full border rounded px-3 py-2" value={triggerType} onChange={(e) => setTriggerType(e.target.value as any)}>
          <option value="email">Email Attachment</option>
          <option value="folder">Folder Monitoring</option>
          <option value="webhook">Webhook</option>
        </select>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm text-gray-600">Actions</label>
          <button type="button" onClick={addAction} className="text-sm text-blue-600 hover:underline">+ Add Action</button>
        </div>
        
        <div className="space-y-3">
          {actions.map((action, index) => (
            <div key={index} className="border rounded p-3 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Action {index + 1}</span>
                <button type="button" onClick={() => removeAction(index)} className="text-red-600 hover:underline text-sm">Remove</button>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Type</label>
                  <select 
                    className="w-full border rounded px-2 py-1 text-sm" 
                    value={action.type} 
                    onChange={(e) => updateAction(index, 'type', e.target.value)}
                  >
                    <option value="process_document">Process Document</option>
                    <option value="send_to_erp">Send to ERP</option>
                    <option value="send_webhook">Send Webhook</option>
                    <option value="send_email">Send Email</option>
                    <option value="save_to_database">Save to Database</option>
                    <option value="notify_user">Notify User</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Delay (seconds)</label>
                  <input 
                    type="number" 
                    className="w-full border rounded px-2 py-1 text-sm" 
                    value={action.delay_seconds || 0} 
                    onChange={(e) => updateAction(index, 'delay_seconds', Number(e.target.value))}
                  />
                </div>
              </div>

              {action.type === 'send_to_erp' && (
                <div>
                  <label className="block text-xs text-gray-600 mb-1">ERP URL</label>
                  <input 
                    className="w-full border rounded px-2 py-1 text-sm" 
                    placeholder="https://api.your-erp-system.com/documents"
                    value={action.config?.url || ''} 
                    onChange={(e) => updateAction(index, 'config', { ...action.config, url: e.target.value })}
                  />
                </div>
              )}

              {action.type === 'send_webhook' && (
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Webhook URL</label>
                  <input 
                    className="w-full border rounded px-2 py-1 text-sm" 
                    placeholder="https://api.your-app.com/webhook"
                    value={action.config?.url || ''} 
                    onChange={(e) => updateAction(index, 'config', { ...action.config, url: e.target.value })}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="submit" disabled={busy} className="btn btn-primary text-sm">
          {busy ? 'Creating...' : 'Create Workflow'}
        </button>
      </div>
    </form>
  );
};

// Lightweight inline modal and forms to avoid disrupting existing UI
const InlineModal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg shadow-lg w-full max-w-lg">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">{title}</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  </div>
);

const EmailForm: React.FC<{ busy?: boolean; onSubmit: (payload: { name: string; config: any }) => Promise<void> }> = ({ busy, onSubmit }) => {
  const [name, setName] = useState('Gmail Processing');
  const [host, setHost] = useState('imap.gmail.com');
  const [port, setPort] = useState(993);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [useSSL, setUseSSL] = useState(true);
  const [checkInterval, setCheckInterval] = useState(5);
  return (
    <form className="space-y-3" onSubmit={async (e) => {
      e.preventDefault();
      await onSubmit({ name, config: { email_type: 'imap', host, port, username, password, use_ssl: useSSL, check_interval: checkInterval } });
    }}>
      <div>
        <label className="block text-sm text-gray-600 mb-1">Name</label>
        <input className="w-full border rounded px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="block text-sm text-gray-600 mb-1">Host</label>
          <input className="w-full border rounded px-3 py-2" value={host} onChange={(e) => setHost(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Port</label>
          <input type="number" className="w-full border rounded px-3 py-2" value={port} onChange={(e) => setPort(Number(e.target.value))} />
        </div>
      </div>
      <div>
        <label className="block text-sm text-gray-600 mb-1">Username</label>
        <input className="w-full border rounded px-3 py-2" value={username} onChange={(e) => setUsername(e.target.value)} />
      </div>
      <div>
        <label className="block text-sm text-gray-600 mb-1">Password / App Password</label>
        <input type="password" className="w-full border rounded px-3 py-2" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div className="flex items-center gap-3">
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={useSSL} onChange={(e) => setUseSSL(e.target.checked)} />
          Use SSL/TLS
        </label>
        <div className="flex items-center gap-2 text-sm">
          <span>Check every</span>
          <input type="number" className="w-16 border rounded px-2 py-1" value={checkInterval} onChange={(e) => setCheckInterval(Number(e.target.value))} />
          <span>min</span>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="submit" disabled={busy} className="btn btn-primary text-sm">{busy ? 'Saving…' : 'Create'}</button>
      </div>
    </form>
  );
};

const FolderForm: React.FC<{ busy?: boolean; onSubmit: (payload: { name: string; config: any }) => Promise<void> }> = ({ busy, onSubmit }) => {
  const [name, setName] = useState('Documents Monitor');
  const [path, setPath] = useState('/data/incoming');
  const [recursive, setRecursive] = useState(true);
  const [patterns, setPatterns] = useState('.pdf,.jpg,.png');
  const [delay, setDelay] = useState(5);
  return (
    <form className="space-y-3" onSubmit={async (e) => {
      e.preventDefault();
      await onSubmit({ name, config: { folder_path: path, recursive, file_patterns: patterns.split(',').map(s => s.trim()).filter(Boolean), processing_delay: delay } });
    }}>
      <div>
        <label className="block text-sm text-gray-600 mb-1">Name</label>
        <input className="w-full border rounded px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="block text-sm text-gray-600 mb-1">Folder Path</label>
        <input className="w-full border rounded px-3 py-2" value={path} onChange={(e) => setPath(e.target.value)} />
      </div>
      <div className="flex items-center gap-4">
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={recursive} onChange={(e) => setRecursive(e.target.checked)} />
          Recursive
        </label>
        <div className="flex items-center gap-2 text-sm">
          <span>Delay</span>
          <input type="number" className="w-16 border rounded px-2 py-1" value={delay} onChange={(e) => setDelay(Number(e.target.value))} />
          <span>sec</span>
        </div>
      </div>
      <div>
        <label className="block text-sm text-gray-600 mb-1">File Types</label>
        <input className="w-full border rounded px-3 py-2" value={patterns} onChange={(e) => setPatterns(e.target.value)} />
        <div className="text-xs text-gray-500 mt-1">Comma separated, e.g. .pdf,.jpg,.png</div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="submit" disabled={busy} className="btn btn-primary text-sm">{busy ? 'Saving…' : 'Create'}</button>
      </div>
    </form>
  );
};

const WebhookForm: React.FC<{ busy?: boolean; onSubmit: (payload: { name: string; config: any }) => Promise<void> }> = ({ busy, onSubmit }) => {
  const [name, setName] = useState('My Webhook');
  const [url, setUrl] = useState('https://example.com/webhook');
  const [secret, setSecret] = useState('');
  const [events, setEvents] = useState('document.processed,training.completed');
  return (
    <form className="space-y-3" onSubmit={async (e) => {
      e.preventDefault();
      await onSubmit({ name, config: { url, secret, events: events.split(',').map(s => s.trim()).filter(Boolean) } });
    }}>
      <div>
        <label className="block text-sm text-gray-600 mb-1">Name</label>
        <input className="w-full border rounded px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="block text-sm text-gray-600 mb-1">URL</label>
        <input className="w-full border rounded px-3 py-2" value={url} onChange={(e) => setUrl(e.target.value)} />
      </div>
      <div>
        <label className="block text-sm text-gray-600 mb-1">Secret (optional)</label>
        <input className="w-full border rounded px-3 py-2" value={secret} onChange={(e) => setSecret(e.target.value)} />
      </div>
      <div>
        <label className="block text-sm text-gray-600 mb-1">Events</label>
        <input className="w-full border rounded px-3 py-2" value={events} onChange={(e) => setEvents(e.target.value)} />
        <div className="text-xs text-gray-500 mt-1">Comma separated, e.g. document.processed,training.completed</div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="submit" disabled={busy} className="btn btn-primary text-sm">{busy ? 'Saving…' : 'Create'}</button>
      </div>
    </form>
  );
};