import { BaseAgent } from '../BaseAgent';
import type { AgentConfig, AgentRequest, AgentResponse } from '../../../types/agent-framework';
import { createChatCompletion } from '../../openai/chat';
// Browser fallback now handled via backend API

export class DirectExecutionAgent extends BaseAgent {
  constructor(id: string, config: AgentConfig, organizationId: string | null = null) {
    super(id, config, organizationId);  // ✅ Pass organizationId to BaseAgent
    this.type = 'direct_execution';
    this.name = 'Direct Execution Agent';
    this.description = 'Handles direct execution of simple tasks without complex routing';
  }

  async process(request: AgentRequest): Promise<AgentResponse> {
    try {
      console.log(`🎯 DirectExecutionAgent processing: ${request.message}`);

      // Check if this is a task that requires real-world action (booking, browsing, etc.)
      const requiresAction = await this.detectActionIntent(request.message);

      if (requiresAction.needsAction && requiresAction.confidence > 0.7) {
        console.log(`🌐 Detected action-required task: ${requiresAction.actionType}`);
        console.log(`🚀 Triggering browser automation for real execution...`);
        
        // Execute real action via browser automation
        return await this.executeRealAction(request, requiresAction);
      }

      // For conversational tasks, use LLM
      const response = await createChatCompletion([
        {
          role: 'system',
          content: `You are a helpful AI assistant that can handle direct execution of tasks. 
          
          Your capabilities include:
          - Answering questions and providing information
          - Helping with general tasks and problem-solving
          - Explaining concepts and providing guidance
          - Assisting with planning and organization
          - **Real browser automation for bookings, research, and data gathering**
          
          Be helpful, accurate, and concise in your responses.`
        },
        {
          role: 'user',
          content: request.message
        }
      ]);

      if (response?.choices?.[0]?.message?.content) {
        return {
          success: true,
          data: {
            message: response.choices[0].message.content,
            agentId: this.id,
            agentType: this.type,
            timestamp: new Date().toISOString()
          },
          metadata: {
            processingTime: Date.now() - Date.now(),
            tokensUsed: response.usage?.total_tokens || 0
          }
        };
      } else {
        throw new Error('No response from AI');
      }
    } catch (error) {
      console.error('DirectExecutionAgent error:', error);
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        metadata: {
          agentId: this.id,
          agentType: this.type,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Detect if the user's message requires real-world action
   */
  private async detectActionIntent(message: string): Promise<{
    needsAction: boolean;
    actionType: string;
    confidence: number;
    parameters: Record<string, any>;
  }> {
    const actionKeywords = {
      booking: ['book', 'reserve', 'purchase', 'buy', 'order', 'schedule'],
      research: ['search', 'find', 'look up', 'research', 'compare', 'check'],
      data_gathering: ['get', 'fetch', 'retrieve', 'extract', 'collect'],
      form_filling: ['fill', 'submit', 'register', 'sign up', 'apply']
    };

    const lowerMessage = message.toLowerCase();
    
    for (const [actionType, keywords] of Object.entries(actionKeywords)) {
      for (const keyword of keywords) {
        if (lowerMessage.includes(keyword)) {
          // High confidence if it's a clear action request
          const confidence = lowerMessage.includes('flight') || 
                           lowerMessage.includes('hotel') || 
                           lowerMessage.includes('ticket') ? 0.9 : 0.75;
          
          return {
            needsAction: true,
            actionType,
            confidence,
            parameters: this.extractParameters(message, actionType)
          };
        }
      }
    }

    return { needsAction: false, actionType: '', confidence: 0, parameters: {} };
  }

  /**
   * Extract parameters from the message
   */
  private extractParameters(message: string, actionType: string): Record<string, any> {
    const params: Record<string, any> = {};
    
    // Extract common parameters
    const dateMatch = message.match(/\d{4}-\d{2}-\d{2}/);
    if (dateMatch) params.date = dateMatch[0];
    
    const fromMatch = message.match(/from\s+([A-Za-z\s]+?)(?:\s+to|\s+for)/i);
    if (fromMatch) params.origin = fromMatch[1].trim();
    
    const toMatch = message.match(/to\s+([A-Za-z\s]+?)(?:\s+on|\s+for|\s*$)/i);
    if (toMatch) params.destination = toMatch[1].trim();
    
    const classMatch = message.match(/(economy|business|first|premium)/i);
    if (classMatch) params.class = classMatch[1].toLowerCase();
    
    return params;
  }

  /**
   * Execute real-world action via browser automation
   */
  private async executeRealAction(
    request: AgentRequest,
    actionIntent: { actionType: string; parameters: Record<string, any> }
  ): Promise<AgentResponse> {
    try {
      console.log('🚀 ========================================');
      console.log('🌐 REAL ACTION EXECUTION VIA BROWSER');
      console.log('🚀 ========================================');
      console.log(`📝 Task: "${request.message}"`);
      console.log(`🎯 Action Type: ${actionIntent.actionType}`);
      console.log(`📊 Parameters:`, actionIntent.parameters);

      // Execute via browser automation backend
      const response = await fetch('http://localhost:8000/api/browser/fallback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task: request.message,
          intent: actionIntent.actionType,
          userContext: {
            ...request.context,
            extractedParameters: actionIntent.parameters,
            agentType: this.type
          },
          userId: request.context?.userId || 'unknown',
          agentId: this.id,
          organizationId: this.organizationId || undefined
        })
      });

      if (!response.ok) {
        throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
      }

      const fallbackResult = await response.json();

      console.log('✅ ========================================');
      console.log('✅ REAL ACTION COMPLETED');
      console.log(`✅ Method: ${fallbackResult.method}`);
      console.log(`✅ Site Used: ${fallbackResult.siteUsed || 'N/A'}`);
      console.log('✅ ========================================');

      // Format response message
      let responseMessage = '';
      if (fallbackResult.success) {
        responseMessage = `✅ **Action Completed Successfully!**\n\n`;
        
        if (fallbackResult.siteUsed) {
          responseMessage += `**Website Used:** ${fallbackResult.siteUsed}\n\n`;
        }

        if (fallbackResult.executionSteps && fallbackResult.executionSteps.length > 0) {
          responseMessage += `**Steps Completed:**\n`;
          fallbackResult.executionSteps.forEach((step, i) => {
            responseMessage += `${i + 1}. ${step}\n`;
          });
          responseMessage += `\n`;
        }

        if (fallbackResult.data) {
          responseMessage += `**Result Details:**\n\`\`\`json\n${JSON.stringify(fallbackResult.data, null, 2)}\n\`\`\`\n\n`;
        }

        if (fallbackResult.screenshots && fallbackResult.screenshots.length > 0) {
          responseMessage += `📸 **Screenshots captured:** ${fallbackResult.screenshots.length}\n\n`;
        }

        // Store in memory
        await this.storeInteraction(
          request.message,
          responseMessage,
          {
            actionType: actionIntent.actionType,
            result: fallbackResult.data,
            siteUsed: fallbackResult.siteUsed,
            method: fallbackResult.method
          }
        );
      } else {
        responseMessage = `❌ **Action Failed**\n\n`;
        responseMessage += `**Error:** ${fallbackResult.error || 'Unknown error'}\n\n`;
        
        if (fallbackResult.executionSteps && fallbackResult.executionSteps.length > 0) {
          responseMessage += `**Steps Attempted:**\n`;
          fallbackResult.executionSteps.forEach((step, i) => {
            responseMessage += `${i + 1}. ${step}\n`;
          });
        }
      }

      return {
        success: fallbackResult.success,
        data: {
          message: responseMessage,
          agentId: this.id,
          agentType: this.type,
          timestamp: new Date().toISOString(),
          metadata: {
            method: fallbackResult.method,
            siteUsed: fallbackResult.siteUsed,
            screenshots: fallbackResult.screenshots?.length || 0
          }
        },
        metadata: {
          processingTime: fallbackResult.executionTime,
          actionType: actionIntent.actionType
        }
      };
    } catch (error) {
      console.error('❌ Real action execution error:', error);
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          agentId: this.id,
          agentType: this.type,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  async initialize(): Promise<void> {
    console.log(`✅ DirectExecutionAgent ${this.id} initialized`);
  }

  async cleanup(): Promise<void> {
    console.log(`🧹 DirectExecutionAgent ${this.id} cleaned up`);
  }
}
