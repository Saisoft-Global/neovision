/**
 * Agent Testing Dashboard
 * Real-time monitoring of agent accuracy, performance, and health
 */

import React, { useState, useEffect } from 'react';
import { Activity, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock, Zap } from 'lucide-react';
import { agentMonitor, type AgentPerformanceStats } from '../services/monitoring/AgentMonitor';

export const AgentTestingDashboard: React.FC = () => {
  const [stats, setStats] = useState<AgentPerformanceStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<1 | 24 | 168>(24); // hours

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [selectedPeriod]);

  const loadStats = async () => {
    setLoading(true);
    const data = await agentMonitor.getAllAgentsPerformance(selectedPeriod);
    setStats(data);
    setLoading(false);
  };

  const getHealthStatus = (successRate: number): {
    label: string;
    color: string;
    icon: React.ReactNode;
  } => {
    if (successRate >= 95) {
      return {
        label: 'Excellent',
        color: 'text-green-600 bg-green-50 border-green-200',
        icon: <CheckCircle className="w-5 h-5" />,
      };
    } else if (successRate >= 80) {
      return {
        label: 'Good',
        color: 'text-blue-600 bg-blue-50 border-blue-200',
        icon: <TrendingUp className="w-5 h-5" />,
      };
    } else if (successRate >= 70) {
      return {
        label: 'Fair',
        color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
        icon: <AlertTriangle className="w-5 h-5" />,
      };
    } else {
      return {
        label: 'Poor',
        color: 'text-red-600 bg-red-50 border-red-200',
        icon: <TrendingDown className="w-5 h-5" />,
      };
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Agent Testing Dashboard</h1>
          <p className="text-gray-600">Real-time monitoring of AI agent performance and accuracy</p>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setSelectedPeriod(1)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedPeriod === 1
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Last Hour
          </button>
          <button
            onClick={() => setSelectedPeriod(24)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedPeriod === 24
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Last 24 Hours
          </button>
          <button
            onClick={() => setSelectedPeriod(168)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedPeriod === 168
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Last 7 Days
          </button>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-600">Total Actions</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {stats.reduce((sum, s) => sum + s.total_actions, 0).toLocaleString()}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-gray-600">Avg Success Rate</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {stats.length > 0
                ? (stats.reduce((sum, s) => sum + s.success_rate, 0) / stats.length).toFixed(1)
                : 0}%
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-gray-600">Avg Response Time</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {stats.length > 0
                ? Math.round(stats.reduce((sum, s) => sum + s.avg_duration_ms, 0) / stats.length)
                : 0}ms
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center gap-3 mb-2">
              <Zap className="w-5 h-5 text-yellow-600" />
              <span className="text-sm font-medium text-gray-600">Active Agents</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {stats.length}
            </div>
          </div>
        </div>

        {/* Agent Performance Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Agent Performance</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : stats.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No agent activity in selected period</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Agent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Success Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Confidence
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Failures
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.map((agent) => {
                  const health = getHealthStatus(agent.success_rate);
                  return (
                    <tr key={agent.agent_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {agent.agent_type.replace('_', ' ').toUpperCase()}
                        </div>
                        <div className="text-sm text-gray-500 font-mono">{agent.agent_id.slice(0, 8)}...</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${health.color}`}
                        >
                          {health.icon}
                          {health.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {agent.total_actions.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 w-20">
                            <div
                              className={`h-2 rounded-full ${
                                agent.success_rate >= 90
                                  ? 'bg-green-500'
                                  : agent.success_rate >= 70
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${agent.success_rate}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {agent.success_rate.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {Math.round(agent.avg_duration_ms)}ms
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(agent.avg_confidence * 100).toFixed(0)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="text-red-600 font-medium">{agent.failure_count} errors</div>
                          <div className="text-gray-500">{agent.timeout_count} timeouts</div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};


