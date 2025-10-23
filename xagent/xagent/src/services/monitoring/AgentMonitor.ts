/**
 * Agent Monitoring & Observability
 * Tracks agent performance, errors, and usage metrics
 */

import { getSupabaseClient } from '../../config/supabase';

export interface AgentMetric {
  agent_id: string;
  agent_type: string;
  metric_type: 'success' | 'failure' | 'timeout' | 'fallback';
  action: string;
  duration_ms: number;
  confidence_score?: number;
  error_message?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface AgentPerformanceStats {
  agent_id: string;
  agent_type: string;
  total_actions: number;
  success_count: number;
  failure_count: number;
  timeout_count: number;
  fallback_count: number;
  success_rate: number;
  avg_duration_ms: number;
  avg_confidence: number;
  period_start: Date;
  period_end: Date;
}

export class AgentMonitor {
  private static instance: AgentMonitor;
  private supabase;
  private metricsBuffer: AgentMetric[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.supabase = getSupabaseClient();
    this.startFlushInterval();
  }

  public static getInstance(): AgentMonitor {
    if (!AgentMonitor.instance) {
      AgentMonitor.instance = new AgentMonitor();
    }
    return AgentMonitor.instance;
  }

  /**
   * Track agent action
   */
  async trackAction(
    agentId: string,
    agentType: string,
    action: string,
    result: {
      success: boolean;
      duration_ms: number;
      confidence?: number;
      error?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    const metric: AgentMetric = {
      agent_id: agentId,
      agent_type: agentType,
      metric_type: result.success ? 'success' : 'failure',
      action,
      duration_ms: result.duration_ms,
      confidence_score: result.confidence,
      error_message: result.error,
      metadata: result.metadata,
      timestamp: new Date(),
    };

    // Add to buffer (batch insert for performance)
    this.metricsBuffer.push(metric);

    // Also log to console
    const icon = result.success ? '✅' : '❌';
    const duration = result.duration_ms.toFixed(0);
    const confidence = result.confidence ? ` (${(result.confidence * 100).toFixed(0)}%)` : '';
    
    console.log(`${icon} [${agentType}] ${action} - ${duration}ms${confidence}`);

    // If buffer is large, flush immediately
    if (this.metricsBuffer.length >= 100) {
      await this.flushMetrics();
    }
  }

  /**
   * Track timeout
   */
  async trackTimeout(
    agentId: string,
    agentType: string,
    action: string,
    timeoutMs: number
  ): Promise<void> {
    const metric: AgentMetric = {
      agent_id: agentId,
      agent_type: agentType,
      metric_type: 'timeout',
      action,
      duration_ms: timeoutMs,
      error_message: `Timeout after ${timeoutMs}ms`,
      timestamp: new Date(),
    };

    this.metricsBuffer.push(metric);
    console.log(`⏱️ [${agentType}] ${action} - TIMEOUT after ${timeoutMs}ms`);
  }

  /**
   * Track fallback activation
   */
  async trackFallback(
    agentId: string,
    agentType: string,
    action: string,
    fallbackType: 'browser' | 'llm' | 'human',
    metadata?: Record<string, any>
  ): Promise<void> {
    const metric: AgentMetric = {
      agent_id: agentId,
      agent_type: agentType,
      metric_type: 'fallback',
      action,
      duration_ms: 0,
      metadata: { fallback_type: fallbackType, ...metadata },
      timestamp: new Date(),
    };

    this.metricsBuffer.push(metric);
    console.log(`🔄 [${agentType}] ${action} - Fallback to ${fallbackType}`);
  }

  /**
   * Flush metrics to database
   */
  private async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0) return;

    try {
      const metrics = [...this.metricsBuffer];
      this.metricsBuffer = [];

      const { error } = await this.supabase
        .from('agent_metrics')
        .insert(metrics);

      if (error) {
        console.error('Failed to flush metrics:', error);
        // Put metrics back in buffer
        this.metricsBuffer.unshift(...metrics);
      } else {
        console.log(`📊 Flushed ${metrics.length} metrics to database`);
      }
    } catch (error) {
      console.error('Error flushing metrics:', error);
    }
  }

  /**
   * Start periodic flush
   */
  private startFlushInterval(): void {
    // Flush every 30 seconds
    this.flushInterval = setInterval(() => {
      this.flushMetrics();
    }, 30000);
  }

  /**
   * Get performance stats for agent
   */
  async getPerformanceStats(
    agentId: string,
    periodHours: number = 24
  ): Promise<AgentPerformanceStats | null> {
    try {
      const periodStart = new Date(Date.now() - periodHours * 60 * 60 * 1000);

      const { data, error } = await this.supabase
        .from('agent_metrics')
        .select('*')
        .eq('agent_id', agentId)
        .gte('timestamp', periodStart.toISOString());

      if (error || !data || data.length === 0) {
        return null;
      }

      const totalActions = data.length;
      const successCount = data.filter(m => m.metric_type === 'success').length;
      const failureCount = data.filter(m => m.metric_type === 'failure').length;
      const timeoutCount = data.filter(m => m.metric_type === 'timeout').length;
      const fallbackCount = data.filter(m => m.metric_type === 'fallback').length;

      const successRate = (successCount / totalActions) * 100;

      const avgDuration = data.reduce((sum, m) => sum + (m.duration_ms || 0), 0) / totalActions;

      const metricsWithConfidence = data.filter(m => m.confidence_score != null);
      const avgConfidence = metricsWithConfidence.length > 0
        ? metricsWithConfidence.reduce((sum, m) => sum + m.confidence_score!, 0) / metricsWithConfidence.length
        : 0;

      return {
        agent_id: agentId,
        agent_type: data[0].agent_type,
        total_actions: totalActions,
        success_count: successCount,
        failure_count: failureCount,
        timeout_count: timeoutCount,
        fallback_count: fallbackCount,
        success_rate: successRate,
        avg_duration_ms: avgDuration,
        avg_confidence: avgConfidence,
        period_start: periodStart,
        period_end: new Date(),
      };
    } catch (error) {
      console.error('Error getting performance stats:', error);
      return null;
    }
  }

  /**
   * Get all agents' performance summary
   */
  async getAllAgentsPerformance(
    periodHours: number = 24
  ): Promise<AgentPerformanceStats[]> {
    try {
      const periodStart = new Date(Date.now() - periodHours * 60 * 60 * 1000);

      const { data, error } = await this.supabase
        .from('agent_metrics')
        .select('agent_id, agent_type')
        .gte('timestamp', periodStart.toISOString())
        .order('timestamp', { ascending: false });

      if (error || !data) {
        return [];
      }

      // Get unique agent IDs
      const uniqueAgentIds = [...new Set(data.map(m => m.agent_id))];

      // Get stats for each agent
      const statsPromises = uniqueAgentIds.map(agentId =>
        this.getPerformanceStats(agentId, periodHours)
      );

      const stats = await Promise.all(statsPromises);
      return stats.filter(s => s !== null) as AgentPerformanceStats[];
    } catch (error) {
      console.error('Error getting all agents performance:', error);
      return [];
    }
  }

  /**
   * Detect anomalies
   */
  async detectAnomalies(agentId: string): Promise<{
    hasAnomalies: boolean;
    issues: string[];
  }> {
    const stats = await this.getPerformanceStats(agentId, 1); // Last hour

    if (!stats) {
      return { hasAnomalies: false, issues: [] };
    }

    const issues: string[] = [];

    // Check success rate
    if (stats.success_rate < 70) {
      issues.push(`Low success rate: ${stats.success_rate.toFixed(1)}% (expected >70%)`);
    }

    // Check timeout rate
    const timeoutRate = (stats.timeout_count / stats.total_actions) * 100;
    if (timeoutRate > 10) {
      issues.push(`High timeout rate: ${timeoutRate.toFixed(1)}% (expected <10%)`);
    }

    // Check average duration
    if (stats.avg_duration_ms > 10000) {
      issues.push(`Slow responses: ${stats.avg_duration_ms.toFixed(0)}ms avg (expected <10s)`);
    }

    // Check confidence scores
    if (stats.avg_confidence < 0.7) {
      issues.push(`Low confidence: ${(stats.avg_confidence * 100).toFixed(0)}% (expected >70%)`);
    }

    return {
      hasAnomalies: issues.length > 0,
      issues,
    };
  }

  /**
   * Cleanup on shutdown
   */
  async shutdown(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    await this.flushMetrics(); // Final flush
    console.log('📊 AgentMonitor shutdown complete');
  }
}

// Export singleton instance
export const agentMonitor = AgentMonitor.getInstance();


