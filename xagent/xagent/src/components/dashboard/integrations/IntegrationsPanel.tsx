import React from 'react';
import { Plus } from 'lucide-react';
import { IntegrationManager } from '../../../services/integration/IntegrationManager';
import { IntegrationCard } from './IntegrationCard';
import { NewIntegrationModal } from './NewIntegrationModal';

export const IntegrationsPanel: React.FC = () => {
  const [showModal, setShowModal] = React.useState(false);
  const [integrations, setIntegrations] = React.useState<any[]>([]);
  const integrationManager = IntegrationManager.getInstance();

  const handleConnect = async (type: string, config: any) => {
    try {
      await integrationManager.connect(type, config);
      // Refresh integrations list
      loadIntegrations();
    } catch (error) {
      console.error('Integration error:', error);
    }
  };

  const loadIntegrations = () => {
    // Implementation would load configured integrations
    setIntegrations([
      { type: 'microsoft365', name: 'Microsoft 365', connected: false },
      { type: 'salesforce', name: 'Salesforce', connected: false },
    ]);
  };

  React.useEffect(() => {
    loadIntegrations();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Integrations</h2>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Add Integration
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {integrations.map((integration) => (
          <IntegrationCard
            key={integration.type}
            integration={integration}
            onConnect={handleConnect}
          />
        ))}
      </div>

      {showModal && (
        <NewIntegrationModal
          onClose={() => setShowModal(false)}
          onConnect={handleConnect}
        />
      )}
    </div>
  );
};