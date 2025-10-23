/**
 * Autonomous Agent Control Panel
 * UI for starting, stopping, and monitoring autonomous agents
 */

import React, { useState, useEffect } from 'react';
import { Play, Square, Activity, CheckCircle, XCircle, Calendar, Target } from 'lucide-react';
import { autonomousSystem } from '../../services/initialization/AutonomousSystemInitializer';

interface AgentStatus {
  type: 'customer-support' | 'productivity' | 'email';
  name: string;
  running: boolean;
  scheduleId?: string;
  lastRun?: Date;
  runCount: number;
  intervalMinutes: number;
}

export const AutonomousAgentControlPanel: React.FC = () => {
  const [agents, setAgents] = useState<AgentStatus[]>([
    {
      type: 'customer-support',
      name: 'Customer Support AI Teller',
      running: false,
      runCount: 0,
      intervalMinutes: 30
    },
    {
      type: 'productivity',
      name: 'Productivity AI Agent',
      running: false,
      runCount: 0,
      intervalMinutes: 30
    },
    {
      type: 'email',
      name: 'Email AI Agent',
      running: false,
      runCount: 0,
      intervalMinutes: 30
    }
  ]);

  const [systemStatus, setSystemStatus] = useState({
    initialized: false,
    activeSchedules: 0,
    eventBusActive: false,
    goalManagerActive: false
  });

  useEffect(() => {
    // Initialize system on mount
    initializeSystem();
  }, []);

  const initializeSystem = async () => {
    try {
      await autonomousSystem.initialize();
      updateSystemStatus();
    } catch (error) {
      console.error('Failed to initialize autonomous system:', error);
    }
  };

  const updateSystemStatus = () => {
    const status = autonomousSystem.getSystemStatus();
    setSystemStatus(status);
  };

  const startAgent = async (agentType: AgentStatus['type']) => {
    try {
      const agent = agents.find(a => a.type === agentType);
      if (!agent) return;

      const scheduleId = await autonomousSystem.startAutonomousAgent(
        agentType,
        agentType === 'productivity' ? 'current-user' : undefined,
        { interval_ms: agent.intervalMinutes * 60 * 1000 }
      );

      setAgents(agents.map(a => 
        a.type === agentType 
          ? { ...a, running: true, scheduleId }
          : a
      ));

      updateSystemStatus();
      
    } catch (error) {
      console.error(`Failed to start agent:`, error);
      alert(`Failed to start agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const stopAgent = async (agentType: AgentStatus['type']) => {
    try {
      const agent = agents.find(a => a.type === agentType);
      if (!agent || !agent.scheduleId) return;

      await autonomousSystem.stopAutonomousAgent(agent.scheduleId);

      setAgents(agents.map(a => 
        a.type === agentType 
          ? { ...a, running: false, scheduleId: undefined }
          : a
      ));

      updateSystemStatus();
      
    } catch (error) {
      console.error(`Failed to stop agent:`, error);
    }
  };

  const updateInterval = (agentType: AgentStatus['type'], minutes: number) => {
    setAgents(agents.map(a => 
      a.type === agentType 
        ? { ...a, intervalMinutes: minutes }
        : a
    ));
  };

  const testEvent = async () => {
    try {
      await autonomousSystem.emitEvent({
        type: 'ticket.created',
        source: 'test_ui',
        data: {
          ticket: {
            id: `test-${Date.now()}`,
            subject: 'Test Ticket',
            message: 'This is a test ticket from the UI',
            priority: 'medium'
          }
        },
        priority: 'medium'
      });

      alert('Test event emitted! Check console for agent reactions.');
      
    } catch (error) {
      console.error('Failed to emit test event:', error);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">🤖 Autonomous Agent Control Panel</h1>
        <p className="text-blue-100">Manage and monitor your 24/7 autonomous AI agents</p>
      </div>

      {/* System Status */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          System Status
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            {systemStatus.initialized ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
            <span className="text-sm">
              {systemStatus.initialized ? 'Initialized' : 'Not Initialized'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            <span className="text-sm">
              {systemStatus.activeSchedules} Active Schedules
            </span>
          </div>

          <div className="flex items-center gap-2">
            {systemStatus.eventBusActive ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
            <span className="text-sm">Event Bus</span>
          </div>

          <div className="flex items-center gap-2">
            {systemStatus.goalManagerActive ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
            <span className="text-sm">Goal Manager</span>
          </div>
        </div>
      </div>

      {/* Agents */}
      <div className="space-y-4">
        {agents.map((agent) => (
          <div key={agent.type} className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  agent.running ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
                }`} />
                <h3 className="text-lg font-semibold">{agent.name}</h3>
              </div>

              <div className="flex items-center gap-2">
                {!agent.running ? (
                  <button
                    onClick={() => startAgent(agent.type)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    <Play className="w-4 h-4" />
                    Start
                  </button>
                ) : (
                  <button
                    onClick={() => stopAgent(agent.type)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                  >
                    <Square className="w-4 h-4" />
                    Stop
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <label className="text-gray-500">Status</label>
                <p className="font-medium">
                  {agent.running ? '🟢 Running' : '⚫ Stopped'}
                </p>
              </div>

              <div>
                <label className="text-gray-500">Run Interval</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={agent.intervalMinutes}
                    onChange={(e) => updateInterval(agent.type, parseInt(e.target.value))}
                    disabled={agent.running}
                    className="w-20 px-2 py-1 border rounded"
                  />
                  <span>minutes</span>
                </div>
              </div>

              <div>
                <label className="text-gray-500">Total Runs</label>
                <p className="font-medium">{agent.runCount}</p>
              </div>
            </div>

            {agent.lastRun && (
              <div className="mt-2 text-sm text-gray-500">
                Last run: {agent.lastRun.toLocaleString()}
              </div>
            )}

            {agent.scheduleId && (
              <div className="mt-2 text-xs text-gray-400">
                Schedule ID: {agent.scheduleId}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Test Controls */}
      <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-600" />
          Testing & Monitoring
        </h2>
        
        <div className="space-y-3">
          <button
            onClick={testEvent}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            📢 Emit Test Event
          </button>

          <p className="text-sm text-gray-600">
            Emits a test ticket event to trigger the Customer Support Agent
          </p>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
        <h3 className="font-semibold mb-2">💡 How It Works</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>• <strong>Start</strong> an agent to run it autonomously in the background</li>
          <li>• Agents run at the specified interval (default: every 30 minutes)</li>
          <li>• Agents also react to events in real-time</li>
          <li>• Agents track long-term goals and work toward them proactively</li>
          <li>• Check the browser console to see agent activity</li>
        </ul>
      </div>
    </div>
  );
};


