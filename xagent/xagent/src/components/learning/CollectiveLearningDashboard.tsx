/**
 * Collective Learning Dashboard
 * Visualizes how agents are learning and sharing knowledge
 */

import React, { useState, useEffect } from 'react';
import { Brain, TrendingUp, Users, Award, Activity, BookOpen } from 'lucide-react';
import { CollectiveLearning } from '../../services/learning/CollectiveLearning';

export const CollectiveLearningDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [recentLearnings, setRecentLearnings] = useState<any[]>([]);
  const [topLearnings, setTopLearnings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLearningData();
  }, []);

  const loadLearningData = async () => {
    try {
      setLoading(true);
      const collectiveLearning = CollectiveLearning.getInstance();
      
      const systemStats = await collectiveLearning.getSystemStats();
      
      setStats(systemStats);
      setRecentLearnings(systemStats.recent_learnings.slice(0, 10));
      setTopLearnings(systemStats.most_used_learnings.slice(0, 10));
      
    } catch (error) {
      console.error('Failed to load learning data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Brain className="w-8 h-8" />
          Collective Learning System
        </h1>
        <p className="text-purple-100">
          Watch your agents learn from each interaction and share knowledge across the network
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Learnings</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.total_learnings || 0}</p>
            </div>
            <BookOpen className="w-12 h-12 text-blue-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Avg Success Rate</p>
              <p className="text-3xl font-bold text-green-600">
                {((stats?.avg_success_rate || 0) * 100).toFixed(0)}%
              </p>
            </div>
            <TrendingUp className="w-12 h-12 text-green-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Contributing Agents</p>
              <p className="text-3xl font-bold text-purple-600">
                {Object.keys(stats?.learnings_by_agent_type || {}).length}
              </p>
            </div>
            <Users className="w-12 h-12 text-purple-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Most Used</p>
              <p className="text-3xl font-bold text-orange-600">
                {stats?.most_used_learnings?.[0]?.usage_count || 0}x
              </p>
            </div>
            <Award className="w-12 h-12 text-orange-500 opacity-20" />
          </div>
        </div>
      </div>

      {/* Learnings by Type */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          Learnings by Type
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(stats?.learnings_by_type || {}).map(([type, count]) => (
            <div key={type} className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{count as number}</p>
              <p className="text-sm text-gray-500 capitalize">{type.replace('_', ' ')}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Learnings by Agent Type */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-600" />
          Learnings by Agent Type
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(stats?.learnings_by_agent_type || {}).map(([type, count]) => (
            <div key={type} className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border border-purple-200">
              <p className="text-2xl font-bold text-purple-900">{count as number}</p>
              <p className="text-sm text-purple-600 capitalize">{type}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Most Used Learnings */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-orange-600" />
          Most Applied Learnings
        </h2>
        
        <div className="space-y-3">
          {topLearnings.map((learning, index) => (
            <div 
              key={learning.id}
              className="p-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg border border-orange-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg font-bold text-orange-600">#{index + 1}</span>
                    <span className="text-sm px-2 py-1 bg-orange-200 text-orange-800 rounded">
                      {learning.domain}
                    </span>
                    <span className="text-sm px-2 py-1 bg-green-200 text-green-800 rounded">
                      {(learning.success_rate * 100).toFixed(0)}% success
                    </span>
                  </div>
                  
                  <p className="font-medium text-gray-900">{learning.pattern_description}</p>
                  
                  <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                    <span>From: <strong>{learning.agent_name}</strong></span>
                    <span>Used: <strong>{learning.usage_count} times</strong></span>
                    <span>Applicable to: <strong>{learning.applicable_to.join(', ')}</strong></span>
                  </div>
                  
                  {learning.solution && (
                    <p className="mt-2 text-sm text-gray-700 italic">
                      💡 Solution: {learning.solution}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Learnings */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-600" />
          Recent Learnings
        </h2>
        
        <div className="space-y-3">
          {recentLearnings.map((learning) => (
            <div 
              key={learning.id}
              className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-sm px-2 py-1 rounded ${
                      learning.learning_type === 'success_pattern' 
                        ? 'bg-green-200 text-green-800'
                        : learning.learning_type === 'failure_pattern'
                        ? 'bg-red-200 text-red-800'
                        : learning.learning_type === 'optimization'
                        ? 'bg-blue-200 text-blue-800'
                        : 'bg-purple-200 text-purple-800'
                    }`}>
                      {learning.learning_type.replace('_', ' ')}
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(learning.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <p className="font-medium text-gray-900">{learning.pattern_description}</p>
                  
                  <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                    <span>By: <strong>{learning.agent_name}</strong></span>
                    <span>Domain: <strong>{learning.domain}</strong></span>
                    <span>Confidence: <strong>{(learning.confidence * 100).toFixed(0)}%</strong></span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">🌟 How Collective Learning Works</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• <strong>Every interaction</strong> is analyzed for learnable patterns</li>
          <li>• <strong>Successful approaches</strong> are shared with all agents</li>
          <li>• <strong>Failed attempts</strong> are recorded to avoid repetition</li>
          <li>• <strong>New agents</strong> start with collective wisdom (not from zero!)</li>
          <li>• <strong>Cross-agent learning</strong> enables HR Agent to learn from Sales Agent's experiences</li>
          <li>• <strong>System intelligence</strong> grows continuously as a distributed network</li>
        </ul>
      </div>
    </div>
  );
};


