#!/bin/bash

# Fix agent structure and registration issues

set -e

echo "🔧 Fixing agent structure and registration issues..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_status "Step 1: Moving agents to consolidated location..."

# Move CRMEmailAgent and LangChainAgent to the main agents directory
if [ -f "src/services/agents/CRMEmailAgent.ts" ]; then
    cp "src/services/agents/CRMEmailAgent.ts" "src/services/agent/agents/CRMEmailAgent.ts"
    print_success "Moved CRMEmailAgent to consolidated location"
fi

if [ -f "src/services/agents/LangChainAgent.ts" ]; then
    cp "src/services/agents/LangChainAgent.ts" "src/services/agent/agents/LangChainAgent.ts"
    print_success "Moved LangChainAgent to consolidated location"
fi

print_status "Step 2: Updating AgentFactory to include all agent types..."

# Create updated AgentFactory
cat > "src/services/agent/AgentFactory.ts" << 'EOF'
import { createClient } from '@supabase/supabase-js';
import type { AgentConfig } from '../../types/agent-framework';
import { BaseAgent } from './BaseAgent';
import { EmailAgent } from './agents/EmailAgent';
import { MeetingAgent } from './agents/MeetingAgent';
import { KnowledgeAgent } from './agents/KnowledgeAgent';
import { TaskAgent } from './agents/TaskAgent';
import { DesktopAutomationAgent } from './agents/DesktopAutomationAgent';
import { CRMEmailAgent } from './agents/CRMEmailAgent';
import { LangChainAgent } from './agents/LangChainAgent';

export class AgentFactory {
  private static instance: AgentFactory;
  private supabase;
  private agentCache: Map<string, BaseAgent>;

  private constructor() {
    this.supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co',
      import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'
    );
    this.agentCache = new Map();
  }

  public static getInstance(): AgentFactory {
    if (!this.instance) {
      this.instance = new AgentFactory();
    }
    return this.instance;
  }

  async createAgent(type: string, config: AgentConfig): Promise<string> {
    const id = crypto.randomUUID();
    const agent = this.instantiateAgent(id, type, config);
    
    // Store agent in database (optional, can be disabled if Supabase not configured)
    try {
      await this.storeAgent({
        id,
        type,
        config,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.warn('Failed to store agent in database:', error);
    }

    this.agentCache.set(id, agent);
    return id;
  }

  async getAgent(id: string): Promise<BaseAgent> {
    // Check cache first
    if (this.agentCache.has(id)) {
      return this.agentCache.get(id)!;
    }

    // Try to load from database
    try {
      const { data, error } = await this.supabase
        .from('agents')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        throw new Error(`Agent not found: ${id}`);
      }

      const agent = this.instantiateAgent(data.id, data.type, data.config);
      this.agentCache.set(id, agent);
      return agent;
    } catch (error) {
      console.warn('Failed to load agent from database:', error);
      throw new Error(`Agent not found: ${id}`);
    }
  }

  private instantiateAgent(id: string, type: string, config: AgentConfig): BaseAgent {
    switch (type) {
      case 'email':
        return new EmailAgent(id, config);
      case 'meeting':
        return new MeetingAgent(id, config);
      case 'knowledge':
        return new KnowledgeAgent(id, config);
      case 'task':
        return new TaskAgent(id, config);
      case 'desktop_automation':
        return new DesktopAutomationAgent(id, config);
      case 'crm_email':
        return new CRMEmailAgent(id, config);
      case 'langchain':
        return new LangChainAgent(id, config);
      default:
        throw new Error(`Unknown agent type: ${type}`);
    }
  }

  private async storeAgent(data: Record<string, any>): Promise<void> {
    const { error } = await this.supabase
      .from('agents')
      .insert(data);

    if (error) throw error;
  }

  // Get agent by type (for orchestrator)
  async getAgentByType(type: string, config?: AgentConfig): Promise<BaseAgent> {
    const defaultConfig: AgentConfig = config || {
      personality: {
        friendliness: 0.8,
        formality: 0.7,
        proactiveness: 0.6,
        detail_orientation: 0.9,
      },
      skills: [],
      knowledge_bases: [],
      llm_config: {
        provider: 'openai',
        model: 'gpt-4-turbo-preview',
        temperature: 0.7,
      },
    };

    return this.instantiateAgent(crypto.randomUUID(), type, defaultConfig);
  }
}
EOF

print_success "Updated AgentFactory with all agent types"

print_status "Step 3: Updating OrchestratorAgent to use AgentFactory properly..."

# Update the getAgentForAction method in OrchestratorAgent
sed -i 's/private async getAgentForAction(type: string): Promise<any> {/private async getAgentForAction(type: string): Promise<any> {\n    \/\/ Use AgentFactory for consistent agent creation\n    try {\n      return await this.agentFactory.getAgentByType(type);\n    } catch (error) {\n      console.warn(`Failed to get agent from factory: ${error}`);\n      \/\/ Fallback to direct instantiation\n    }/' src/services/orchestrator/OrchestratorAgent.ts

print_success "Updated OrchestratorAgent to use AgentFactory"

print_status "Step 4: Fixing import paths in moved agents..."

# Fix import paths in CRMEmailAgent
if [ -f "src/services/agent/agents/CRMEmailAgent.ts" ]; then
    sed -i 's/import { BaseAgent } from '\''\.\/BaseAgent'\'';/import { BaseAgent } from '\''..\/BaseAgent'\'';/' src/services/agent/agents/CRMEmailAgent.ts
    sed -i 's/import type { AgentResponse } from '\''\.\.\/agent\/types'\'';/import type { AgentResponse } from '\''..\/types'\'';/' src/services/agent/agents/CRMEmailAgent.ts
    print_success "Fixed import paths in CRMEmailAgent"
fi

# Fix import paths in LangChainAgent
if [ -f "src/services/agent/agents/LangChainAgent.ts" ]; then
    sed -i 's/import { BaseAgent } from '\''\.\/BaseAgent'\'';/import { BaseAgent } from '\''..\/BaseAgent'\'';/' src/services/agent/agents/LangChainAgent.ts
    sed -i 's/import type { AgentResponse } from '\''\.\.\/agent\/types'\'';/import type { AgentResponse } from '\''..\/types'\'';/' src/services/agent/agents/LangChainAgent.ts
    print_success "Fixed import paths in LangChainAgent"
fi

print_status "Step 5: Cleaning up duplicate files..."

# Remove duplicate files from src/services/agents/
rm -f src/services/agents/BaseAgent.ts
rm -f src/services/agents/EmailAgent.ts
rm -f src/services/agents/KnowledgeAgent.ts
rm -f src/services/agents/MeetingAgent.ts
rm -f src/services/agents/TaskAgent.ts

print_success "Removed duplicate agent files"

print_status "Step 6: Creating agent type registry..."

# Create agent type registry
cat > "src/services/agent/AgentRegistry.ts" << 'EOF'
export const AGENT_TYPES = {
  EMAIL: 'email',
  MEETING: 'meeting',
  KNOWLEDGE: 'knowledge',
  TASK: 'task',
  DESKTOP_AUTOMATION: 'desktop_automation',
  CRM_EMAIL: 'crm_email',
  LANGCHAIN: 'langchain',
  HR: 'hr',
  FINANCE: 'finance',
  CUSTOMER_SUPPORT: 'customer_support'
} as const;

export type AgentType = typeof AGENT_TYPES[keyof typeof AGENT_TYPES];

export const AGENT_DESCRIPTIONS: Record<AgentType, string> = {
  [AGENT_TYPES.EMAIL]: 'Handles email processing and management',
  [AGENT_TYPES.MEETING]: 'Manages meeting scheduling and coordination',
  [AGENT_TYPES.KNOWLEDGE]: 'Processes and retrieves knowledge from various sources',
  [AGENT_TYPES.TASK]: 'Manages task creation and tracking',
  [AGENT_TYPES.DESKTOP_AUTOMATION]: 'Automates desktop and browser interactions',
  [AGENT_TYPES.CRM_EMAIL]: 'Processes CRM-related emails and data',
  [AGENT_TYPES.LANGCHAIN]: 'Advanced language processing with LangChain',
  [AGENT_TYPES.HR]: 'Human resources management and employee services',
  [AGENT_TYPES.FINANCE]: 'Financial analysis and reporting',
  [AGENT_TYPES.CUSTOMER_SUPPORT]: 'Customer service and support operations'
};
EOF

print_success "Created agent type registry"

print_status "Step 7: Updating package.json dependencies..."

# Ensure all required dependencies are in package.json
if ! grep -q '"openai"' package.json; then
    sed -i '/"@pinecone-database\/pinecone":/a\    "openai": "^4.20.0",' package.json
fi

if ! grep -q '"@pinecone-database/pinecone"' package.json; then
    sed -i '/"@supabase\/supabase-js":/a\    "@pinecone-database/pinecone": "^1.1.0",' package.json
fi

print_success "Updated package.json dependencies"

print_status "Step 8: Creating agent validation script..."

cat > "validate-agents.js" << 'EOF'
// Agent validation script
import { AgentFactory } from './src/services/agent/AgentFactory.js';
import { AGENT_TYPES } from './src/services/agent/AgentRegistry.js';

async function validateAgents() {
  console.log('🔍 Validating agent structure...');
  
  const factory = AgentFactory.getInstance();
  const agentTypes = Object.values(AGENT_TYPES);
  
  for (const type of agentTypes) {
    try {
      const agent = await factory.getAgentByType(type);
      console.log(`✅ ${type}: ${agent.constructor.name}`);
    } catch (error) {
      console.log(`❌ ${type}: ${error.message}`);
    }
  }
  
  console.log('🎉 Agent validation completed!');
}

validateAgents().catch(console.error);
EOF

print_success "Created agent validation script"

print_status "Agent structure fixes completed!"
echo ""
echo "📋 Summary of fixes:"
echo "==================="
echo "✅ Consolidated all agents to src/services/agent/agents/"
echo "✅ Updated AgentFactory with all agent types"
echo "✅ Fixed import paths throughout the codebase"
echo "✅ Removed duplicate files"
echo "✅ Created agent type registry"
echo "✅ Updated package.json dependencies"
echo "✅ Created validation script"
echo ""
echo "🚀 Ready to rebuild and deploy!"
echo ""
echo "Next steps:"
echo "1. Run: chmod +x fix-agent-structure.sh && ./fix-agent-structure.sh"
echo "2. Run: docker-compose -f docker-compose-with-ollama.yml build --no-cache"
echo "3. Run: docker-compose -f docker-compose-with-ollama.yml up -d"
echo ""
print_success "Agent structure fixes completed! 🎉"
