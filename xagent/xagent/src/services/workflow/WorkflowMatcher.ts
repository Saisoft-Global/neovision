/**
 * Intelligent Workflow Matcher
 * Uses AI to match user intent/prompt to appropriate workflows
 */

import { getSupabaseClient } from '../../config/supabase';
import { createChatCompletion } from '../llm/providers/openai';
import type { Workflow } from '../../types/workflow';

export interface WorkflowMatch {
  workflow: Workflow;
  confidence: number;
  reasoning: string;
}

export class WorkflowMatcher {
  private static instance: WorkflowMatcher;
  private supabase;

  private constructor() {
    this.supabase = getSupabaseClient();
  }

  public static getInstance(): WorkflowMatcher {
    if (!this.instance) {
      this.instance = new WorkflowMatcher();
    }
    return this.instance;
  }

  /**
   * Find the best workflow for an agent based on user prompt
   */
  async findWorkflowForIntent(
    agentId: string,
    userPrompt: string,
    context: Record<string, unknown> = {}
  ): Promise<WorkflowMatch | null> {
    try {
      // Skip DB lookups for non-UUID agent IDs (e.g., local default general-assistant)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(agentId);
      if (!isUUID) {
        console.log(`No workflows for non-UUID agent ${agentId}; skipping workflow matching.`);
        return null;
      }

      // 1. Get all workflows linked to this agent
      const agentWorkflows = await this.getAgentWorkflows(agentId);
      
      if (agentWorkflows.length === 0) {
        console.log(`No workflows found for agent ${agentId}`);
        return null;
      }

      // 2. Use AI to match user prompt to best workflow
      const match = await this.matchWorkflowWithAI(userPrompt, agentWorkflows, context);
      
      return match;
    } catch (error) {
      console.error('Error finding workflow for intent:', error);
      return null;
    }
  }

  /**
   * Get all workflows associated with an agent
   */
  private async getAgentWorkflows(agentId: string): Promise<Workflow[]> {
    try {
      // Query agent_workflows junction table
      const { data: links, error: linksError } = await this.supabase
        .from('agent_workflows')
        .select('workflow_id')
        .eq('agent_id', agentId);

      // Log the error details for debugging
      if (linksError) {
        console.error('Error querying agent_workflows:', linksError);
        // Table might not exist or RLS might be blocking
        // Return empty array and continue gracefully
        return [];
      }

      if (!links || links.length === 0) {
        console.log(`No workflow links found for agent ${agentId}`);
        return [];
      }

      const workflowIds = links.map(link => link.workflow_id);

      // Fetch full workflow definitions (table name is 'workflow' not 'workflows')
      const { data: workflows, error: workflowsError } = await this.supabase
        .from('workflow')
        .select('*')
        .in('id', workflowIds);

      if (workflowsError) {
        console.error('Error fetching workflows from workflow table:', workflowsError);
        // If that fails, try 'workflows' table as fallback
        const { data: fallbackWorkflows, error: fallbackError } = await this.supabase
          .from('workflows')
          .select('*')
          .in('id', workflowIds);
        
        if (fallbackError) {
          console.error('Error fetching workflows from workflows table:', fallbackError);
          return [];
        }
        
        return fallbackWorkflows || [];
      }

      return workflows || [];
    } catch (error) {
      console.error('Error getting agent workflows:', error);
      return [];
    }
  }

  /**
   * Use AI to intelligently match user prompt to best workflow
   */
  private async matchWorkflowWithAI(
    userPrompt: string,
    workflows: Workflow[],
    context: Record<string, unknown>
  ): Promise<WorkflowMatch | null> {
    const systemPrompt = `You are an intelligent workflow matching system.

Your task is to analyze the user's request and determine which workflow (if any) should be executed.

Available workflows:
${workflows.map((w, i) => `
${i + 1}. "${w.name}"
   Description: ${w.description || 'No description'}
   Steps: ${w.nodes?.length || 0} steps
   Actions: ${w.nodes?.map(n => n.action).join(', ') || 'None'}
`).join('\n')}

Return your analysis as JSON:
{
  "shouldExecuteWorkflow": true/false,
  "workflowName": "exact workflow name or null",
  "confidence": 0.0-1.0,
  "reasoning": "why this workflow matches or doesn't match"
}

Rules:
- Match based on user intent, not exact keywords
- Consider the workflow's steps and actions
- Return null if no workflow is appropriate
- Be confident (>0.7) before recommending a workflow`;

    try {
      const response = await createChatCompletion([
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: `User request: "${userPrompt}"
Additional context: ${JSON.stringify(context, null, 2)}

Which workflow should be executed?`,
        },
      ]);

      const analysis = this.parseAIResponse(response.content);

      if (!analysis.shouldExecuteWorkflow || !analysis.workflowName) {
        return null;
      }

      // Find the matched workflow
      const matchedWorkflow = workflows.find(
        w => w.name.toLowerCase() === analysis.workflowName?.toLowerCase()
      );

      if (!matchedWorkflow) {
        console.warn(`AI suggested workflow "${analysis.workflowName}" but it wasn't found`);
        return null;
      }

      return {
        workflow: matchedWorkflow,
        confidence: analysis.confidence || 0,
        reasoning: analysis.reasoning || 'AI matched this workflow',
      };
    } catch (error) {
      console.error('Error in AI workflow matching:', error);
      return null;
    }
  }

  /**
   * Parse AI response (handles JSON extraction from various formats)
   */
  private parseAIResponse(response: string): {
    shouldExecuteWorkflow: boolean;
    workflowName: string | null;
    confidence: number;
    reasoning: string;
  } {
    try {
      // Try direct JSON parse
      return JSON.parse(response);
    } catch {
      try {
        // Extract JSON from markdown code blocks
        const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[1]);
        }

        // Extract JSON from text
        const jsonStart = response.indexOf('{');
        const jsonEnd = response.lastIndexOf('}') + 1;
        if (jsonStart !== -1 && jsonEnd > jsonStart) {
          const jsonText = response.substring(jsonStart, jsonEnd);
          return JSON.parse(jsonText);
        }
      } catch (parseError) {
        console.error('Failed to parse AI response:', response);
      }
    }

    // Fallback
    return {
      shouldExecuteWorkflow: false,
      workflowName: null,
      confidence: 0,
      reasoning: 'Failed to parse AI response',
    };
  }

  /**
   * Get all workflows for an agent (with caching)
   */
  async getWorkflowsForAgent(agentId: string): Promise<Workflow[]> {
    return this.getAgentWorkflows(agentId);
  }

  /**
   * Check if agent has a specific workflow
   */
  async hasWorkflow(agentId: string, workflowName: string): Promise<boolean> {
    const workflows = await this.getAgentWorkflows(agentId);
    return workflows.some(w => w.name.toLowerCase() === workflowName.toLowerCase());
  }
}

