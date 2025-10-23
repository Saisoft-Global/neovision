/**
 * Advanced Prompt System Entry Point
 * Initializes and exports all prompt-related services
 */

import { promptTemplateEngine } from './PromptTemplateEngine';
import { promptFineTuningService } from './PromptFineTuningService';
import { registerAdvancedPromptTemplates } from './AdvancedPromptTemplates';

// Initialize the advanced prompt system
export function initializeAdvancedPromptSystem(): void {
  try {
    // Register all advanced prompt templates
    registerAdvancedPromptTemplates();
    
    // Expose to window for BaseAgent access (browser compatibility)
    if (typeof window !== 'undefined') {
      (window as any).__promptTemplateEngine = promptTemplateEngine;
      (window as any).__promptFineTuningService = promptFineTuningService;
    }
    
    console.log('✅ Advanced prompt system initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize advanced prompt system:', error);
  }
}

// Export services
export {
  promptTemplateEngine,
  promptFineTuningService,
  registerAdvancedPromptTemplates
};

// Export types
export type {
  PromptTemplate,
  PromptContext,
  PromptVariable
} from './PromptTemplateEngine';

export type {
  FineTuningData,
  PromptOptimization
} from './PromptFineTuningService';
