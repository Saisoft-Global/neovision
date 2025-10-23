/**
 * Advanced Prompt Template Engine
 * Supports dynamic prompt generation, fine-tuning, and A/B testing
 */

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: 'system' | 'user' | 'assistant' | 'few_shot';
  version: string;
  template: string;
  variables: PromptVariable[];
  metadata: {
    created_at: string;
    updated_at: string;
    author: string;
    tags: string[];
    performance_metrics?: {
      accuracy: number;
      user_satisfaction: number;
      response_time: number;
    };
  };
}

export interface PromptVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  default_value?: any;
  description: string;
  validation_rules?: string[];
}

export interface PromptContext {
  agent_type: string;
  personality?: Record<string, number>;
  skills?: Array<{ name: string; level: number }>;
  conversation_history?: Array<{ role: string; content: string }>;
  user_preferences?: Record<string, any>;
  organization_context?: {
    industry: string;
    company_size: string;
    culture: string;
  };
  task_context?: {
    domain: string;
    complexity: 'low' | 'medium' | 'high';
    urgency: 'low' | 'medium' | 'high';
  };
}

export class PromptTemplateEngine {
  private static instance: PromptTemplateEngine;
  private templates: Map<string, PromptTemplate> = new Map();
  private activeVersions: Map<string, string> = new Map();

  static getInstance(): PromptTemplateEngine {
    if (!this.instance) {
      this.instance = new PromptTemplateEngine();
    }
    return this.instance;
  }

  /**
   * Register a new prompt template
   */
  registerTemplate(template: PromptTemplate): void {
    this.templates.set(template.id, template);
    console.log(`📝 Registered prompt template: ${template.name} v${template.version}`);
  }

  /**
   * Generate a prompt from template with context
   */
  generatePrompt(
    templateId: string, 
    context: PromptContext, 
    variables: Record<string, any> = {}
  ): string {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Validate required variables
    this.validateVariables(template, variables);

    // Merge context and variables
    const allVariables = {
      ...this.extractContextVariables(context),
      ...variables
    };

    // Render template
    return this.renderTemplate(template.template, allVariables);
  }

  /**
   * Get the best prompt template for a given context
   */
  getBestTemplate(context: PromptContext): PromptTemplate | null {
    // Score templates based on context match
    const scoredTemplates = Array.from(this.templates.values())
      .map(template => ({
        template,
        score: this.scoreTemplate(template, context)
      }))
      .sort((a, b) => b.score - a.score);

    return scoredTemplates.length > 0 ? scoredTemplates[0].template : null;
  }

  /**
   * A/B test different prompt versions
   */
  async abTestPrompts(
    templateIds: string[],
    context: PromptContext,
    testName: string
  ): Promise<{ templateId: string; response: string; metrics: any }> {
    // Select template based on A/B test logic
    const selectedTemplateId = this.selectABTestVariant(templateIds, testName);
    const template = this.templates.get(selectedTemplateId);
    
    if (!template) {
      throw new Error(`Template not found: ${selectedTemplateId}`);
    }

    const prompt = this.generatePrompt(selectedTemplateId, context);
    
    // Execute and measure performance
    const startTime = Date.now();
    const response = await this.executePrompt(prompt, context);
    const responseTime = Date.now() - startTime;

    // Record metrics for A/B testing
    await this.recordABTestMetrics(testName, selectedTemplateId, {
      response_time: responseTime,
      response_length: response.length,
      context_complexity: this.calculateContextComplexity(context)
    });

    return {
      templateId: selectedTemplateId,
      response,
      metrics: {
        response_time: responseTime,
        template_version: template.version
      }
    };
  }

  /**
   * Fine-tune prompts based on feedback
   */
  async fineTunePrompt(
    templateId: string,
    feedback: {
      rating: number; // 1-5
      comments?: string;
      context: PromptContext;
      response: string;
    }
  ): Promise<void> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Update performance metrics
    if (!template.metadata.performance_metrics) {
      template.metadata.performance_metrics = {
        accuracy: 0,
        user_satisfaction: 0,
        response_time: 0
      };
    }

    // Update metrics with feedback
    const metrics = template.metadata.performance_metrics;
    metrics.user_satisfaction = (metrics.user_satisfaction + feedback.rating) / 2;

    // If feedback is consistently low, suggest improvements
    if (feedback.rating < 3 && feedback.comments) {
      await this.suggestPromptImprovements(template, feedback);
    }

    console.log(`🎯 Fine-tuned prompt template: ${template.name} (rating: ${feedback.rating})`);
  }

  /**
   * Extract variables from context
   */
  private extractContextVariables(context: PromptContext): Record<string, any> {
    return {
      agent_type: context.agent_type,
      personality_traits: this.formatPersonalityTraits(context.personality),
      skills_list: this.formatSkillsList(context.skills),
      conversation_context: this.formatConversationHistory(context.conversation_history),
      organization_industry: context.organization_context?.industry || 'general',
      task_domain: context.task_context?.domain || 'general',
      task_complexity: context.task_context?.complexity || 'medium',
      task_urgency: context.task_context?.urgency || 'medium'
    };
  }

  /**
   * Format personality traits for prompt
   */
  private formatPersonalityTraits(personality: Record<string, number> | undefined): string {
    if (!personality || Object.keys(personality).length === 0) {
      return 'Professional and helpful';
    }
    return Object.entries(personality)
      .map(([trait, value]) => `${trait}: ${Math.round(value * 100)}%`)
      .join(', ');
  }

  /**
   * Format skills list for prompt
   */
  private formatSkillsList(skills: Array<{ name: string; level: number }> | undefined): string {
    if (!skills || skills.length === 0) {
      return 'General assistance';
    }
    const filteredSkills = skills.filter(skill => skill.level >= 3);
    if (filteredSkills.length === 0) {
      return skills.map(skill => skill.name).join(', ');
    }
    return filteredSkills
      .map(skill => `${skill.name} (Level ${skill.level})`)
      .join(', ');
  }

  /**
   * Format conversation history for context
   */
  private formatConversationHistory(history: Array<{ role: string; content: string }> | undefined): string {
    if (!history || history.length === 0) {
      return 'No previous conversation';
    }
    return history
      .slice(-5) // Last 5 messages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');
  }

  /**
   * Render template with variables
   */
  private renderTemplate(template: string, variables: Record<string, any>): string {
    let rendered = template;
    
    // Replace variables in format {{variable_name}}
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(placeholder, String(value));
    });

    return rendered;
  }

  /**
   * Validate required variables
   */
  private validateVariables(template: PromptTemplate, variables: Record<string, any>): void {
    template.variables
      .filter(variable => variable.required)
      .forEach(variable => {
        if (!(variable.name in variables)) {
          throw new Error(`Required variable missing: ${variable.name}`);
        }
      });
  }

  /**
   * Score template based on context match
   */
  private scoreTemplate(template: PromptTemplate, context: PromptContext): number {
    let score = 0;
    
    // Score based on agent type match
    if (template.name.toLowerCase().includes(context.agent_type)) {
      score += 10;
    }
    
    // Score based on task domain
    if (template.metadata.tags.includes(context.task_context.domain)) {
      score += 5;
    }
    
    // Score based on performance metrics
    if (template.metadata.performance_metrics) {
      score += template.metadata.performance_metrics.user_satisfaction * 2;
    }
    
    return score;
  }

  /**
   * Select A/B test variant
   */
  private selectABTestVariant(templateIds: string[], testName: string): string {
    // Simple round-robin for now, can be enhanced with more sophisticated logic
    const index = Math.floor(Math.random() * templateIds.length);
    return templateIds[index];
  }

  /**
   * Execute prompt and get response
   */
  private async executePrompt(prompt: string, context: PromptContext): Promise<string> {
    // This would integrate with your LLM service
    // For now, return a placeholder
    return `Generated response for: ${prompt.substring(0, 50)}...`;
  }

  /**
   * Record A/B test metrics
   */
  private async recordABTestMetrics(
    testName: string,
    templateId: string,
    metrics: any
  ): Promise<void> {
    // Store metrics for analysis
    console.log(`📊 A/B Test Metrics - ${testName}:`, {
      template: templateId,
      metrics
    });
  }

  /**
   * Calculate context complexity
   */
  private calculateContextComplexity(context: PromptContext): number {
    let complexity = 0;
    
    complexity += context.skills.length;
    complexity += context.conversation_history.length;
    complexity += Object.keys(context.personality).length;
    
    return complexity;
  }

  /**
   * Suggest prompt improvements
   */
  private async suggestPromptImprovements(
    template: PromptTemplate,
    feedback: { rating: number; comments?: string }
  ): Promise<void> {
    console.log(`💡 Suggested improvements for ${template.name}:`, {
      current_rating: feedback.rating,
      feedback: feedback.comments,
      suggestions: [
        'Consider adding more specific instructions',
        'Include examples in the prompt',
        'Adjust personality traits based on feedback',
        'Add domain-specific context'
      ]
    });
  }
}

// Export singleton instance
export const promptTemplateEngine = PromptTemplateEngine.getInstance();
