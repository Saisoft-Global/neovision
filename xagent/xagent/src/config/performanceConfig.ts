/**
 * Performance Configuration
 * Control which features are enabled for response generation
 */

export interface PerformanceMode {
  name: string;
  label: string;
  description: string;
  features: {
    collectiveLearning: boolean;
    ragContext: boolean;
    vectorSearch: boolean;
    knowledgeGraph: boolean;
    journeyOrchestration: boolean;
    sourceCitation: boolean;
    proactiveSuggestions: boolean;
    learningRecording: boolean;
  };
  estimatedTime: string;
}

export const PERFORMANCE_MODES: Record<string, PerformanceMode> = {
  FAST: {
    name: 'fast',
    label: '⚡ Fast Mode',
    description: 'Quick responses without advanced features',
    features: {
      collectiveLearning: false,
      ragContext: false,
      vectorSearch: false,
      knowledgeGraph: false,
      journeyOrchestration: false,
      sourceCitation: false,
      proactiveSuggestions: false,
      learningRecording: false,
    },
    estimatedTime: '1-2 seconds',
  },
  
  BALANCED: {
    name: 'balanced',
    label: '⚖️ Balanced Mode',
    description: 'Essential features with good performance',
    features: {
      collectiveLearning: true,
      ragContext: true,
      vectorSearch: true,
      knowledgeGraph: false, // Skip knowledge graph
      journeyOrchestration: false, // Skip journey
      sourceCitation: true,
      proactiveSuggestions: false, // Skip suggestions
      learningRecording: true,
    },
    estimatedTime: '2-5 seconds',
  },
  
  FULL: {
    name: 'full',
    label: '🌟 Full Mode',
    description: 'All advanced features enabled',
    features: {
      collectiveLearning: true,
      ragContext: true,
      vectorSearch: true,
      knowledgeGraph: true,
      journeyOrchestration: true,
      sourceCitation: true,
      proactiveSuggestions: true,
      learningRecording: true,
    },
    estimatedTime: '5-15 seconds',
  },
};

export class PerformanceConfig {
  private static instance: PerformanceConfig;
  private currentMode: PerformanceMode = PERFORMANCE_MODES.BALANCED; // Default to balanced

  private constructor() {
    // Load from localStorage
    const savedMode = localStorage.getItem('agent-performance-mode');
    if (savedMode && PERFORMANCE_MODES[savedMode.toUpperCase()]) {
      this.currentMode = PERFORMANCE_MODES[savedMode.toUpperCase()];
    }
  }

  static getInstance(): PerformanceConfig {
    if (!PerformanceConfig.instance) {
      PerformanceConfig.instance = new PerformanceConfig();
    }
    return PerformanceConfig.instance;
  }

  getCurrentMode(): PerformanceMode {
    return this.currentMode;
  }

  setMode(modeName: string): void {
    const mode = PERFORMANCE_MODES[modeName.toUpperCase()];
    if (mode) {
      this.currentMode = mode;
      localStorage.setItem('agent-performance-mode', modeName.toLowerCase());
      console.log(`⚡ Performance mode changed to: ${mode.label}`);
      console.log(`   Estimated response time: ${mode.estimatedTime}`);
    }
  }

  isFeatureEnabled(feature: keyof PerformanceMode['features']): boolean {
    return this.currentMode.features[feature];
  }

  getAllModes(): PerformanceMode[] {
    return Object.values(PERFORMANCE_MODES);
  }
}

// Singleton instance
export const performanceConfig = PerformanceConfig.getInstance();


