import React, { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface AIConfigData {
  ai_agent_base_url: string;
  ai_agent_timeout: number;
  chat_session_timeout: number;
  max_chat_history: number;
  vector_dimensions: number;
  similarity_threshold: number;
  max_search_results: number;
  insight_types: string[];
  max_insight_length: number;
  mcp_enabled: boolean;
  mcp_port: number;
  features: {
    enable_ai_chat: boolean;
    enable_knowledge_base: boolean;
    enable_document_insights: boolean;
    enable_ai_workflows: boolean;
  };
}

interface AIHealth {
  ai_agent_api: {
    status: string;
    message: string;
    base_url: string;
  };
  features: {
    ai_chat: string;
    knowledge_base: string;
    document_insights: string;
    ai_workflows: string;
    mcp_server: string;
  };
}

const AIConfig: React.FC = () => {
  const [config, setConfig] = useState<AIConfigData | null>(null);
  const [health, setHealth] = useState<AIHealth | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const fetchConfig = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/ai/config');
      const data = await response.json();
      if (data.status === 'success') {
        setConfig(data.configuration);
      }
    } catch (error) {
      console.error('Error fetching AI config:', error);
      setMessage({ type: 'error', text: 'Failed to fetch AI configuration' });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHealth = async () => {
    try {
      const response = await fetch('/api/ai/health');
      const data = await response.json();
      if (data.status === 'success') {
        setHealth(data.health);
      }
    } catch (error) {
      console.error('Error fetching AI health:', error);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchHealth();
  }, []);

  const handleSave = async () => {
    if (!config) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/ai/config/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config)
      });

      const data = await response.json();
      if (data.status === 'success') {
        setMessage({ type: 'success', text: 'AI configuration updated successfully' });
        fetchHealth(); // Refresh health status
      } else {
        setMessage({ type: 'error', text: data.detail || 'Failed to update configuration' });
      }
    } catch (error) {
      console.error('Error saving AI config:', error);
      setMessage({ type: 'error', text: 'Failed to save AI configuration' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    if (!config) return;

    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setConfig(prev => ({
        ...prev!,
        [parent]: {
          ...prev![parent as keyof AIConfigData] as any,
          [child]: value
        }
      }));
    } else {
      setConfig(prev => ({
        ...prev!,
        [field]: value
      }));
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'enabled':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'unhealthy':
      case 'disabled':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2 text-gray-600">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Loading AI configuration...
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="text-center py-12">
        <XCircle className="w-16 h-16 text-red-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Configuration Not Available</h3>
        <p className="text-gray-500">Unable to load AI configuration</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-500" />
          <h2 className="text-xl font-semibold text-gray-900">AI Configuration</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchHealth}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <RefreshCw className="w-4 h-4" />
            Check Health
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-800' :
          message.type === 'error' ? 'bg-red-50 text-red-800' :
          'bg-blue-50 text-blue-800'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> :
           message.type === 'error' ? <XCircle className="w-4 h-4" /> :
           <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {/* Health Status */}
      {health && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Service Health</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {getStatusIcon(health.ai_agent_api.status)}
                <span className="font-medium">AI Agent API</span>
                <span className="text-sm text-gray-500">({health.ai_agent_api.base_url})</span>
              </div>
              <p className="text-sm text-gray-600 ml-6">{health.ai_agent_api.message}</p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Features</h4>
              {Object.entries(health.features).map(([feature, status]) => (
                <div key={feature} className="flex items-center gap-2">
                  {getStatusIcon(status)}
                  <span className="text-sm capitalize">{feature.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Configuration Form */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">AI Agent Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              AI Agent Base URL
            </label>
            <input
              type="url"
              value={config.ai_agent_base_url}
              onChange={(e) => handleInputChange('ai_agent_base_url', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://your-ai-agent.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API Timeout (seconds)
            </label>
            <input
              type="number"
              value={config.ai_agent_timeout}
              onChange={(e) => handleInputChange('ai_agent_timeout', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="5"
              max="300"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Chat Session Timeout (seconds)
            </label>
            <input
              type="number"
              value={config.chat_session_timeout}
              onChange={(e) => handleInputChange('chat_session_timeout', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="300"
              max="86400"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Chat History
            </label>
            <input
              type="number"
              value={config.max_chat_history}
              onChange={(e) => handleInputChange('max_chat_history', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="10"
              max="1000"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Similarity Threshold
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="1"
              value={config.similarity_threshold}
              onChange={(e) => handleInputChange('similarity_threshold', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Search Results
            </label>
            <input
              type="number"
              value={config.max_search_results}
              onChange={(e) => handleInputChange('max_search_results', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
              max="100"
            />
          </div>
        </div>
      </div>

      {/* Feature Toggles */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Feature Toggles</h3>
        <div className="space-y-4">
          {Object.entries(config.features).map(([feature, enabled]) => (
            <div key={feature} className="flex items-center justify-between">
              <div>
                <span className="font-medium text-gray-900 capitalize">
                  {feature.replace('enable_', '').replace('_', ' ')}
                </span>
                <p className="text-sm text-gray-500">
                  {feature === 'enable_ai_chat' && 'Enable AI chat functionality'}
                  {feature === 'enable_knowledge_base' && 'Enable knowledge base and vector search'}
                  {feature === 'enable_document_insights' && 'Enable AI-powered document insights'}
                  {feature === 'enable_ai_workflows' && 'Enable AI-enhanced workflows'}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => handleInputChange(`features.${feature}`, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AIConfig;
