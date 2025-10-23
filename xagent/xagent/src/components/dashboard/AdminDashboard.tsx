import React, { useState } from 'react';
import { Settings, Users, Database, Shield, Activity, BarChart3, Cog, AlertTriangle } from 'lucide-react';
import { ModernCard } from '../ui/ModernCard';
import { ModernButton } from '../ui/ModernButton';
import { StatusBadge } from '../ui/StatusBadge';
import { useAuthStore } from '../../store/authStore';

const AdminDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');

  const stats = [
    {
      label: 'Total Users',
      value: '156',
      change: '+12 this week',
      icon: Users,
      color: 'from-blue-500 to-indigo-500'
    },
    {
      label: 'Active Sessions',
      value: '43',
      change: '+8 today',
      icon: Activity,
      color: 'from-green-500 to-emerald-500'
    },
    {
      label: 'Documents Processed',
      value: '2,847',
      change: '+234 today',
      icon: Database,
      color: 'from-purple-500 to-pink-500'
    },
    {
      label: 'System Health',
      value: '98.5%',
      change: 'All systems operational',
      icon: Shield,
      color: 'from-emerald-500 to-teal-500'
    }
  ];

  const systemStatus = [
    { service: 'Supabase Database', status: 'operational', uptime: '99.9%' },
    { service: 'Pinecone Vector DB', status: 'operational', uptime: '99.8%' },
    { service: 'Neo4j Graph DB', status: 'operational', uptime: '99.7%' },
    { service: 'OpenAI API', status: 'operational', uptime: '99.5%' }
  ];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'system', label: 'System', icon: Settings },
    { id: 'security', label: 'Security', icon: Shield }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Admin Dashboard
          </h1>
          <p className="text-white/60 text-sm md:text-base">
            Welcome back, <span className="font-semibold text-white">{user?.email}</span>
          </p>
        </div>
        <StatusBadge status="online" label="Admin Panel" pulse />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <ModernCard key={index} variant="glass" className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.color}`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <StatusBadge status="success" label={stat.change} size="sm" />
              </div>
              <div>
                <p className="text-white/60 text-xs uppercase tracking-wide mb-1">
                  {stat.label}
                </p>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
              </div>
            </ModernCard>
          );
        })}
      </div>

      {/* Tabs */}
      <ModernCard variant="glass" className="p-6">
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <ModernButton
                key={tab.id}
                variant={activeTab === tab.id ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2"
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </ModernButton>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">System Status</h3>
              <div className="grid gap-3">
                {systemStatus.map((service, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <StatusBadge 
                        status={service.status === 'operational' ? 'success' : 'error'} 
                        label={service.service}
                      />
                    </div>
                    <div className="text-right">
                      <p className="text-white/60 text-sm">{service.uptime}</p>
                      <p className="text-xs text-white/40">{service.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-white mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <ModernButton variant="outline" className="h-auto p-4 flex-col gap-2">
                  <Users className="w-5 h-5" />
                  <span className="text-xs">Manage Users</span>
                </ModernButton>
                <ModernButton variant="outline" className="h-auto p-4 flex-col gap-2">
                  <Database className="w-5 h-5" />
                  <span className="text-xs">Database Tools</span>
                </ModernButton>
                <ModernButton variant="outline" className="h-auto p-4 flex-col gap-2">
                  <Shield className="w-5 h-5" />
                  <span className="text-xs">Security</span>
                </ModernButton>
                <ModernButton variant="outline" className="h-auto p-4 flex-col gap-2">
                  <Cog className="w-5 h-5" />
                  <span className="text-xs">Settings</span>
                </ModernButton>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            <h3 className="text-xl font-semibold text-white mb-4">User Management</h3>
            <div className="space-y-4">
              <div className="bg-white/5 rounded-lg p-6">
                <h4 className="text-white font-medium mb-3">👥 Current Implementation</h4>
                <ul className="space-y-2 text-white/60 text-sm">
                  <li>• <span className="text-white/80">Authentication:</span> Supabase Auth with JWT</li>
                  <li>• <span className="text-white/80">Authorization:</span> Role-based access control (RBAC)</li>
                  <li>• <span className="text-white/80">User Roles:</span> Admin, User</li>
                  <li>• <span className="text-white/80">Session Management:</span> Automatic token refresh</li>
                </ul>
              </div>
              <div className="bg-white/5 rounded-lg p-6">
                <h4 className="text-white font-medium mb-3">🔧 Available Operations</h4>
                <p className="text-white/60 text-sm mb-3">
                  User management is handled through Supabase Dashboard:
                </p>
                <ul className="space-y-2 text-white/60 text-sm">
                  <li>• View all users in Supabase Auth</li>
                  <li>• Manage user roles and permissions</li>
                  <li>• Monitor authentication logs</li>
                  <li>• Configure email templates</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'system' && (
          <div>
            <h3 className="text-xl font-semibold text-white mb-4">System Configuration</h3>
            <div className="space-y-4">
              <div className="bg-white/5 rounded-lg p-6">
                <h4 className="text-white font-medium mb-3">⚙️ Environment Configuration</h4>
                <ul className="space-y-2 text-white/60 text-sm">
                  <li>• <span className="text-white/80">Frontend:</span> Vite + React + TypeScript</li>
                  <li>• <span className="text-white/80">Backend:</span> FastAPI (Python)</li>
                  <li>• <span className="text-white/80">Database:</span> Supabase (PostgreSQL)</li>
                  <li>• <span className="text-white/80">Vector DB:</span> Pinecone</li>
                  <li>• <span className="text-white/80">Graph DB:</span> Neo4j</li>
                  <li>• <span className="text-white/80">LLM:</span> OpenAI / Groq / Ollama</li>
                </ul>
              </div>
              <div className="bg-white/5 rounded-lg p-6">
                <h4 className="text-white font-medium mb-3">📊 Service Status</h4>
                <div className="space-y-2">
                  {systemStatus.map((service, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <span className="text-white/80 text-sm">{service.service}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-white/60 text-xs">{service.uptime}</span>
                        <StatusBadge status={service.status} size="sm" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div>
            <h3 className="text-xl font-semibold text-white mb-4">Security Settings</h3>
            <div className="space-y-4">
              <div className="bg-white/5 rounded-lg p-6">
                <h4 className="text-white font-medium mb-3">🔒 Security Features</h4>
                <ul className="space-y-2 text-white/60 text-sm">
                  <li>• <span className="text-white/80">Authentication:</span> JWT tokens with automatic refresh</li>
                  <li>• <span className="text-white/80">Authorization:</span> Protected routes with role checks</li>
                  <li>• <span className="text-white/80">API Security:</span> CORS configured, rate limiting ready</li>
                  <li>• <span className="text-white/80">Data Encryption:</span> TLS/SSL for all connections</li>
                  <li>• <span className="text-white/80">Password Policy:</span> Managed by Supabase Auth</li>
                </ul>
              </div>
              <div className="bg-white/5 rounded-lg p-6">
                <h4 className="text-white font-medium mb-3">🛡️ Best Practices</h4>
                <ul className="space-y-2 text-white/60 text-sm">
                  <li>• Environment variables properly configured</li>
                  <li>• API keys never exposed to frontend</li>
                  <li>• Input validation on all endpoints</li>
                  <li>• Session timeout and token expiration</li>
                  <li>• Supabase Row Level Security (RLS) policies</li>
                </ul>
              </div>
              <div className="bg-white/5 rounded-lg p-6">
                <h4 className="text-white font-medium mb-3">📋 Security Checklist</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-green-500/20 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-green-400"></div>
                    </div>
                    <span className="text-white/80">Authentication implemented</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-green-500/20 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-green-400"></div>
                    </div>
                    <span className="text-white/80">RBAC configured</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-green-500/20 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-green-400"></div>
                    </div>
                    <span className="text-white/80">Protected routes active</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-green-500/20 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-green-400"></div>
                    </div>
                    <span className="text-white/80">Environment variables secured</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </ModernCard>

      {/* Recent Activity */}
      <ModernCard variant="glass" className="p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Recent Activity</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
            <div className="p-2 rounded-lg bg-green-500/20">
              <Activity className="w-4 h-4 text-green-400" />
            </div>
            <div className="flex-1">
              <p className="text-white text-sm">New user registration</p>
              <p className="text-white/60 text-xs">2 minutes ago</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Database className="w-4 h-4 text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="text-white text-sm">Knowledge base updated</p>
              <p className="text-white/60 text-xs">15 minutes ago</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Shield className="w-4 h-4 text-purple-400" />
            </div>
            <div className="flex-1">
              <p className="text-white text-sm">Security scan completed</p>
              <p className="text-white/60 text-xs">1 hour ago</p>
            </div>
          </div>
        </div>
      </ModernCard>
    </div>
  );
};

export default AdminDashboard;