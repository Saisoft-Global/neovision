/**
 * Modern Dashboard with Quick Actions and Stats
 */
import { MessageSquare, Users, Brain, Zap, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { ModernCard } from '../ui/ModernCard';
import { QuickActions } from '../ui/QuickActions';
import { StatusBadge } from '../ui/StatusBadge';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../utils/cn';

export const ModernDashboard = () => {
  const navigate = useNavigate();

  const stats = [
    {
      label: 'Active Agents',
      value: '12',
      change: '+3',
      icon: Users,
      color: 'from-indigo-500 to-purple-500'
    },
    {
      label: 'Messages Today',
      value: '248',
      change: '+12%',
      icon: MessageSquare,
      color: 'from-purple-500 to-pink-500'
    },
    {
      label: 'Knowledge Items',
      value: '1,234',
      change: '+45',
      icon: Brain,
      color: 'from-blue-500 to-indigo-500'
    },
    {
      label: 'Workflows Active',
      value: '8',
      change: '+2',
      icon: Zap,
      color: 'from-pink-500 to-rose-500'
    }
  ];

  const quickActions = [
    {
      icon: MessageSquare,
      label: 'New Chat',
      description: 'Start a conversation with AI',
      onClick: () => navigate('/')
    },
    {
      icon: Brain,
      label: 'Knowledge Base',
      description: 'Search and manage knowledge',
      onClick: () => navigate('/knowledge')
    },
    {
      icon: Users,
      label: 'Manage Agents',
      description: 'Configure AI agents',
      onClick: () => navigate('/agents')
    },
    {
      icon: Zap,
      label: 'Create Workflow',
      description: 'Automate your tasks',
      onClick: () => navigate('/workflows')
    }
  ];

  const recentActivity = [
    { action: 'Chat completed', agent: 'Technical Agent', time: '2 min ago', status: 'success' },
    { action: 'Document processed', agent: 'Knowledge Agent', time: '5 min ago', status: 'success' },
    { action: 'Workflow executed', agent: 'Automation Agent', time: '10 min ago', status: 'success' },
    { action: 'Email analyzed', agent: 'Productivity Agent', time: '15 min ago', status: 'success' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Welcome Back! 👋
          </h1>
          <p className="text-white/60 text-sm md:text-base">
            Your AI agents are ready to assist you
          </p>
        </div>
        <StatusBadge status="online" label="All Systems Operational" pulse />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <ModernCard key={idx} variant="glass" hover className="relative overflow-hidden">
              {/* Background gradient */}
              <div className={cn(
                'absolute top-0 right-0 w-24 h-24 opacity-20 blur-2xl',
                `bg-gradient-to-br ${stat.color}`
              )} />
              
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className={cn(
                    'p-2 rounded-xl bg-gradient-to-br',
                    stat.color
                  )}>
                    <Icon className="w-4 h-4 md:w-5 md:h-5 text-white" />
                  </div>
                  <span className="text-xs font-medium text-green-400">
                    {stat.change}
                  </span>
                </div>
                <div className="text-2xl md:text-3xl font-bold text-white mb-1">
                  {stat.value}
                </div>
                <div className="text-xs md:text-sm text-white/60">
                  {stat.label}
                </div>
              </div>
            </ModernCard>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-white mb-4">Quick Actions</h2>
        <QuickActions actions={quickActions} columns={4} />
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-white mb-4">Recent Activity</h2>
        <ModernCard variant="glass">
          <div className="space-y-3">
            {recentActivity.map((activity, idx) => (
              <div
                key={idx}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/10 transition-colors"
              >
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {activity.action}
                  </p>
                  <p className="text-xs text-white/60 truncate">
                    {activity.agent}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-white/60 flex-shrink-0">
                  <Clock className="w-4 h-4" />
                  {activity.time}
                </div>
              </div>
            ))}
          </div>
        </ModernCard>
      </div>
    </div>
  );
};
