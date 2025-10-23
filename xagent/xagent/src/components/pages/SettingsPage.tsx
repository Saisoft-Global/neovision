import React, { useState } from 'react';
import { Settings, Mail, Shield, Bell, Palette, Zap } from 'lucide-react';
import { EmailConfigurationPanel } from '../settings/EmailConfigurationPanel';
import { PerformanceModeSelector } from '../settings/PerformanceModeSelector';
import { ModernCard } from '../ui/ModernCard';
import { ModernButton } from '../ui/ModernButton';

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('performance');

  const tabs = [
    { id: 'performance', label: 'Performance', icon: Zap, component: PerformanceModeSelector },
    { id: 'email', label: 'Email', icon: Mail, component: EmailConfigurationPanel },
    { id: 'security', label: 'Security', icon: Shield, component: null },
    { id: 'notifications', label: 'Notifications', icon: Bell, component: null },
    { id: 'appearance', label: 'Appearance', icon: Palette, component: null }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600">
          <Settings className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white">Settings</h1>
      </div>
      <p className="text-white/60 text-sm md:text-base">
        ⚙️ Configure your application preferences and integrations
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings Navigation */}
        <div className="lg:col-span-1">
          <ModernCard variant="glass" className="p-4">
            <nav className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'bg-white/20 text-white'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </ModernCard>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          <ModernCard variant="glass" className="p-6">
            {ActiveComponent ? (
              <ActiveComponent />
            ) : (
              <div className="text-center py-12">
                <div className="p-4 rounded-xl bg-white/5 inline-block mb-4">
                  {React.createElement(tabs.find(tab => tab.id === activeTab)?.icon || Settings, {
                    className: "w-8 h-8 text-white/60"
                  })}
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {tabs.find(tab => tab.id === activeTab)?.label} Settings
                </h3>
                <div className="space-y-4 text-left max-w-md mx-auto">
                  {activeTab === 'security' && (
                    <div className="space-y-3">
                      <p className="text-white/80 font-medium">🔒 Security Features:</p>
                      <ul className="space-y-2 text-white/60 text-sm">
                        <li>• Role-based access control (RBAC) implemented</li>
                        <li>• Supabase authentication with JWT tokens</li>
                        <li>• Secure API endpoints with auth middleware</li>
                        <li>• Session management and timeout</li>
                      </ul>
                      <p className="text-white/60 text-sm mt-4">
                        Advanced security settings like 2FA, API keys, and audit logs can be configured through the admin panel.
                      </p>
                    </div>
                  )}
                  {activeTab === 'notifications' && (
                    <div className="space-y-3">
                      <p className="text-white/80 font-medium">🔔 Notification System:</p>
                      <ul className="space-y-2 text-white/60 text-sm">
                        <li>• Real-time browser notifications</li>
                        <li>• Email notifications via configured providers</li>
                        <li>• Task and meeting reminders</li>
                        <li>• Agent activity alerts</li>
                      </ul>
                      <p className="text-white/60 text-sm mt-4">
                        Notification preferences are automatically managed by the Productivity AI agent based on your patterns.
                      </p>
                    </div>
                  )}
                  {activeTab === 'appearance' && (
                    <div className="space-y-3">
                      <p className="text-white/80 font-medium">🎨 Current Theme:</p>
                      <ul className="space-y-2 text-white/60 text-sm">
                        <li>• Modern glassmorphism design</li>
                        <li>• Animated gradient backgrounds</li>
                        <li>• Dark mode optimized</li>
                        <li>• Reduced motion support</li>
                        <li>• Mobile-responsive layouts</li>
                      </ul>
                      <p className="text-white/60 text-sm mt-4">
                        The current theme is designed for optimal readability and accessibility. Custom themes can be added in future versions.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </ModernCard>
        </div>
      </div>
    </div>
  );
};
