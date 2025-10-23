import React, { useState, useEffect } from 'react';
import { Mail, Check, X, Loader, Plus, Trash2, Settings } from 'lucide-react';
import { EmailConfigurationService, type EmailConfiguration } from '../../services/email/EmailConfigurationService';
import { OAuthService } from '../../services/email/OAuthService';
import { useAuthStore } from '../../store/authStore';

export const EmailConfigurationPanel: React.FC = () => {
  const { user } = useAuthStore();
  const [configurations, setConfigurations] = useState<EmailConfiguration[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  
  const configService = EmailConfigurationService.getInstance();

  useEffect(() => {
    loadConfigurations();
  }, [user]);

  const loadConfigurations = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const configs = await configService.getAllConfigurations(user.id);
      setConfigurations(configs);
    } catch (error) {
      console.error('Failed to load configurations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async (config: EmailConfiguration) => {
    setTestingConnection(config.id);
    try {
      const result = await configService.testConnection(config);
      alert(result.success ? '✅ Connection successful!' : `❌ ${result.message}`);
    } catch (error) {
      alert(`❌ Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setTestingConnection(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this email configuration?')) return;
    
    try {
      await configService.deleteConfiguration(id);
      await loadConfigurations();
    } catch (error) {
      alert('Failed to delete configuration');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2">Loading configurations...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center space-x-2">
            <Mail className="w-7 h-7 text-blue-600" />
            <span>Email Configuration</span>
          </h2>
          <p className="text-gray-600 mt-1">
            Connect your email accounts for AI-powered productivity features
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          <span>Add Email Account</span>
        </button>
      </div>

      {/* Existing Configurations */}
      <div className="space-y-4">
        {configurations.map((config) => (
          <div
            key={config.id}
            className="bg-white border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-gray-600" />
                  <div>
                    <h3 className="font-semibold text-lg">{config.displayName}</h3>
                    <p className="text-gray-600">{config.email}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    config.status === 'active' ? 'bg-green-100 text-green-800' :
                    config.status === 'error' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {config.status}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Provider:</span>
                    <span className="ml-2 font-medium">{config.provider.toUpperCase()}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Last Sync:</span>
                    <span className="ml-2 font-medium">
                      {config.lastSync ? config.lastSync.toLocaleString() : 'Never'}
                    </span>
                  </div>
                </div>

                {/* Features */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {config.autoProcessing && (
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                      Auto-processing
                    </span>
                  )}
                  {config.autoResponse && (
                    <span className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded">
                      Auto-response
                    </span>
                  )}
                  {config.dailySummary && (
                    <span className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded">
                      Daily summary
                    </span>
                  )}
                  {config.proactiveOutreach && (
                    <span className="px-2 py-1 bg-orange-50 text-orange-700 text-xs rounded">
                      Proactive outreach
                    </span>
                  )}
                </div>

                {config.lastError && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                    Error: {config.lastError}
                  </div>
                )}
              </div>

              <div className="flex flex-col space-y-2">
                <button
                  onClick={() => handleTestConnection(config)}
                  disabled={testingConnection === config.id}
                  className="p-2 border rounded hover:bg-gray-50 disabled:opacity-50"
                  title="Test connection"
                >
                  {testingConnection === config.id ? (
                    <Loader className="w-5 h-5 animate-spin" />
                  ) : (
                    <Check className="w-5 h-5 text-green-600" />
                  )}
                </button>
                <button
                  onClick={() => handleDelete(config.id)}
                  className="p-2 border rounded hover:bg-red-50"
                  title="Delete"
                >
                  <Trash2 className="w-5 h-5 text-red-600" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {configurations.length === 0 && !showAddForm && (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed">
            <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No email accounts configured
            </h3>
            <p className="text-gray-600 mb-4">
              Connect your email to enable AI-powered productivity features
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              <span>Add Email Account</span>
            </button>
          </div>
        )}
      </div>

      {/* Add Email Form */}
      {showAddForm && (
        <EmailConfigurationForm
          onSave={async (config) => {
            await configService.saveConfiguration(config);
            await loadConfigurations();
            setShowAddForm(false);
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}
    </div>
  );
};

interface EmailConfigurationFormProps {
  onSave: (config: any) => Promise<void>;
  onCancel: () => void;
}

const EmailConfigurationForm: React.FC<EmailConfigurationFormProps> = ({ onSave, onCancel }) => {
  const { user } = useAuthStore();
  const [provider, setProvider] = useState<'gmail' | 'outlook' | 'zoho' | 'yahoo' | 'imap' | 'generic'>('gmail');
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    name: '',
    imapHost: '',
    imapPort: 993,
    imapUsername: '',
    imapPassword: '',
    smtpHost: '',
    smtpPort: 587,
    smtpUsername: '',
    smtpPassword: '',
    autoProcessing: true,
    autoResponse: false,
    dailySummary: true,
    proactiveOutreach: true
  });
  const [isSaving, setIsSaving] = useState(false);
  
  const oauthService = OAuthService.getInstance();

  const handleOAuthConnect = async (provider: 'gmail' | 'outlook' | 'zoho' | 'yahoo') => {
    setIsSaving(true);
    
    try {
      // Check if OAuth is configured
      const configStatus = oauthService.getConfigurationStatus();
      const providerConfig = 
        provider === 'gmail' ? configStatus.google :
        provider === 'outlook' ? configStatus.microsoft :
        provider === 'zoho' ? configStatus.zoho :
        configStatus.yahoo;
      
      if (!providerConfig.configured) {
        alert(`OAuth not configured. Please set the following environment variables:\n${providerConfig.missing.join('\n')}`);
        setIsSaving(false);
        return;
      }

      // Generate OAuth URL
      const state = crypto.randomUUID();
      const authUrl = 
        provider === 'gmail' ? oauthService.generateGoogleAuthUrl(state) :
        provider === 'outlook' ? oauthService.generateMicrosoftAuthUrl(state) :
        provider === 'zoho' ? oauthService.generateZohoAuthUrl(state) :
        oauthService.generateYahooAuthUrl(state);

      // Store state for verification
      sessionStorage.setItem('oauth_state', state);
      sessionStorage.setItem('oauth_provider', provider);

      // Open OAuth popup
      const popup = window.open(
        authUrl,
        'oauth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        alert('Popup blocked. Please allow popups for this site and try again.');
        setIsSaving(false);
        return;
      }

      // Listen for OAuth completion
      const checkClosed = setInterval(async () => {
        if (popup.closed) {
          clearInterval(checkClosed);
          setIsSaving(false);
          
          // Check if OAuth was successful
          const authResult = sessionStorage.getItem('oauth_result');
          if (authResult) {
            try {
              const tokens = JSON.parse(authResult);
              
              // Auto-fill form with OAuth data
              setFormData(prev => ({
                ...prev,
                displayName: tokens.user?.name || tokens.user?.email || '',
                email: tokens.user?.email || '',
                name: tokens.user?.name || tokens.user?.email || ''
              }));
              
              // Save the OAuth configuration
              await onSave({
                userId: user?.id,
                provider,
                displayName: tokens.user?.name || tokens.user?.email || '',
                email: tokens.user?.email || '',
                name: tokens.user?.name || tokens.user?.email || '',
                oauthProvider: 
                  provider === 'gmail' ? 'google' :
                  provider === 'outlook' ? 'microsoft' :
                  provider === 'zoho' ? 'zoho' :
                  'yahoo',
                oauthAccessToken: tokens.accessToken,
                oauthRefreshToken: tokens.refreshToken,
                oauthTokenExpiry: tokens.expiresAt,
                autoProcessing: true,
                autoResponse: false,
                dailySummary: true,
                proactiveOutreach: true,
                status: 'active'
              });
              
              // Clean up
              sessionStorage.removeItem('oauth_result');
              sessionStorage.removeItem('oauth_state');
              sessionStorage.removeItem('oauth_provider');
              
            } catch (error) {
              console.error('Failed to parse OAuth result:', error);
              alert('OAuth authentication failed. Please try again.');
            }
          }
        }
      }, 1000);

    } catch (error) {
      console.error('OAuth connection failed:', error);
      alert(`Failed to connect ${provider} account: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await onSave({
        userId: user?.id,
        provider,
        ...formData,
        status: 'active'
      });
    } catch (error) {
      alert('Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">Add Email Account</h3>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Provider Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Provider
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setProvider('gmail')}
                className={`p-4 border-2 rounded-lg text-center ${
                  provider === 'gmail' ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="font-medium">Gmail</div>
                <div className="text-xs text-gray-600">Google Workspace</div>
              </button>
              <button
                type="button"
                onClick={() => setProvider('outlook')}
                className={`p-4 border-2 rounded-lg text-center ${
                  provider === 'outlook' ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="font-medium">Outlook</div>
                <div className="text-xs text-gray-600">Microsoft 365</div>
              </button>
              <button
                type="button"
                onClick={() => setProvider('zoho')}
                className={`p-4 border-2 rounded-lg text-center ${
                  provider === 'zoho' ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="font-medium">Zoho Mail</div>
                <div className="text-xs text-gray-600">Zoho Workspace</div>
              </button>
              <button
                type="button"
                onClick={() => setProvider('yahoo')}
                className={`p-4 border-2 rounded-lg text-center ${
                  provider === 'yahoo' ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="font-medium">Yahoo Mail</div>
                <div className="text-xs text-gray-600">Yahoo</div>
              </button>
              <button
                type="button"
                onClick={() => setProvider('imap')}
                className={`p-4 border-2 rounded-lg text-center ${
                  provider === 'imap' ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="font-medium">IMAP/SMTP</div>
                <div className="text-xs text-gray-600">Custom server</div>
              </button>
              <button
                type="button"
                onClick={() => setProvider('generic')}
                className={`p-4 border-2 rounded-lg text-center ${
                  provider === 'generic' ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="font-medium">Generic</div>
                <div className="text-xs text-gray-600">Any IMAP/SMTP</div>
              </button>
            </div>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Work Email"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="you@company.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="John Doe"
              required
            />
          </div>

          {/* OAuth Providers */}
          {(provider === 'gmail' || provider === 'outlook' || provider === 'zoho' || provider === 'yahoo') && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 mb-3">
                Click below to connect your {
                  provider === 'gmail' ? 'Google' :
                  provider === 'outlook' ? 'Microsoft' :
                  provider === 'zoho' ? 'Zoho' :
                  'Yahoo'
                } account securely using OAuth.
              </p>
              <button
                type="button"
                onClick={() => handleOAuthConnect(provider)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Connect {
                      provider === 'gmail' ? 'Google Account' :
                      provider === 'outlook' ? 'Microsoft Account' :
                      provider === 'zoho' ? 'Zoho Account' :
                      'Yahoo Account'
                    }
                  </>
                )}
              </button>
            </div>
          )}

          {/* IMAP/SMTP Settings */}
          {provider === 'imap' && (
            <>
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">IMAP Settings (Receiving Email)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      IMAP Host
                    </label>
                    <input
                      type="text"
                      value={formData.imapHost}
                      onChange={(e) => setFormData({ ...formData, imapHost: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="imap.gmail.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      IMAP Port
                    </label>
                    <input
                      type="number"
                      value={formData.imapPort}
                      onChange={(e) => setFormData({ ...formData, imapPort: parseInt(e.target.value) })}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="993"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      value={formData.imapUsername}
                      onChange={(e) => setFormData({ ...formData, imapUsername: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="username"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      value={formData.imapPassword}
                      onChange={(e) => setFormData({ ...formData, imapPassword: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">SMTP Settings (Sending Email)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SMTP Host
                    </label>
                    <input
                      type="text"
                      value={formData.smtpHost}
                      onChange={(e) => setFormData({ ...formData, smtpHost: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="smtp.gmail.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SMTP Port
                    </label>
                    <input
                      type="number"
                      value={formData.smtpPort}
                      onChange={(e) => setFormData({ ...formData, smtpPort: parseInt(e.target.value) })}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="587"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      value={formData.smtpUsername}
                      onChange={(e) => setFormData({ ...formData, smtpUsername: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="username"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      value={formData.smtpPassword}
                      onChange={(e) => setFormData({ ...formData, smtpPassword: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* AI Features */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">AI Features</h4>
            <div className="space-y-3">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={formData.autoProcessing}
                  onChange={(e) => setFormData({ ...formData, autoProcessing: e.target.checked })}
                  className="w-4 h-4 text-blue-600"
                />
                <div>
                  <div className="font-medium">Auto-processing</div>
                  <div className="text-sm text-gray-600">Automatically classify and organize emails</div>
                </div>
              </label>

              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={formData.autoResponse}
                  onChange={(e) => setFormData({ ...formData, autoResponse: e.target.checked })}
                  className="w-4 h-4 text-blue-600"
                />
                <div>
                  <div className="font-medium">Auto-response</div>
                  <div className="text-sm text-gray-600">AI responds to routine emails automatically</div>
                </div>
              </label>

              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={formData.dailySummary}
                  onChange={(e) => setFormData({ ...formData, dailySummary: e.target.checked })}
                  className="w-4 h-4 text-blue-600"
                />
                <div>
                  <div className="font-medium">Daily summary</div>
                  <div className="text-sm text-gray-600">Receive daily email summary every morning</div>
                </div>
              </label>

              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={formData.proactiveOutreach}
                  onChange={(e) => setFormData({ ...formData, proactiveOutreach: e.target.checked })}
                  className="w-4 h-4 text-blue-600"
                />
                <div>
                  <div className="font-medium">Proactive outreach</div>
                  <div className="text-sm text-gray-600">AI identifies and suggests follow-ups</div>
                </div>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 border-t pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
            >
              {isSaving && <Loader className="w-4 h-4 animate-spin" />}
              <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
