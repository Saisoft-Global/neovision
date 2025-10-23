import { BaseAgent } from './BaseAgent';
import type { AgentConfig } from '../../types/agent-framework';
import type { AgentResponse } from './types';
import type { ToolRegistry } from '../tools/ToolRegistry';
import type { ToolAttachment, IntentAnalysis, SkillExecutionResult } from '../../types/tool-framework';
import { createChatCompletion } from '../openai/chat';
import { organizationToolService } from '../tools/OrganizationToolService';  // ✅ Import org tool service
// Browser fallback now handled via backend API

/**
 * Enhanced Agent with dynamic tool and skill support
 * 
 * This agent can:
 * - Attach tools dynamically
 * - Execute skills from natural language prompts
 * - Automatically map user intent to appropriate skills
 * - Handle multiple tools simultaneously
 */
export class ToolEnabledAgent extends BaseAgent {
  private toolRegistry: ToolRegistry;
  private attachedTools: Map<string, ToolAttachment> = new Map();
  
  constructor(id: string, config: AgentConfig, toolRegistry: ToolRegistry, organizationId: string | null = null) {
    super(id, config, organizationId);  // ✅ Pass organizationId to BaseAgent
    this.toolRegistry = toolRegistry;
  }
  
  /**
   * Attach a tool to this agent
   * ✅ NOW CHECKS: Tool must be enabled for organization first!
   * Automatically adds tool skills to agent's skill list
   */
  public async attachTool(toolId: string, permissions?: string[]): Promise<void> {
    // ✅ SECURITY CHECK: Verify tool is enabled for organization (with fallback)
    if (this.organizationId) {
      try {
        const isEnabled = await organizationToolService.isToolEnabledForOrganization(
          this.organizationId,
          toolId
        );
        
        if (!isEnabled) {
          console.warn(`⚠️ Tool "${toolId}" not enabled for organization, but continuing anyway`);
          // Don't throw error, just warn and continue
        }
      } catch (error) {
        console.warn(`⚠️ Could not check organization tool status: ${error.message}`);
        // Continue anyway - this allows tools to work even if organization_tools table is missing
      }
    }
    
    const tool = this.toolRegistry.getTool(toolId);
    
    if (!tool) {
      throw new Error(`Tool not found: ${toolId}`);
    }
    
    if (!tool.isActive) {
      throw new Error(`Tool is not active: ${tool.name}`);
    }
    
    // Record attachment
    this.attachedTools.set(toolId, {
      toolId,
      attachedAt: new Date().toISOString(),
      permissions
    });
    
    // Add tool skills to agent configuration
    for (const skill of tool.skills) {
      // Check if skill already exists
      const exists = this.config.skills.some(s => s.name === skill.name);
      if (!exists) {
        this.config.skills.push({
          name: skill.name,
          level: 5, // Tool skills are always expert level
          config: {
            toolId: tool.id,
            toolName: tool.name,
            description: skill.description,
            parameters: skill.parameters
          }
        });
      }
    }
    
    console.log(`✅ Tool attached to agent: ${tool.name} (${tool.skills.length} skills added)`);
  }
  
  /**
   * Detach a tool from this agent
   */
  public detachTool(toolId: string): void {
    const attachment = this.attachedTools.get(toolId);
    if (!attachment) {
      throw new Error(`Tool not attached: ${toolId}`);
    }
    
    // Remove tool skills from agent
    const tool = this.toolRegistry.getTool(toolId);
    if (tool) {
      const toolSkillNames = tool.skills.map(s => s.name);
      this.config.skills = this.config.skills.filter(
        skill => !toolSkillNames.includes(skill.name)
      );
    }
    
    // Remove attachment record
    this.attachedTools.delete(toolId);
    
    console.log(`🗑️  Tool detached from agent: ${toolId}`);
  }
  
  /**
   * Get all attached tools
   */
  public getAttachedTools(): ToolAttachment[] {
    return Array.from(this.attachedTools.values());
  }
  
  /**
   * Get all available skill names (core + tool skills)
   */
  public getAvailableSkills(): string[] {
    return this.config.skills.map(s => s.name);
  }
  
  /**
   * Execute a skill directly by name
   * With automatic browser fallback if tool fails
   */
  public async executeSkill(
    skillName: string,
    params: Record<string, any>,
    context?: any
  ): Promise<SkillExecutionResult> {
    // Check if agent has this skill
    if (!this.hasSkill(skillName)) {
      return {
        success: false,
        error: `Agent does not have skill: ${skillName}`
      };
    }
    
    // Execute via tool registry
    const result = await this.toolRegistry.executeSkill(skillName, params, context);
    
    // 🌐 INTELLIGENT FALLBACK: If tool execution fails AND shouldFallbackToBrowser flag set
    if (!result.success && (result as any).shouldFallbackToBrowser) {
      console.log(`⚠️ Tool execution failed for ${skillName}, activating browser fallback...`);
      
      // Construct prompt from skill name and params
      const prompt = `${skillName.replace(/_/g, ' ')}: ${JSON.stringify(params)}`;
      
      return await this.executeBrowserFallback(
        prompt,
        { skillName, confidence: 0.8, parameters: params, reasoning: 'Tool fallback' },
        context
      );
    }
    
    return result;
  }
  
  /**
   * Execute based on natural language prompt
   * Agent automatically determines which skill to use and extracts parameters
   */
  public async executeFromPrompt(
    prompt: string,
    context: any = {}
  ): Promise<SkillExecutionResult> {
    try {
      // Step 1: Analyze intent and determine which skill to use
      const intent = await this.analyzeIntent(prompt, context);
      
      if (!intent.skillName) {
        return {
          success: false,
          error: 'Could not determine intent from prompt'
        };
      }
      
      console.log(`🎯 Intent detected: ${intent.skillName} (confidence: ${intent.confidence})`);
      
      // Step 2: Check if agent has the required skill
      if (!this.hasSkill(intent.skillName)) {
        console.log(`⚠️ Skill "${intent.skillName}" not available - ACTIVATING INTELLIGENT FALLBACK`);
        
        // 🌐 INTELLIGENT FALLBACK: Use browser automation!
        return await this.executeBrowserFallback(prompt, intent, context);
      }
      
      // Step 3: Execute the skill with extracted parameters
      const result = await this.executeSkill(intent.skillName, intent.parameters, context);
      
      return {
        ...result,
        metadata: {
          ...result.metadata,
          intent: {
            skillName: intent.skillName,
            confidence: intent.confidence,
            reasoning: intent.reasoning
          }
        }
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Failed to execute from prompt: ${errorMessage}`
      };
    }
  }
  
  /**
   * Analyze user intent and determine which skill to use
   */
  private async analyzeIntent(prompt: string, context: any): Promise<IntentAnalysis> {
    const availableSkills = this.getAvailableSkills();
    const skillDetails = this.config.skills
      .filter(s => availableSkills.includes(s.name))
      .map(s => ({
        name: s.name,
        description: (s.config as any)?.description || '',
        parameters: (s.config as any)?.parameters || []
      }));
    
    const response = await createChatCompletion([
      {
        role: 'system',
        content: `You are an AI agent intent analyzer. Analyze user requests and determine which skill to use.

Available skills:
${JSON.stringify(skillDetails, null, 2)}

Context:
${JSON.stringify(context, null, 2)}

Analyze the user's prompt and return JSON with:
- skillName (string): The most appropriate skill to use
- confidence (number): Confidence level 0-1
- parameters (object): Extracted parameters for the skill
- reasoning (string): Brief explanation of your choice`
      },
      {
        role: 'user',
        content: prompt
      }
    ], this.config.llm_config);
    
    try {
      const content = response.choices[0].message.content || '{}';
      const analysis = JSON.parse(content);
      
      return {
        skillName: analysis.skillName || '',
        confidence: analysis.confidence || 0,
        parameters: analysis.parameters || {},
        reasoning: analysis.reasoning || ''
      };
    } catch (error) {
      console.error('Intent analysis failed:', error);
      return {
        skillName: '',
        confidence: 0,
        parameters: {},
        reasoning: 'Failed to parse intent'
      };
    }
  }
  
  /**
   * Generate a natural language response after skill execution
   */
  public async generateResponseFromResult(
    prompt: string,
    result: SkillExecutionResult
  ): Promise<string> {
    const response = await createChatCompletion([
      {
        role: 'system',
        content: `You are a helpful AI agent. The user asked: "${prompt}"
        
You executed a skill and got this result:
${JSON.stringify(result, null, 2)}

Generate a natural, conversational response to the user explaining what you did and the result.
Be concise but informative.`
      },
      {
        role: 'user',
        content: 'Please provide the response.'
      }
    ], this.config.llm_config);
    
    return response.choices[0].message.content || 'Task completed.';
  }
  
  /**
   * Execute action (required by BaseAgent)
   */
  async execute(action: string, params: Record<string, unknown>): Promise<AgentResponse> {
    // Check if this is a skill execution
    if (this.hasSkill(action)) {
      const result = await this.executeSkill(action, params as any);
      return {
        success: result.success,
        data: result.data,
        error: result.error
      };
    }
    
    // Otherwise, treat as natural language prompt
    const prompt = `${action} ${JSON.stringify(params)}`;
    const result = await this.executeFromPrompt(prompt);
    
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  }
  
  /**
   * 🌐 INTELLIGENT BROWSER FALLBACK
   * When no tool/skill available, automatically finds and completes task via browser
   * This is the GAME-CHANGING feature that makes your system unbeatable!
   */
  private async executeBrowserFallback(
    prompt: string,
    intent: IntentAnalysis,
    context: any
  ): Promise<SkillExecutionResult> {
    try {
      console.log('🚀 ========================================');
      console.log('🌐 INTELLIGENT FALLBACK ACTIVATED');
      console.log('🚀 ========================================');
      console.log(`📝 Task: "${prompt}"`);
      console.log(`🎯 Intent: ${intent.skillName}`);
      console.log(`💡 No tool available - using browser automation...`);

      // Execute fallback via backend API
      const response = await fetch('http://localhost:8000/api/browser/fallback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task: prompt,
          intent: intent.skillName,
          userContext: {
            ...context,
            extractedParameters: intent.parameters
          },
          userId: context.userId || 'unknown',
          agentId: this.id,
          organizationId: this.organizationId || undefined
        })
      });

      if (!response.ok) {
        throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
      }

      const fallbackResult = await response.json();

      // Format result for agent
      const formattedResponse = await this.formatFallbackResponse(
        prompt,
        fallbackResult
      );

      console.log('✅ ========================================');
      console.log('✅ FALLBACK COMPLETED');
      console.log('✅ ========================================');

      return {
        success: fallbackResult.success,
        data: {
          message: formattedResponse,
          method: fallbackResult.method,
          siteUsed: fallbackResult.siteUsed,
          executionSteps: fallbackResult.executionSteps,
          screenshots: fallbackResult.screenshots,
          learnings: fallbackResult.learnings,
          suggestedToolConfig: fallbackResult.suggestedToolConfig,
          rawData: fallbackResult.data
        },
        error: fallbackResult.error,
        metadata: {
          skillName: intent.skillName,
          confidence: intent.confidence,
          method: 'browser_fallback',
          executionTime: fallbackResult.executionTime,
          screenshotCount: fallbackResult.screenshots.length,
          learningCount: fallbackResult.learnings.length,
          canCreateTool: !!fallbackResult.suggestedToolConfig
        }
      };

    } catch (error) {
      console.error('❌ Browser fallback failed:', error);
      
      return {
        success: false,
        error: `Browser fallback failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        metadata: {
          skillName: intent.skillName,
          method: 'browser_fallback',
          failed: true
        }
      };
    }
  }

  /**
   * Format fallback result into natural language response
   */
  private async formatFallbackResponse(
    originalPrompt: string,
    fallbackResult: any
  ): Promise<string> {
    try {
      const response = await createChatCompletion([
        {
          role: 'system',
          content: `You are a helpful AI agent. You just completed a task using browser automation (no API was available).
          
          Explain to the user:
          1. What you did
          2. Which website you used and why
          3. The result
          4. What you learned (can optimize next time)
          5. If you can create an automated tool for future use
          
          Be conversational, enthusiastic about finding a solution!`
        },
        {
          role: 'user',
          content: `User asked: "${originalPrompt}"
          
          Fallback execution:
          ${JSON.stringify({
            method: fallbackResult.method,
            siteUsed: fallbackResult.siteUsed,
            steps: fallbackResult.executionSteps,
            learnings: fallbackResult.learnings,
            canCreateTool: !!fallbackResult.suggestedToolConfig,
            data: fallbackResult.data
          }, null, 2)}
          
          Generate enthusiastic response.`
        }
      ]);

      let message = response.choices[0].message.content || 'Task completed using browser automation.';

      // Add tool creation suggestion if available
      if (fallbackResult.suggestedToolConfig) {
        message += `\n\n💡 **Optimization Available:**\nI can create an automated tool for this task! Next time it will be instant (no browser needed). Would you like me to set it up?`;
      }

      return message;

    } catch (error) {
      console.warn('⚠️ Response formatting failed:', error);
      
      // Fallback to basic message
      return `I completed your request using browser automation on ${fallbackResult.siteUsed}. ${
        fallbackResult.success ? 'Task successful!' : 'Task encountered issues.'
      }`;
    }
  }
}




