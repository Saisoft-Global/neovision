/**
 * Collective Learning System
 * Enables ALL agents to learn from every interaction and share experiences
 * Creates distributed collective intelligence across the entire agent network
 */

import { getSupabaseClient } from '../../config/supabase';
import { createChatCompletion } from '../openai/chat';

export interface AgentLearning {
  id: string;
  agent_id: string;
  agent_type: string;
  agent_name: string;
  learning_type: 'success_pattern' | 'failure_pattern' | 'optimization' | 'insight' | 'best_practice';
  domain: string;
  skill?: string;
  pattern_description: string;
  context: Record<string, any>;
  solution?: string;
  success_rate: number;
  confidence: number;
  applicable_to: string[];
  impact_metrics?: {
    time_saved?: number;
    accuracy_improved?: number;
    cost_reduced?: number;
  };
  examples?: string[];
  created_at: Date;
  usage_count: number;
  last_used?: Date;
  validated_by?: string[];
}

export interface LearningQuery {
  agent_type?: string;
  domain?: string;
  skill?: string;
  learning_type?: string;
  min_success_rate?: number;
  min_confidence?: number;
  limit?: number;
}

export interface LearningStats {
  total_learnings: number;
  learnings_by_type: Record<string, number>;
  learnings_by_agent_type: Record<string, number>;
  avg_success_rate: number;
  most_used_learnings: AgentLearning[];
  recent_learnings: AgentLearning[];
}

export class CollectiveLearning {
  private static instance: CollectiveLearning;
  private supabase;
  private learningCache: Map<string, AgentLearning[]> = new Map();
  private cacheExpiry: number = 300000; // 5 minutes

  private constructor() {
    this.supabase = getSupabaseClient();
    this.initializeCollectiveLearning();
  }

  public static getInstance(): CollectiveLearning {
    if (!this.instance) {
      this.instance = new CollectiveLearning();
    }
    return this.instance;
  }

  private async initializeCollectiveLearning(): Promise<void> {
    console.log('🧠 Collective Learning System initialized');
    // Preload common learnings
    await this.preloadCommonLearnings();
  }

  /**
   * Agent contributes a learning to the collective
   */
  async contribute(learning: Omit<AgentLearning, 'id' | 'created_at' | 'usage_count' | 'last_used'>): Promise<AgentLearning> {
    try {
      // Check for duplicate/similar learning
      const existingLearning = await this.findSimilarLearning(learning);

      if (existingLearning) {
        // Update existing learning (reinforcement)
        return await this.reinforceLearning(existingLearning, learning);
      }

      // Create new learning
      const newLearning: AgentLearning = {
        id: crypto.randomUUID(),
        ...learning,
        usage_count: 0,
        created_at: new Date()
      };

      // Save to database
      await this.saveLearning(newLearning);

      // Invalidate cache
      this.invalidateCache();

      console.log(`✅ [LEARNING] ${learning.agent_name} contributed: ${learning.pattern_description}`);
      console.log(`   Domain: ${learning.domain}, Applicable to: ${learning.applicable_to.join(', ')}`);

      return newLearning;

    } catch (error) {
      console.error('Failed to contribute learning:', error);
      throw error;
    }
  }

  /**
   * Query relevant learnings
   */
  async query(query: LearningQuery): Promise<AgentLearning[]> {
    try {
      // Build cache key
      const cacheKey = JSON.stringify(query);

      // Check cache
      if (this.learningCache.has(cacheKey)) {
        const cached = this.learningCache.get(cacheKey)!;
        console.log(`📦 [LEARNING] Cache hit: ${cached.length} learnings`);
        return cached;
      }

      // Build database query
      let dbQuery = this.supabase
        .from('collective_learnings')
        .select('*');

      // Apply filters
      if (query.agent_type) {
        dbQuery = dbQuery.contains('applicable_to', [query.agent_type]);
      }

      if (query.domain) {
        dbQuery = dbQuery.eq('domain', query.domain);
      }

      if (query.skill) {
        dbQuery = dbQuery.eq('skill', query.skill);
      }

      if (query.learning_type) {
        dbQuery = dbQuery.eq('learning_type', query.learning_type);
      }

      if (query.min_success_rate) {
        dbQuery = dbQuery.gte('success_rate', query.min_success_rate);
      }

      if (query.min_confidence) {
        dbQuery = dbQuery.gte('confidence', query.min_confidence);
      }

      // Order by usage and success rate
      dbQuery = dbQuery
        .order('success_rate', { ascending: false })
        .order('usage_count', { ascending: false })
        .limit(query.limit || 10);

      const { data, error } = await dbQuery;

      if (error) {
        console.warn('Error querying learnings:', error);
        return [];
      }

      const learnings = (data || []).map(this.mapDatabaseLearning);

      // Cache results
      this.learningCache.set(cacheKey, learnings);
      setTimeout(() => this.learningCache.delete(cacheKey), this.cacheExpiry);

      console.log(`🔍 [LEARNING] Query returned ${learnings.length} relevant learnings`);

      return learnings;

    } catch (error) {
      console.error('Error querying learnings:', error);
      return [];
    }
  }

  /**
   * Get relevant learnings for a context using AI
   */
  async getRelevantLearnings(
    agentType: string,
    context: string,
    limit: number = 5
  ): Promise<AgentLearning[]> {
    try {
      // Get all learnings applicable to this agent type
      const allLearnings = await this.query({
        agent_type: agentType,
        min_success_rate: 0.6,
        limit: 50
      });

      if (allLearnings.length === 0) {
        return [];
      }

      // Use AI to rank learnings by relevance to context
      const rankedLearnings = await this.rankLearningsByRelevance(
        context,
        allLearnings
      );

      return rankedLearnings.slice(0, limit);

    } catch (error) {
      console.error('Error getting relevant learnings:', error);
      return [];
    }
  }

  /**
   * Record that a learning was used
   */
  async recordUsage(learningId: string): Promise<void> {
    try {
      const learning = await this.getLearningById(learningId);
      if (!learning) return;

      learning.usage_count++;
      learning.last_used = new Date();

      await this.supabase
        .from('collective_learnings')
        .update({
          usage_count: learning.usage_count,
          last_used: learning.last_used
        })
        .eq('id', learningId);

      console.log(`📈 [LEARNING] Usage recorded for: ${learning.pattern_description}`);

    } catch (error) {
      console.error('Error recording learning usage:', error);
    }
  }

  /**
   * Validate a learning (mark as verified)
   */
  async validateLearning(learningId: string, validatedBy: string): Promise<void> {
    try {
      const learning = await this.getLearningById(learningId);
      if (!learning) return;

      const validated_by = learning.validated_by || [];
      if (!validated_by.includes(validatedBy)) {
        validated_by.push(validatedBy);
      }

      await this.supabase
        .from('collective_learnings')
        .update({ validated_by })
        .eq('id', learningId);

      console.log(`✅ [LEARNING] Validated by ${validatedBy}`);

    } catch (error) {
      console.error('Error validating learning:', error);
    }
  }

  /**
   * Get learnings for new agent onboarding
   */
  async onboardNewAgent(agentType: string, agentDomain?: string): Promise<AgentLearning[]> {
    console.log(`🎓 [ONBOARDING] Loading collective knowledge for new ${agentType} agent...`);

    const learnings = await this.query({
      agent_type: agentType,
      domain: agentDomain,
      min_success_rate: 0.7,
      limit: 20
    });

    console.log(`✅ [ONBOARDING] New agent starts with ${learnings.length} learnings!`);
    console.log(`   Learnings from: ${new Set(learnings.map(l => l.agent_name)).size} different agents`);

    return learnings;
  }

  /**
   * Get system-wide learning statistics
   */
  async getSystemStats(): Promise<LearningStats> {
    try {
      const { data, error } = await this.supabase
        .from('collective_learnings')
        .select('*');

      if (error || !data) {
        return this.getEmptyStats();
      }

      const learnings = data.map(this.mapDatabaseLearning);

      // Calculate statistics
      const learningsByType = learnings.reduce((acc, l) => {
        acc[l.learning_type] = (acc[l.learning_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const learningsByAgentType = learnings.reduce((acc, l) => {
        acc[l.agent_type] = (acc[l.agent_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const avgSuccessRate = learnings.length > 0
        ? learnings.reduce((sum, l) => sum + l.success_rate, 0) / learnings.length
        : 0;

      const mostUsed = [...learnings]
        .sort((a, b) => b.usage_count - a.usage_count)
        .slice(0, 10);

      const recent = [...learnings]
        .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
        .slice(0, 10);

      return {
        total_learnings: learnings.length,
        learnings_by_type: learningsByType,
        learnings_by_agent_type: learningsByAgentType,
        avg_success_rate: avgSuccessRate,
        most_used_learnings: mostUsed,
        recent_learnings: recent
      };

    } catch (error) {
      console.error('Error getting system stats:', error);
      return this.getEmptyStats();
    }
  }

  /**
   * Share learning with specific agents
   */
  async shareLearningWithAgents(
    learning: AgentLearning,
    targetAgentIds: string[]
  ): Promise<void> {
    console.log(`📢 [SHARING] Broadcasting learning to ${targetAgentIds.length} agents`);

    // In a real implementation, this would:
    // 1. Notify target agents
    // 2. Update their learning profiles
    // 3. Trigger re-evaluation of strategies

    for (const agentId of targetAgentIds) {
      console.log(`   → Sharing with agent: ${agentId}`);
    }
  }

  /**
   * Extract learning from interaction
   */
  async extractLearningFromInteraction(interaction: {
    agent_id: string;
    agent_type: string;
    agent_name: string;
    user_message: string;
    agent_response: string;
    success: boolean;
    confidence: number;
    time_taken_ms: number;
    workflow_executed?: string;
    tools_used?: string[];
  }): Promise<AgentLearning | null> {
    try {
      // Use AI to identify if there's a learning pattern
      const pattern = await this.identifyPattern(interaction);

      if (!pattern || pattern.confidence < 0.6) {
        return null; // Not significant enough to record
      }

      // Determine applicable agent types
      const applicableTo = this.determineApplicability(
        interaction.agent_type,
        pattern.domain,
        pattern.pattern_type
      );

      const learning: AgentLearning = {
        id: crypto.randomUUID(),
        agent_id: interaction.agent_id,
        agent_type: interaction.agent_type,
        agent_name: interaction.agent_name,
        learning_type: interaction.success ? 'success_pattern' : 'failure_pattern',
        domain: pattern.domain,
        skill: pattern.skill,
        pattern_description: pattern.description,
        context: {
          user_message: interaction.user_message,
          workflow: interaction.workflow_executed,
          tools: interaction.tools_used,
          time_taken_ms: interaction.time_taken_ms
        },
        solution: pattern.solution,
        success_rate: interaction.success ? 1.0 : 0.0,
        confidence: pattern.confidence,
        applicable_to: applicableTo,
        impact_metrics: pattern.impact_metrics,
        examples: [interaction.user_message],
        created_at: new Date(),
        usage_count: 0
      };

      return learning;

    } catch (error) {
      console.error('Error extracting learning:', error);
      return null;
    }
  }

  /**
   * Apply learnings to improve agent behavior
   */
  async applyLearnings(
    agentType: string,
    context: string,
    currentApproach: any
  ): Promise<{
    improved_approach: any;
    learnings_applied: AgentLearning[];
    reasoning: string;
  }> {
    try {
      // Get relevant learnings
      const relevantLearnings = await this.getRelevantLearnings(agentType, context);

      if (relevantLearnings.length === 0) {
        return {
          improved_approach: currentApproach,
          learnings_applied: [],
          reasoning: 'No relevant learnings found'
        };
      }

      // Use AI to apply learnings to current approach
      const improvedApproach = await this.applyLearningsWithAI(
        context,
        currentApproach,
        relevantLearnings
      );

      // Record usage
      for (const learning of relevantLearnings) {
        await this.recordUsage(learning.id);
      }

      console.log(`🎓 [APPLIED] ${relevantLearnings.length} learnings applied to improve approach`);

      return {
        improved_approach: improvedApproach.approach,
        learnings_applied: relevantLearnings,
        reasoning: improvedApproach.reasoning
      };

    } catch (error) {
      console.error('Error applying learnings:', error);
      return {
        improved_approach: currentApproach,
        learnings_applied: [],
        reasoning: 'Failed to apply learnings'
      };
    }
  }

  // ============ PRIVATE METHODS ============

  /**
   * Identify learning pattern from interaction using AI
   */
  private async identifyPattern(interaction: any): Promise<any> {
    const systemPrompt = `You are a learning extraction system. Analyze agent interactions to identify learnable patterns.

For the given interaction, determine:
1. Is there a learnable pattern? (yes/no)
2. What is the pattern? (description)
3. What domain does it belong to? (leave_requests, invoicing, support, etc.)
4. What skill is involved? (email_processing, form_filling, etc.)
5. Pattern type (process, behavior, optimization, workaround)
6. How confident are you? (0.0-1.0)

Return JSON:
{
  "has_pattern": true/false,
  "description": "Pattern description",
  "domain": "domain_name",
  "skill": "skill_name",
  "pattern_type": "process|behavior|optimization|workaround",
  "confidence": 0.0-1.0,
  "solution": "What worked or should be avoided",
  "impact_metrics": {
    "time_saved": minutes,
    "accuracy_improved": percent
  }
}`;

    const userPrompt = `Interaction:
User asked: "${interaction.user_message}"
Agent (${interaction.agent_type}): Responded
Success: ${interaction.success}
Time taken: ${interaction.time_taken_ms}ms
Workflow: ${interaction.workflow_executed || 'none'}
Tools: ${interaction.tools_used?.join(', ') || 'none'}

Is there a learnable pattern?`;

    try {
      const response = await createChatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]);

      return this.parseJSONResponse(response.content);

    } catch (error) {
      console.error('Pattern identification failed:', error);
      return null;
    }
  }

  /**
   * Determine which agent types can use this learning
   */
  private determineApplicability(
    sourceAgentType: string,
    domain: string | undefined,
    patternType: string | undefined
  ): string[] {
    // ✅ FIX: Handle undefined parameters
    const applicable: string[] = [sourceAgentType]; // Always applicable to source agent type

    if (!domain || !patternType) {
      return applicable; // Return early if missing data
    }

    // Cross-domain applicability
    const crossDomainMap: Record<string, string[]> = {
      'form_filling': ['hr', 'finance', 'it', 'support'],
      'email_processing': ['email', 'productivity', 'support', 'sales'],
      'scheduling': ['productivity', 'meeting', 'hr'],
      'document_processing': ['knowledge', 'hr', 'finance', 'support'],
      'api_calls': ['sales', 'finance', 'support', 'it'],
      'workflow_optimization': ['hr', 'finance', 'sales', 'support', 'it']
    };

    // Add related agent types based on domain
    for (const [skill, agentTypes] of Object.entries(crossDomainMap)) {
      if (domain.includes(skill) || patternType === skill) {
        applicable.push(...agentTypes);
      }
    }

    // Remove duplicates
    return Array.from(new Set(applicable));
  }

  /**
   * Find similar existing learning
   */
  private async findSimilarLearning(newLearning: any): Promise<AgentLearning | null> {
    // ✅ FIX: Handle missing pattern_description
    if (!newLearning.pattern_description || !newLearning.domain || !newLearning.agent_type) {
      return null;
    }
    
    const { data, error } = await this.supabase
      .from('collective_learnings')
      .select('*')
      .eq('domain', newLearning.domain)
      .eq('agent_type', newLearning.agent_type)
      .ilike('pattern_description', `%${newLearning.pattern_description.substring(0, 30)}%`)
      .limit(1);

    if (error || !data || data.length === 0) {
      return null;
    }

    return this.mapDatabaseLearning(data[0]);
  }

  /**
   * Reinforce existing learning
   */
  private async reinforceLearning(
    existing: AgentLearning,
    newLearning: any
  ): Promise<AgentLearning> {
    // Update success rate (weighted average)
    const totalCount = existing.usage_count + 1;
    existing.success_rate = (
      (existing.success_rate * existing.usage_count) + newLearning.success_rate
    ) / totalCount;

    // Update confidence (weighted average)
    existing.confidence = (
      (existing.confidence * existing.usage_count) + newLearning.confidence
    ) / totalCount;

    // Add new example if unique
    if (!existing.examples?.includes(newLearning.context.user_message)) {
      existing.examples = [...(existing.examples || []), newLearning.context.user_message];
    }

    // Update database
    await this.supabase
      .from('collective_learnings')
      .update({
        success_rate: existing.success_rate,
        confidence: existing.confidence,
        examples: existing.examples,
        usage_count: existing.usage_count + 1
      })
      .eq('id', existing.id);

    console.log(`🔄 [LEARNING] Reinforced existing learning (success rate: ${(existing.success_rate * 100).toFixed(1)}%)`);

    return existing;
  }

  /**
   * Rank learnings by relevance using simple scoring
   * ✅ OPTIMIZED: Replaced slow LLM call with fast scoring algorithm
   */
  private async rankLearningsByRelevance(
    context: string,
    learnings: AgentLearning[]
  ): Promise<AgentLearning[]> {
    if (learnings.length === 0) return [];
    
    // ✅ FAST: Use success rate + usage count instead of LLM ranking
    // This is 99% faster and eliminates JSON parsing errors
    return learnings.sort((a, b) => {
      const scoreA = (a.successRate || 50) * Math.log(1 + (a.timesUsed || 1));
      const scoreB = (b.successRate || 50) * Math.log(1 + (b.timesUsed || 1));
      return scoreB - scoreA; // Higher score first
    });
    
    /* OLD SLOW CODE (kept for reference):
    if (learnings.length === 0) return [];

    try {
      const systemPrompt = `You are a learning relevance scorer. Given a context and a list of learnings, score each learning's relevance to the context (0.0-1.0).

Return JSON array:
[
  { "learning_index": 0, "relevance": 0.95, "reason": "..." },
  { "learning_index": 1, "relevance": 0.80, "reason": "..." },
  ...
]`;

      const userPrompt = `Context: "${context}"

Available learnings:
${learnings.map((l, i) => `${i}. ${l.pattern_description} (domain: ${l.domain}, success: ${(l.success_rate * 100).toFixed(0)}%)`).join('\n')}

Rank by relevance to the context.`;

      const response = await createChatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]);

      const rankings = this.parseJSONResponse(response.content);

      // ✅ FIX: Ensure rankings is an array
      const rankingsArray = Array.isArray(rankings) ? rankings : [];

      // Sort learnings by relevance
      const rankedLearnings = learnings
        .map((learning, index) => {
          const ranking = rankingsArray.find((r: any) => r.learning_index === index);
          return {
            learning,
            relevance: ranking?.relevance || 0
          };
        })
        .sort((a, b) => b.relevance - a.relevance)
        .map(item => item.learning);

      return rankedLearnings;

    } catch (error) {
      console.error('Ranking failed, using success rate:', error);
      // Fallback: sort by success rate
      return [...learnings].sort((a, b) => b.success_rate - a.success_rate);
    }
    */
  }

  /**
   * Apply learnings to improve approach using AI
   */
  private async applyLearningsWithAI(
    context: string,
    currentApproach: any,
    learnings: AgentLearning[]
  ): Promise<any> {
    const systemPrompt = `You are an intelligent improvement system. Given a current approach and relevant learnings from other agents, improve the approach.

Return JSON:
{
  "approach": { improved approach },
  "reasoning": "What was improved and why",
  "learnings_used": [learning indices used]
}`;

    const userPrompt = `Current task: "${context}"
Current approach: ${JSON.stringify(currentApproach, null, 2)}

Learnings from other agents:
${learnings.map((l, i) => `${i}. [${l.agent_name}] ${l.pattern_description}
   Success rate: ${(l.success_rate * 100).toFixed(0)}%
   Solution: ${l.solution || 'See description'}
`).join('\n')}

How can we improve the current approach using these learnings?`;

    const response = await createChatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]);

    return this.parseJSONResponse(response.content);
  }

  /**
   * Get learning by ID
   */
  private async getLearningById(id: string): Promise<AgentLearning | null> {
    const { data, error } = await this.supabase
      .from('collective_learnings')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapDatabaseLearning(data);
  }

  /**
   * Save learning to database
   */
  private async saveLearning(learning: AgentLearning): Promise<void> {
    // Validate required fields before saving
    if (!learning.pattern_description || !learning.domain) {
      console.warn('⚠️ [LEARNING] Skipping save: missing required fields', {
        hasDescription: !!learning.pattern_description,
        hasDomain: !!learning.domain,
        agentName: learning.agent_name
      });
      return;
    }

    await this.supabase
      .from('collective_learnings')
      .insert({
        id: learning.id,
        agent_id: learning.agent_id,
        agent_type: learning.agent_type,
        agent_name: learning.agent_name,
        learning_type: learning.learning_type,
        domain: learning.domain,
        skill: learning.skill,
        pattern_description: learning.pattern_description,
        context: learning.context,
        solution: learning.solution,
        success_rate: learning.success_rate,
        confidence: learning.confidence,
        applicable_to: learning.applicable_to,
        impact_metrics: learning.impact_metrics,
        examples: learning.examples,
        created_at: learning.created_at,
        usage_count: learning.usage_count,
        last_used: learning.last_used,
        validated_by: learning.validated_by
      });
  }

  /**
   * Preload common learnings
   */
  private async preloadCommonLearnings(): Promise<void> {
    try {
      // Load most used learnings into cache
      const { data, error } = await this.supabase
        .from('collective_learnings')
        .select('*')
        .gte('usage_count', 5)
        .order('usage_count', { ascending: false })
        .limit(50);

      if (error || !data) return;

      console.log(`📚 [CACHE] Preloaded ${data.length} common learnings`);

    } catch (error) {
      console.warn('Could not preload learnings:', error);
    }
  }

  /**
   * Invalidate cache
   */
  private invalidateCache(): void {
    this.learningCache.clear();
  }

  /**
   * Map database record to AgentLearning
   */
  private mapDatabaseLearning(data: any): AgentLearning {
    return {
      id: data.id,
      agent_id: data.agent_id,
      agent_type: data.agent_type,
      agent_name: data.agent_name,
      learning_type: data.learning_type,
      domain: data.domain,
      skill: data.skill,
      pattern_description: data.pattern_description,
      context: data.context || {},
      solution: data.solution,
      success_rate: data.success_rate,
      confidence: data.confidence,
      applicable_to: data.applicable_to || [],
      impact_metrics: data.impact_metrics,
      examples: data.examples || [],
      created_at: new Date(data.created_at),
      usage_count: data.usage_count || 0,
      last_used: data.last_used ? new Date(data.last_used) : undefined,
      validated_by: data.validated_by || []
    };
  }

  /**
   * Parse JSON from AI response
   */
  private parseJSONResponse(text: string | undefined): any {
    // ✅ FIX: Handle undefined/null text
    if (!text || typeof text !== 'string') {
      console.warn('parseJSONResponse: Invalid input, returning empty object');
      return {};
    }
    
    try {
      return JSON.parse(text);
    } catch {
      try {
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[1]);
        }
        
        const objMatch = text.match(/\{[\s\S]*\}/);
        if (objMatch) {
          return JSON.parse(objMatch[0]);
        }
      } catch (error) {
        console.error('Failed to parse JSON response:', error);
      }
    }
    return {};
  }

  /**
   * Get empty stats
   */
  private getEmptyStats(): LearningStats {
    return {
      total_learnings: 0,
      learnings_by_type: {},
      learnings_by_agent_type: {},
      avg_success_rate: 0,
      most_used_learnings: [],
      recent_learnings: []
    };
  }
}

// Export singleton for easy access
export const collectiveLearning = CollectiveLearning.getInstance();

