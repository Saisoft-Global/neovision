import { Link2, Check } from 'lucide-react';

const Integrations = () => {
  const integrations = [
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
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Integrations</h1>

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