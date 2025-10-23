/**
 * LLM Settings Panel
 * Allows users to configure their personal LLM API keys and preferences
 */

import React, { useState, useEffect } from 'react';
import { Settings, Key, Zap, Brain, PenTool, Globe, Trash2, Save, Eye, EyeOff } from 'lucide-react';
import { userLLMSettingsService, UserLLMSettings } from '../../services/llm/UserLLMSettingsService';
import { getSupabaseClient } from '../../config/supabase/client';

interface LLMSettingsPanelProps {
  className?: string;
}

interface ProviderConfig {
  name: string;
  displayName: string;
  icon: React.ReactNode;
  description: string;
  keyField: keyof UserLLMSettings;
  placeholder: string;
  priority: number;
}

const PROVIDERS: ProviderConfig[] = [
  {
    name: 'openai',
    displayName: 'OpenAI',
    icon: <Brain className="w-5 h-5" />,
    description: 'GPT models for general tasks and coding',
    keyField: 'openaiApiKey',
    placeholder: 'sk-...',
    priority: 5
  },
  {
    name: 'groq',
    displayName: 'Groq',
    icon: <Zap className="w-5 h-5" />,
    description: 'Ultra-fast inference for real-time tasks',
    keyField: 'groqApiKey',
    placeholder: 'gsk_...',
    priority: 1
  },
  {
    name: 'mistral',
    displayName: 'Mistral',
    icon: <Brain className="w-5 h-5" />,
    description: 'Superior reasoning for research and analysis',
    keyField: 'mistralApiKey',
    placeholder: '...',
    priority: 2
  },
  {
    name: 'anthropic',
    displayName: 'Claude',
    icon: <PenTool className="w-5 h-5" />,
    description: 'Best creativity for writing and content',
    keyField: 'anthropicApiKey',
    placeholder: 'sk-ant-...',
    priority: 3
  },
  {
    name: 'google',
    displayName: 'Gemini',
    icon: <Globe className="w-5 h-5" />,
    description: 'Multilingual support and translation',
    keyField: 'googleApiKey',
    placeholder: 'AIza...',
    priority: 4
  }
];

export const LLMSettingsPanel: React.FC<LLMSettingsPanelProps> = ({ className = '' }) => {
  const [settings, setSettings] = useState<UserLLMSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({});
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('Please log in to manage LLM settings');
        return;
      }

      setCurrentUser(user);
      const userSettings = await userLLMSettingsService.getUserSettings(user.id);
      setSettings(userSettings);
    } catch (err) {
      setError('Failed to load LLM settings');
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings || !currentUser) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      await userLLMSettingsService.updateUserSettings(currentUser.id, {
        openaiApiKey: settings.openaiApiKey,
        groqApiKey: settings.groqApiKey,
        mistralApiKey: settings.mistralApiKey,
        anthropicApiKey: settings.anthropicApiKey,
        googleApiKey: settings.googleApiKey,
        defaultProvider: settings.defaultProvider,
        enableFallbacks: settings.enableFallbacks,
        providerPreferences: settings.providerPreferences,
        taskOverrides: settings.taskOverrides
      });

      setSuccess('LLM settings saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to save LLM settings');
      console.error('Error saving settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const updateProviderPreference = (providerName: string, field: 'enabled' | 'priority', value: any) => {
    if (!settings) return;

    const updatedPreferences = {
      ...settings.providerPreferences,
      [providerName]: {
        ...settings.providerPreferences[providerName],
        [field]: value
      }
    };

    setSettings({
      ...settings,
      providerPreferences: updatedPreferences
    });
  };

  const toggleKeyVisibility = (providerName: string) => {
    setShowKeys(prev => ({
      ...prev,
      [providerName]: !prev[providerName]
    }));
  };

  const clearApiKey = (keyField: keyof UserLLMSettings) => {
    if (!settings) return;

    setSettings({
      ...settings,
      [keyField]: undefined
    });
  };

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="text-center text-gray-400">
          <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Failed to load LLM settings</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Settings className="w-6 h-6" />
            LLM Settings
          </h2>
          <p className="text-gray-400 mt-1">
            Configure your personal LLM API keys and preferences
          </p>
        </div>
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-red-300">
          {error}
        </div>
      )}
      
      {success && (
        <div className="p-4 bg-green-900/20 border border-green-500/50 rounded-lg text-green-300">
          {success}
        </div>
      )}

      {/* Global Settings */}
      <div className="bg-white/5 rounded-lg p-4 space-y-4">
        <h3 className="text-lg font-semibold text-white">Global Settings</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Default Provider
            </label>
            <select
              value={settings.defaultProvider}
              onChange={(e) => setSettings({ ...settings, defaultProvider: e.target.value })}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {PROVIDERS.map(provider => (
                <option key={provider.name} value={provider.name}>
                  {provider.displayName}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="enableFallbacks"
              checked={settings.enableFallbacks}
              onChange={(e) => setSettings({ ...settings, enableFallbacks: e.target.checked })}
              className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500"
            />
            <label htmlFor="enableFallbacks" className="text-sm text-gray-300">
              Enable intelligent fallbacks
            </label>
          </div>
        </div>
      </div>

      {/* Provider Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Provider Settings</h3>
        
        {PROVIDERS.map(provider => {
          const apiKey = settings[provider.keyField] as string;
          const isVisible = showKeys[provider.name];
          const isEnabled = settings.providerPreferences[provider.name]?.enabled !== false;
          const priority = settings.providerPreferences[provider.name]?.priority || provider.priority;

          return (
            <div key={provider.name} className="bg-white/5 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {provider.icon}
                  <div>
                    <h4 className="font-semibold text-white">{provider.displayName}</h4>
                    <p className="text-sm text-gray-400">{provider.description}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={(e) => updateProviderPreference(provider.name, 'enabled', e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-300">Enabled</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    API Key
                  </label>
                  <div className="relative">
                    <input
                      type={isVisible ? 'text' : 'password'}
                      value={apiKey || ''}
                      onChange={(e) => setSettings({
                        ...settings,
                        [provider.keyField]: e.target.value
                      })}
                      placeholder={provider.placeholder}
                      className="w-full px-3 py-2 pr-20 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                      <button
                        type="button"
                        onClick={() => toggleKeyVisibility(provider.name)}
                        className="p-1 text-gray-400 hover:text-white transition-colors"
                      >
                        {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      {apiKey && (
                        <button
                          type="button"
                          onClick={() => clearApiKey(provider.keyField)}
                          className="p-1 text-red-400 hover:text-red-300 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => updateProviderPreference(provider.name, 'priority', parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {[1, 2, 3, 4, 5].map(p => (
                      <option key={p} value={p}>{p} (Priority {p})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${apiKey ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                <span className={apiKey ? 'text-green-400' : 'text-gray-400'}>
                  {apiKey ? 'API Key configured' : 'API Key not configured'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Usage Statistics */}
      <div className="bg-white/5 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-3">Usage Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Total Requests:</span>
            <span className="text-white ml-2 font-medium">{settings.totalRequests}</span>
          </div>
          <div>
            <span className="text-gray-400">Last Used:</span>
            <span className="text-white ml-2 font-medium">
              {settings.lastUsedAt 
                ? new Date(settings.lastUsedAt).toLocaleDateString()
                : 'Never'
              }
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};


