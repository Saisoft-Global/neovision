/**
 * Travel Agent - Real flight/hotel booking with browser automation
 * 
 * This agent can:
 * - Search and book real flights using browser automation
 * - Compare prices across multiple booking sites
 * - Handle hotel reservations
 * - Manage itineraries
 * - Store booking confirmations in memory
 */

import { ToolEnabledAgent } from '../ToolEnabledAgent';
import type { AgentConfig, AgentRequest, AgentResponse } from '../../../types/agent-framework';
import type { ToolRegistry } from '../../tools/ToolRegistry';

export class TravelAgent extends ToolEnabledAgent {
  constructor(id: string, config: AgentConfig, toolRegistry: ToolRegistry, organizationId: string | null = null) {
    super(
      id,
      {
        ...config,
        personality: {
          friendliness: 0.9,
          formality: 0.7,
          proactiveness: 0.85,
          detail_orientation: 0.95
        },
        skills: [
          { name: 'flight_booking', level: 5 },
          { name: 'hotel_booking', level: 5 },
          { name: 'travel_research', level: 5 },
          { name: 'itinerary_planning', level: 5 },
          { name: 'price_comparison', level: 5 }
        ],
        knowledge_bases: ['travel_booking', 'airline_policies'],
        llm_config: {
          provider: 'groq',
          model: 'llama-3.3-70b-versatile',
          temperature: 0.7
        }
      },
      toolRegistry,
      organizationId
    );
    
    this.type = 'travel';
    this.name = 'Travel Booking Agent';
    this.description = 'Expert in booking flights, hotels, and managing travel itineraries with real browser automation';
  }

  /**
   * Process travel requests with intelligent routing
   */
  async process(request: AgentRequest): Promise<AgentResponse> {
    try {
      console.log(`✈️ TravelAgent processing: ${request.message}`);
      
      // Analyze the request to determine intent
      const intent = await this.analyzeIntent(request.message, {
        userId: request.context?.userId,
        organizationId: this.organizationId
      });

      console.log(`🎯 Intent detected: ${intent.skillName}`);
      console.log(`📊 Confidence: ${intent.confidence}`);
      console.log(`📝 Parameters:`, intent.parameters);

      // Check if we have a tool/skill for this
      let result;
      if (intent.skillName && intent.confidence > 0.6) {
        // Try to execute with attached tools first
        result = await this.executeFromPrompt(request.message, {
          userId: request.context?.userId,
          organizationId: this.organizationId,
          conversationHistory: request.context?.conversationHistory || []
        });
      } else {
        // Fallback to browser automation for complex/unclear requests
        console.log('🌐 No clear skill match - using intelligent browser automation');
        result = await this.executeBrowserFallbackDirect(request.message, intent, request.context);
      }

      if (result.success) {
        return {
          success: true,
          data: {
            message: result.response || result.output,
            agentId: this.id,
            agentType: this.type,
            timestamp: new Date().toISOString(),
            metadata: result.metadata
          },
          metadata: {
            processingTime: result.executionTime || 0,
            method: result.metadata?.method || 'tool_execution'
          }
        };
      } else {
        throw new Error(result.error || 'Travel agent execution failed');
      }
    } catch (error) {
      console.error('❌ TravelAgent error:', error);
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
   * Direct browser fallback execution (wrapper for external access)
   */
  private async executeBrowserFallbackDirect(
    prompt: string,
    intent: any,
    context: any
  ): Promise<any> {
    try {
      console.log('🚀 ========================================');
      console.log('🌐 TRAVEL AGENT: BROWSER AUTOMATION');
      console.log('🚀 ========================================');
      console.log(`📝 Task: "${prompt}"`);
      console.log(`🎯 Intent: ${intent.skillName}`);

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
            extractedParameters: intent.parameters,
            agentType: 'travel',
            capabilities: ['flight_booking', 'hotel_booking', 'price_comparison']
          },
          userId: context?.userId || 'unknown',
          agentId: this.id,
          organizationId: this.organizationId || undefined
        })
      });

      if (!response.ok) {
        throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
      }

      const fallbackResult = await response.json();

      console.log('✅ ========================================');
      console.log('✅ BROWSER AUTOMATION COMPLETED');
      console.log(`✅ Method: ${fallbackResult.method}`);
      console.log(`✅ Site Used: ${fallbackResult.siteUsed || 'N/A'}`);
      console.log('✅ ========================================');

      // Format the response for the user
      let responseMessage = '';
      if (fallbackResult.success) {
        responseMessage = `✅ **Travel Booking Completed Successfully!**\n\n`;
        
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
          responseMessage += `**Booking Details:**\n${JSON.stringify(fallbackResult.data, null, 2)}\n\n`;
        }

        if (fallbackResult.learnings && fallbackResult.learnings.length > 0) {
          responseMessage += `**Learnings for Future Bookings:**\n`;
          fallbackResult.learnings.forEach((learning, i) => {
            responseMessage += `- ${learning}\n`;
          });
        }

        // Store booking in memory
        if (fallbackResult.data) {
          await this.storeInteraction(
            prompt,
            responseMessage,
            {
              bookingData: fallbackResult.data,
              siteUsed: fallbackResult.siteUsed,
              method: fallbackResult.method
            }
          );
        }
      } else {
        responseMessage = `❌ **Travel Booking Failed**\n\n`;
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
        response: responseMessage,
        output: responseMessage,
        executionTime: fallbackResult.executionTime,
        metadata: {
          method: fallbackResult.method,
          siteUsed: fallbackResult.siteUsed,
          screenshots: fallbackResult.screenshots,
          suggestedToolConfig: fallbackResult.suggestedToolConfig
        }
      };
    } catch (error) {
      console.error('❌ Browser fallback error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        response: `❌ Failed to complete travel booking: ${error instanceof Error ? error.message : 'Unknown error'}`,
        executionTime: 0
      };
    }
  }

  async initialize(): Promise<void> {
    console.log(`✅ TravelAgent ${this.id} initialized with browser automation capabilities`);
  }

  async cleanup(): Promise<void> {
    console.log(`🧹 TravelAgent ${this.id} cleaned up`);
  }
}




