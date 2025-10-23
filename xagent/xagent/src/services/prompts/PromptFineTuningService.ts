/**
 * Prompt Fine-Tuning Service
 * Handles continuous improvement of prompts based on feedback and performance
 */

import { PromptTemplate, PromptContext, promptTemplateEngine } from './PromptTemplateEngine';

export interface FineTuningData {
  templateId: string;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  feedback: {
    rating: number; // 1-5
    comments?: string;
    categories: string[]; // e.g., ['accuracy', 'tone', 'completeness']
  };
  context: PromptContext;
  timestamp: string;
}

export interface PromptOptimization {
  templateId: string;
  optimizationType: 'personality_adjustment' | 'instruction_clarification' | 'example_addition' | 'structure_improvement';
  changes: {
    before: string;
    after: string;
    reasoning: string;
  };
  expectedImprovement: number; // 0-1
  testResults?: {
    accuracy: number;
    user_satisfaction: number;
    response_time: number;
  };
}

export class PromptFineTuningService {
  private static instance: PromptFineTuningService;
  private fineTuningData: FineTuningData[] = [];
  private optimizationHistory: PromptOptimization[] = [];

  static getInstance(): PromptFineTuningService {
    if (!this.instance) {
      this.instance = new PromptFineTuningService();
    }
    return this.instance;
  }

  /**
   * Collect feedback for prompt improvement
   */
  async collectFeedback(data: FineTuningData): Promise<void> {
    this.fineTuningData.push(data);
    
    // Analyze feedback patterns
    const analysis = await this.analyzeFeedbackPatterns(data.templateId);
    
    // Suggest optimizations if needed
    if (analysis.needsOptimization) {
      await this.suggestOptimizations(data.templateId, analysis);
    }

    console.log(`📊 Collected feedback for template ${data.templateId}: ${data.feedback.rating}/5`);
  }

  /**
   * Analyze feedback patterns to identify improvement opportunities
   */
  private async analyzeFeedbackPatterns(templateId: string): Promise<{
    needsOptimization: boolean;
    commonIssues: string[];
    averageRating: number;
    trendDirection: 'improving' | 'declining' | 'stable';
  }> {
    const templateFeedback = this.fineTuningData.filter(d => d.templateId === templateId);
    
    if (templateFeedback.length < 5) {
      return {
        needsOptimization: false,
        commonIssues: [],
        averageRating: 0,
        trendDirection: 'stable'
      };
    }

    const averageRating = templateFeedback.reduce((sum, d) => sum + d.feedback.rating, 0) / templateFeedback.length;
    
    // Identify common issues
    const issueCounts: Record<string, number> = {};
    templateFeedback.forEach(data => {
      data.feedback.categories.forEach(category => {
        issueCounts[category] = (issueCounts[category] || 0) + 1;
      });
    });

    const commonIssues = Object.entries(issueCounts)
      .filter(([_, count]) => count >= 3)
      .map(([issue, _]) => issue);

    // Determine trend
    const recentFeedback = templateFeedback.slice(-10);
    const olderFeedback = templateFeedback.slice(-20, -10);
    
    const recentAvg = recentFeedback.reduce((sum, d) => sum + d.feedback.rating, 0) / recentFeedback.length;
    const olderAvg = olderFeedback.length > 0 
      ? olderFeedback.reduce((sum, d) => sum + d.feedback.rating, 0) / olderFeedback.length 
      : recentAvg;

    let trendDirection: 'improving' | 'declining' | 'stable' = 'stable';
    if (recentAvg > olderAvg + 0.2) trendDirection = 'improving';
    else if (recentAvg < olderAvg - 0.2) trendDirection = 'declining';

    return {
      needsOptimization: averageRating < 4.0 || commonIssues.length > 0,
      commonIssues,
      averageRating,
      trendDirection
    };
  }

  /**
   * Suggest prompt optimizations based on feedback analysis
   */
  private async suggestOptimizations(
    templateId: string, 
    analysis: { commonIssues: string[]; averageRating: number }
  ): Promise<void> {
    const template = promptTemplateEngine['templates'].get(templateId);
    if (!template) return;

    const optimizations: PromptOptimization[] = [];

    // Suggest optimizations based on common issues
    if (analysis.commonIssues.includes('accuracy')) {
      optimizations.push({
        templateId,
        optimizationType: 'instruction_clarification',
        changes: {
          before: template.template,
          after: this.addAccuracyInstructions(template.template),
          reasoning: 'Low accuracy scores suggest need for clearer instructions'
        },
        expectedImprovement: 0.15
      });
    }

    if (analysis.commonIssues.includes('tone')) {
      optimizations.push({
        templateId,
        optimizationType: 'personality_adjustment',
        changes: {
          before: template.template,
          after: this.adjustToneInstructions(template.template),
          reasoning: 'Tone feedback indicates need for personality adjustments'
        },
        expectedImprovement: 0.12
      });
    }

    if (analysis.commonIssues.includes('completeness')) {
      optimizations.push({
        templateId,
        optimizationType: 'structure_improvement',
        changes: {
          before: template.template,
          after: this.addCompletenessStructure(template.template),
          reasoning: 'Incomplete responses suggest need for better structure'
        },
        expectedImprovement: 0.18
      });
    }

    // Store optimizations for testing
    this.optimizationHistory.push(...optimizations);

    console.log(`💡 Suggested ${optimizations.length} optimizations for template ${templateId}`);
  }

  /**
   * Test prompt optimizations with A/B testing
   */
  async testOptimizations(templateId: string): Promise<PromptOptimization[]> {
    const optimizations = this.optimizationHistory.filter(o => o.templateId === templateId);
    
    for (const optimization of optimizations) {
      // Create test version of template
      const testTemplate = await this.createTestTemplate(templateId, optimization);
      
      // Run A/B test
      const testResults = await this.runABTest(templateId, testTemplate.id);
      
      // Update optimization with results
      optimization.testResults = testResults;
      
      // Apply optimization if it shows improvement
      if (testResults.user_satisfaction > 4.0 && testResults.accuracy > 0.85) {
        await this.applyOptimization(optimization);
      }
    }

    return optimizations;
  }

  /**
   * Apply successful optimization to the template
   */
  private async applyOptimization(optimization: PromptOptimization): Promise<void> {
    // This would update the actual template in the system
    console.log(`✅ Applied optimization to template ${optimization.templateId}: ${optimization.optimizationType}`);
  }

  /**
   * Add accuracy-focused instructions to template
   */
  private addAccuracyInstructions(template: string): string {
    return template + `

**Accuracy Guidelines:**
- Double-check all facts and figures before responding
- If uncertain about any information, clearly state your uncertainty
- Provide sources or references when possible
- Use precise language and avoid vague statements
- Verify calculations and data interpretations`;
  }

  /**
   * Adjust tone instructions in template
   */
  private adjustToneInstructions(template: string): string {
    return template + `

**Tone Guidelines:**
- Match your tone to the user's emotional state
- Use appropriate formality level for the context
- Be warm and approachable while maintaining professionalism
- Show empathy and understanding
- Use positive, solution-oriented language`;
  }

  /**
   * Add completeness structure to template
   */
  private addCompletenessStructure(template: string): string {
    return template + `

**Completeness Checklist:**
- Address all aspects of the user's question
- Provide actionable next steps
- Include relevant examples or analogies
- Offer additional resources or support
- Ensure the response fully resolves the user's need`;
  }

  /**
   * Create test template for optimization
   */
  private async createTestTemplate(
    originalTemplateId: string, 
    optimization: PromptOptimization
  ): Promise<PromptTemplate> {
    // This would create a test version of the template
    // For now, return a placeholder
    return {
      id: `${originalTemplateId}_test_${Date.now()}`,
      name: `Test: ${optimization.optimizationType}`,
      description: 'Test template for optimization',
      category: 'system',
      version: 'test',
      template: optimization.changes.after,
      variables: [],
      metadata: {
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        author: 'FineTuningService',
        tags: ['test', 'optimization']
      }
    };
  }

  /**
   * Run A/B test between original and optimized template
   */
  private async runABTest(originalTemplateId: string, testTemplateId: string): Promise<{
    accuracy: number;
    user_satisfaction: number;
    response_time: number;
  }> {
    // This would run actual A/B tests
    // For now, return mock results
    return {
      accuracy: 0.88,
      user_satisfaction: 4.3,
      response_time: 1.7
    };
  }

  /**
   * Get optimization recommendations for a template
   */
  getOptimizationRecommendations(templateId: string): {
    priority: 'high' | 'medium' | 'low';
    recommendations: string[];
    expectedImpact: number;
  } {
    const templateFeedback = this.fineTuningData.filter(d => d.templateId === templateId);
    
    if (templateFeedback.length === 0) {
      return {
        priority: 'low',
        recommendations: ['Collect more feedback data'],
        expectedImpact: 0
      };
    }

    const averageRating = templateFeedback.reduce((sum, d) => sum + d.feedback.rating, 0) / templateFeedback.length;
    
    let priority: 'high' | 'medium' | 'low' = 'low';
    let recommendations: string[] = [];
    let expectedImpact = 0;

    if (averageRating < 3.5) {
      priority = 'high';
      recommendations = [
        'Review and rewrite core instructions',
        'Add more specific examples',
        'Improve personality trait balance',
        'Test with different user personas'
      ];
      expectedImpact = 0.3;
    } else if (averageRating < 4.0) {
      priority = 'medium';
      recommendations = [
        'Fine-tune personality traits',
        'Add few-shot examples',
        'Improve response structure',
        'Optimize for specific use cases'
      ];
      expectedImpact = 0.2;
    } else {
      priority = 'low';
      recommendations = [
        'Monitor performance trends',
        'Collect more diverse feedback',
        'Consider minor adjustments'
      ];
      expectedImpact = 0.1;
    }

    return {
      priority,
      recommendations,
      expectedImpact
    };
  }

  /**
   * Export fine-tuning data for analysis
   */
  exportFineTuningData(): {
    feedback: FineTuningData[];
    optimizations: PromptOptimization[];
    summary: {
      totalFeedback: number;
      averageRating: number;
      optimizationCount: number;
      successfulOptimizations: number;
    };
  } {
    const totalFeedback = this.fineTuningData.length;
    const averageRating = totalFeedback > 0 
      ? this.fineTuningData.reduce((sum, d) => sum + d.feedback.rating, 0) / totalFeedback 
      : 0;
    
    const optimizationCount = this.optimizationHistory.length;
    const successfulOptimizations = this.optimizationHistory.filter(
      o => o.testResults && o.testResults.user_satisfaction > 4.0
    ).length;

    return {
      feedback: this.fineTuningData,
      optimizations: this.optimizationHistory,
      summary: {
        totalFeedback,
        averageRating,
        optimizationCount,
        successfulOptimizations
      }
    };
  }
}

// Export singleton instance
export const promptFineTuningService = PromptFineTuningService.getInstance();
