# 📋 **TERMINOLOGY STANDARDIZATION - IMPLEMENTATION PLAN**

## 🎯 **APPROVED TERMINOLOGY:**

```
🤖 AGENT       - The AI entity
🎯 ROLE        - Agent's specialization/domain
💪 CAPABILITY  - High-level ability (user-facing)
🛠️ SKILL       - Specific competency (technical)
🔧 TOOL        - Software component
⚡ FUNCTION    - Executable action
🔌 INTEGRATION - External connection
```

---

## 📊 **CODE CHANGES REQUIRED:**

### **PHASE 1: Type Definitions** ⚡ HIGH PRIORITY

#### **1.1 Update `src/types/agent-framework.ts`**

**Current:**
```typescript
export interface AgentConfig {
  name?: string;
  type?: string;
  skills: AgentSkill[];
  // ...
}

export interface AgentSkill {
  name: string;
  level: number;
  // ...
}
```

**CHANGE TO:**
```typescript
export interface AgentConfig {
  name: string;                    // Agent name
  role: AgentRole;                 // NEW: Agent's specialization
  type?: string;                   // DEPRECATED: Use 'role' instead
  capabilities: AgentCapability[]; // NEW: High-level abilities
  skills: AgentSkill[];            // Technical competencies
  tools?: AgentTool[];             // NEW: Explicit tool list
  // ...
}

export interface AgentRole {
  id: string;                      // e.g., 'hr_specialist'
  name: string;                    // e.g., 'HR Specialist'
  domain: string;                  // e.g., 'Human Resources'
  description: string;
  systemPrompt: string;
}

export interface AgentCapability {
  id: string;                      // e.g., 'vendor_communication'
  name: string;                    // e.g., 'Vendor Communication'
  description: string;             // User-facing description
  requiredSkills: string[];        // Skills needed
  requiredTools?: string[];        // Tools needed
  requiredWorkflows?: string[];    // Workflows needed
  isAvailable: boolean;            // Can agent perform this?
}

export interface AgentSkill {
  name: string;                    // e.g., 'email_management'
  level: number;                   // 1-5 proficiency
  category?: string;               // e.g., 'Communication'
  description?: string;
  mapsToTool?: string;             // Which tool provides this
}

export interface AgentTool {
  id: string;                      // e.g., 'email_tool'
  name: string;                    // e.g., 'Email Tool'
  type: 'local' | 'api' | 'integration';
  functions: AgentFunction[];      // Available functions
  isAvailable: boolean;
}

export interface AgentFunction {
  id: string;                      // e.g., 'send_email'
  name: string;                    // e.g., 'Send Email'
  description: string;
  parameters: FunctionParameter[];
  returnType: string;
  implementation: string;          // Function name or API endpoint
}

export interface AgentIntegration {
  id: string;                      // e.g., 'salesforce_crm'
  name: string;                    // e.g., 'Salesforce CRM'
  type: 'api' | 'webhook' | 'oauth';
  provider: string;                // e.g., 'salesforce'
  endpoint?: string;
  authentication: {
    type: 'api_key' | 'oauth' | 'basic';
    credentials?: Record<string, string>;
  };
  isConnected: boolean;
}
```

---

### **PHASE 2: Database Schema** ⚡ HIGH PRIORITY

#### **2.1 Create Migration: `enhance_agent_terminology.sql`**

```sql
-- Add new columns for role-based architecture
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS role JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS capabilities JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS tools JSONB DEFAULT '[]'::jsonb;

-- Create roles table
CREATE TABLE IF NOT EXISTS agent_roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT,
  default_skills JSONB DEFAULT '[]'::jsonb,
  default_capabilities JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create capabilities table
CREATE TABLE IF NOT EXISTS agent_capabilities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  required_skills JSONB DEFAULT '[]'::jsonb,
  required_tools JSONB DEFAULT '[]'::jsonb,
  required_workflows JSONB DEFAULT '[]'::jsonb,
  execution_strategy TEXT DEFAULT 'auto',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create tools table
CREATE TABLE IF NOT EXISTS agent_tools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  functions JSONB DEFAULT '[]'::jsonb,
  configuration JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create integrations table
CREATE TABLE IF NOT EXISTS agent_integrations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  type TEXT NOT NULL,
  endpoint TEXT,
  authentication JSONB DEFAULT '{}'::jsonb,
  is_connected BOOLEAN DEFAULT false,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default roles
INSERT INTO agent_roles (id, name, domain, description, system_prompt) VALUES
('hr_specialist', 'HR Specialist', 'Human Resources', 'Employee support and HR management', 'You are an HR specialist...'),
('finance_analyst', 'Finance Analyst', 'Finance', 'Financial analysis and management', 'You are a finance analyst...'),
('procurement_manager', 'Procurement Manager', 'Procurement', 'Vendor and purchase management', 'You are a procurement manager...'),
('support_specialist', 'Support Specialist', 'Customer Support', 'Customer issue resolution', 'You are a support specialist...'),
('knowledge_expert', 'Knowledge Expert', 'Knowledge Management', 'Information retrieval and Q&A', 'You are a knowledge expert...')
ON CONFLICT (id) DO NOTHING;

-- Insert default capabilities
INSERT INTO agent_capabilities (id, name, description, category, required_skills) VALUES
('vendor_communication', 'Vendor Communication', 'Communicate with vendors via email', 'Procurement', '["email_management", "vendor_management"]'::jsonb),
('purchase_order_management', 'Purchase Order Management', 'Create and manage purchase orders', 'Procurement', '["purchase_order_processing", "document_analysis"]'::jsonb),
('employee_onboarding', 'Employee Onboarding', 'Onboard new employees', 'HR', '["employee_onboarding", "document_analysis", "email_management"]'::jsonb),
('invoice_processing', 'Invoice Processing', 'Process and validate invoices', 'Finance', '["invoice_processing", "document_analysis", "ocr_processing"]'::jsonb)
ON CONFLICT (id) DO NOTHING;
```

---

### **PHASE 3: Service Layer** ⚡ MEDIUM PRIORITY

#### **3.1 Create `RoleManager.ts`**

```typescript
// src/services/agent/RoleManager.ts

export class RoleManager {
  private static instance: RoleManager;
  private supabase;
  
  async getRole(roleId: string): Promise<AgentRole> {
    // Load role from database
  }
  
  async getRoleCapabilities(roleId: string): Promise<AgentCapability[]> {
    // Get default capabilities for role
  }
  
  async getRoleSkills(roleId: string): Promise<AgentSkill[]> {
    // Get default skills for role
  }
}
```

#### **3.2 Enhance `CapabilityManager.ts`**

**Current:**
```typescript
async discoverCapabilities(): Promise<Map<string, AgentCapability>>
```

**ENHANCE TO:**
```typescript
async discoverCapabilities(): Promise<Map<string, AgentCapability>> {
  // 1. Load role-based capabilities
  const roleCapabilities = await this.getRoleCapabilities();
  
  // 2. Discover skill-based capabilities
  const skillCapabilities = await this.discoverFromSkills();
  
  // 3. Discover tool-based capabilities
  const toolCapabilities = await this.discoverFromTools();
  
  // 4. Discover workflow-based capabilities
  const workflowCapabilities = await this.discoverFromWorkflows();
  
  // 5. Merge and return
  return this.mergeCapabilities([
    roleCapabilities,
    skillCapabilities,
    toolCapabilities,
    workflowCapabilities
  ]);
}
```

#### **3.3 Create `ToolManager.ts`**

```typescript
// src/services/agent/ToolManager.ts

export class ToolManager {
  async discoverToolsForSkills(skills: AgentSkill[]): Promise<AgentTool[]> {
    // Map skills to tools
    const toolMap = {
      'email_management': 'EmailTool',
      'vendor_management': 'CRMTool',
      'document_analysis': 'DocumentTool',
      'invoice_processing': 'FinanceTool',
      // ...
    };
    
    // Load required tools
    const tools = await this.loadTools(skills.map(s => toolMap[s.name]));
    return tools;
  }
  
  async getToolFunctions(toolId: string): Promise<AgentFunction[]> {
    // Get all functions provided by tool
  }
}
```

#### **3.4 Create `IntegrationManager.ts`**

```typescript
// src/services/agent/IntegrationManager.ts

export class IntegrationManager {
  async getAvailableIntegrations(userId: string): Promise<AgentIntegration[]> {
    // Load user's connected integrations
  }
  
  async connectIntegration(integration: AgentIntegration): Promise<boolean> {
    // Connect to external system
  }
  
  async testIntegration(integrationId: string): Promise<boolean> {
    // Test connection
  }
}
```

---

### **PHASE 4: UI Components** ⚡ HIGH PRIORITY

#### **4.1 Create `RoleSelector.tsx`**

```typescript
// src/components/agent-builder/RoleSelector.tsx

export const RoleSelector: React.FC = ({ selectedRole, onSelect }) => {
  const roles = [
    { id: 'hr_specialist', name: 'HR Specialist', icon: Users },
    { id: 'finance_analyst', name: 'Finance Analyst', icon: DollarSign },
    { id: 'procurement_manager', name: 'Procurement Manager', icon: ShoppingCart },
    { id: 'support_specialist', name: 'Support Specialist', icon: Headphones },
    { id: 'knowledge_expert', name: 'Knowledge Expert', icon: Brain },
  ];
  
  return (
    <div>
      <h2>Select Agent Role</h2>
      {roles.map(role => (
        <RoleCard 
          key={role.id}
          role={role}
          selected={selectedRole === role.id}
          onClick={() => onSelect(role.id)}
        />
      ))}
    </div>
  );
};
```

#### **4.2 Create `CapabilitySelector.tsx`**

```typescript
// src/components/agent-builder/CapabilitySelector.tsx

export const CapabilitySelector: React.FC = ({ 
  selectedCapabilities, 
  onSelect,
  agentRole 
}) => {
  // Load capabilities for selected role
  const capabilities = useCapabilitiesForRole(agentRole);
  
  return (
    <div>
      <h2>Choose Capabilities</h2>
      <p>What should this agent be able to do?</p>
      
      {capabilities.map(capability => (
        <CapabilityCard
          key={capability.id}
          capability={capability}
          selected={selectedCapabilities.includes(capability.id)}
          onClick={() => onSelect(capability.id)}
          requiredSkills={capability.requiredSkills}
          requiredTools={capability.requiredTools}
        />
      ))}
    </div>
  );
};
```

#### **4.3 Enhance `AgentBuilder.tsx`**

```typescript
// New flow:
1. Select Role (HR, Finance, Procurement, etc.)
    ↓
2. Choose Capabilities (high-level, user-friendly)
    ↓
3. System auto-selects required skills
    ↓
4. (Advanced) Fine-tune skills
    ↓
5. (Advanced) Link workflows
    ↓
6. (Advanced) Configure integrations
    ↓
7. Save Agent
```

---

### **PHASE 5: Agent Initialization** ⚡ HIGH PRIORITY

#### **5.1 Enhance `BaseAgent.ts`**

```typescript
export abstract class BaseAgent {
  protected id: string;
  protected config: AgentConfig;
  protected role: AgentRole;              // NEW
  protected capabilities: AgentCapability[]; // ENHANCED
  protected skills: AgentSkill[];         // Existing
  protected tools: AgentTool[];           // NEW
  protected integrations: AgentIntegration[]; // NEW
  
  // RAG Components
  protected vectorSearch: VectorSearchService;
  protected knowledgeGraph: KnowledgeGraphManager;
  protected memoryService: MemoryService;
  
  constructor(id: string, config: AgentConfig) {
    this.id = id;
    this.config = config;
    
    // Initialize new components
    this.initializeRole();
    this.initializeCapabilities();
    this.initializeTools();
    this.initializeIntegrations();
    
    // Existing initialization
    this.initializeRAG();
  }
  
  private async initializeRole(): Promise<void> {
    this.role = await RoleManager.getInstance().getRole(this.config.role);
  }
  
  private async initializeCapabilities(): Promise<void> {
    // Discover capabilities from role + skills + tools
    this.capabilities = await CapabilityManager.getInstance()
      .discoverCapabilities(this.id, this.config);
  }
  
  private async initializeTools(): Promise<void> {
    // Load tools based on skills
    this.tools = await ToolManager.getInstance()
      .discoverToolsForSkills(this.config.skills);
  }
  
  private async initializeIntegrations(): Promise<void> {
    // Load available integrations
    this.integrations = await IntegrationManager.getInstance()
      .getAvailableIntegrations(this.config.userId);
  }
}
```

---

### **PHASE 6: Discovery & Mapping** ⚡ HIGH PRIORITY

#### **6.1 Skill → Tool Mapping**

```typescript
// src/services/agent/SkillToolMapper.ts

export const SKILL_TOOL_MAP: Record<string, string[]> = {
  // Communication Skills → Tools
  'email_management': ['EmailTool'],
  'email_drafting': ['EmailTool'],
  'email_classification': ['EmailTool'],
  
  // Document Skills → Tools
  'document_analysis': ['DocumentTool', 'OCRProcessor'],
  'pdf_processing': ['DocumentTool'],
  'ocr_processing': ['OCRProcessor'],
  
  // Knowledge Skills → Tools
  'knowledge_retrieval': ['VectorSearchService', 'KnowledgeGraphManager'],
  'semantic_search': ['VectorSearchService'],
  
  // Procurement Skills → Tools
  'vendor_management': ['CRMTool', 'EmailTool'],
  'purchase_order_processing': ['DocumentTool', 'FinanceTool'],
  'supplier_evaluation': ['CRMTool', 'AnalyticsTool'],
  'contract_management': ['DocumentTool', 'LegalTool'],
  
  // Finance Skills → Tools
  'invoice_processing': ['FinanceTool', 'OCRProcessor'],
  'expense_management': ['FinanceTool'],
  'financial_analysis': ['FinanceTool', 'AnalyticsTool'],
  
  // Integration Skills → Tools
  'api_integration': ['APIConnector'],
  'workflow_automation': ['WorkflowExecutor'],
};
```

#### **6.2 Capability → Skill Mapping**

```typescript
// src/services/agent/CapabilitySkillMapper.ts

export const CAPABILITY_SKILL_MAP: Record<string, {
  requiredSkills: string[];
  optionalSkills: string[];
  requiredTools: string[];
  requiredWorkflows?: string[];
}> = {
  // Procurement Capabilities
  'vendor_communication': {
    requiredSkills: ['email_management', 'vendor_management'],
    optionalSkills: ['knowledge_retrieval'],
    requiredTools: ['EmailTool', 'CRMTool'],
  },
  
  'purchase_order_management': {
    requiredSkills: ['purchase_order_processing', 'document_analysis'],
    optionalSkills: ['financial_analysis'],
    requiredTools: ['DocumentTool', 'FinanceTool'],
    requiredWorkflows: ['purchase_request_workflow'],
  },
  
  'supplier_evaluation': {
    requiredSkills: ['supplier_evaluation', 'data_analysis'],
    optionalSkills: ['financial_analysis'],
    requiredTools: ['CRMTool', 'AnalyticsTool'],
  },
  
  // HR Capabilities
  'employee_onboarding': {
    requiredSkills: ['employee_onboarding', 'document_analysis', 'email_management'],
    optionalSkills: ['knowledge_retrieval'],
    requiredTools: ['EmailTool', 'DocumentTool', 'OCRProcessor'],
    requiredWorkflows: ['employee_onboarding_workflow'],
  },
  
  // Finance Capabilities
  'invoice_processing': {
    requiredSkills: ['invoice_processing', 'document_analysis', 'ocr_processing'],
    optionalSkills: ['financial_analysis'],
    requiredTools: ['FinanceTool', 'DocumentTool', 'OCRProcessor'],
  },
  
  // ... more capabilities
};
```

---

### **PHASE 7: UI Enhancements** ⚡ MEDIUM PRIORITY

#### **7.1 New Agent Builder Flow**

```typescript
// src/components/agent-builder/EnhancedAgentBuilder.tsx

export const EnhancedAgentBuilder: React.FC = () => {
  const [step, setStep] = useState(1);
  
  return (
    <div>
      {/* Step 1: Select Role */}
      {step === 1 && (
        <RoleSelector 
          onSelect={(role) => {
            setConfig({ role });
            setStep(2);
          }}
        />
      )}
      
      {/* Step 2: Choose Capabilities */}
      {step === 2 && (
        <CapabilitySelector
          role={config.role}
          onSelect={(capabilities) => {
            // Auto-select required skills
            const skills = autoSelectSkills(capabilities);
            setConfig({ capabilities, skills });
            setStep(3);
          }}
        />
      )}
      
      {/* Step 3: Fine-tune Skills (Advanced) */}
      {step === 3 && (
        <SkillsConfigurator
          skills={config.skills}
          onChange={(skills) => {
            setConfig({ skills });
            setStep(4);
          }}
        />
      )}
      
      {/* Step 4: Configure Integrations (Optional) */}
      {step === 4 && (
        <IntegrationConfigurator
          integrations={availableIntegrations}
          onSelect={(integrations) => {
            setConfig({ integrations });
            setStep(5);
          }}
        />
      )}
      
      {/* Step 5: Review & Save */}
      {step === 5 && (
        <AgentReview
          config={config}
          onSave={saveAgent}
        />
      )}
    </div>
  );
};
```

---

### **PHASE 8: Documentation** ⚡ LOW PRIORITY

#### **8.1 Update All Documentation**

Files to update:
- README.md
- QUICK_START_GUIDE.md
- AGENT_BUILDER_GUIDE.md
- API_DOCUMENTATION.md

Replace:
- "Agent type" → "Agent role"
- "Agent skills" → Use context (capabilities vs skills)
- Add capability examples

---

## 📊 **IMPLEMENTATION PRIORITY:**

### **🔴 CRITICAL (Do First):**

1. ✅ **Type Definitions** (`agent-framework.ts`)
   - Add Role, Capability, Tool, Integration types
   - Maintain backward compatibility

2. ✅ **Database Schema** (`enhance_agent_terminology.sql`)
   - Add new tables
   - Migrate existing data
   - Add default roles & capabilities

3. ✅ **BaseAgent Enhancement**
   - Add role, capabilities, tools, integrations
   - Initialize new components
   - Maintain existing functionality

### **🟡 IMPORTANT (Do Second):**

4. ✅ **Mapping Services**
   - SkillToolMapper
   - CapabilitySkillMapper
   - RoleManager

5. ✅ **UI Components**
   - RoleSelector
   - CapabilitySelector
   - Enhanced AgentBuilder

### **🟢 NICE TO HAVE (Do Third):**

6. ✅ **Integration Manager**
   - Connect external systems
   - Test connections
   - Manage credentials

7. ✅ **Documentation**
   - Update terminology
   - Add examples
   - Create guides

---

## 🚀 **IMPLEMENTATION TIMELINE:**

```
Phase 1: Type Definitions (30 min)
├─► Update agent-framework.ts
├─► Add new interfaces
└─► Maintain backward compatibility

Phase 2: Database Schema (45 min)
├─► Create migration SQL
├─► Add new tables
├─► Insert default data
└─► Test migration

Phase 3: Service Layer (1-2 hours)
├─► RoleManager
├─► Enhanced CapabilityManager
├─► ToolManager
└─► IntegrationManager

Phase 4: UI Components (1-2 hours)
├─► RoleSelector
├─► CapabilitySelector
├─► Enhanced AgentBuilder
└─► Integration Configurator

Phase 5: Testing (30 min)
├─► Create test agents
├─► Verify capabilities
├─► Test RAG integration
└─► Validate workflows

Total: 4-6 hours
```

---

## 🎯 **BACKWARD COMPATIBILITY:**

```typescript
// Maintain old 'type' field for compatibility
export interface AgentConfig {
  type?: string;  // DEPRECATED but still supported
  role?: AgentRole; // NEW preferred way
  
  // If role is not set, derive from type
  get effectiveRole(): AgentRole {
    if (this.role) return this.role;
    return this.deriveRoleFromType(this.type);
  }
}
```

---

## 💡 **BENEFITS OF THIS CHANGE:**

### **For Users:**
```
✅ Clearer terminology
✅ Easier to understand
✅ Capability-focused (what agent can do)
✅ Less technical jargon
```

### **For Developers:**
```
✅ Clear architecture
✅ Better separation of concerns
✅ Easier to extend
✅ Maintainable codebase
```

### **For Agents:**
```
✅ Better capability discovery
✅ Automatic tool loading
✅ Smarter skill mapping
✅ Integration-ready
```

---

## 🎊 **NEXT STEPS:**

**Should I start implementing these changes?**

**Priority order:**
1. ✅ Update type definitions (30 min)
2. ✅ Create database migration (45 min)
3. ✅ Enhance BaseAgent (1 hour)
4. ✅ Update UI components (1-2 hours)
5. ✅ Test everything (30 min)

**Total: 4-6 hours for complete implementation**

**Want me to start now?** 🚀
