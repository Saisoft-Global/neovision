# 🛠️ Dynamic Tools & Skills Framework

## Architecture Overview

Your understanding is correct! Here's the proper architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                        AGENT                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Core Intelligence Skills (always present)              │ │
│  │ - Natural Language Understanding                       │ │
│  │ - Reasoning, Context Retention, etc.                   │ │
│  └────────────────────────────────────────────────────────┘ │
│                          │                                   │
│                          ▼                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    TOOLS                                │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │ │
│  │  │ Email Tool   │  │ Salesforce   │  │ Calendar     │ │ │
│  │  │              │  │ Tool         │  │ Tool         │ │ │
│  │  │  ┌─────────┐ │  │  ┌─────────┐ │  │  ┌─────────┐ │ │ │
│  │  │  │ Skills  │ │  │  │ Skills  │ │  │  │ Skills  │ │ │ │
│  │  │  ├─────────┤ │  │  ├─────────┤ │  │  ├─────────┤ │ │ │
│  │  │  │parse    │ │  │  │query    │ │  │  │schedule │ │ │ │
│  │  │  │summarize│ │  │  │create   │ │  │  │find_slot│ │ │ │
│  │  │  │classify │ │  │  │update   │ │  │  │cancel   │ │ │ │
│  │  │  └────┬────┘ │  │  └────┬────┘ │  │  └────┬────┘ │ │ │
│  │  │       │      │  │       │      │  │       │      │ │ │
│  │  │  ┌────▼────┐ │  │  ┌────▼────┐ │  │  ┌────▼────┐ │ │ │
│  │  │  │Functions│ │  │  │Functions│ │  │  │Functions│ │ │ │
│  │  │  │(APIs)   │ │  │  │(APIs)   │ │  │  │(APIs)   │ │ │ │
│  │  │  └─────────┘ │  │  └─────────┘ │  │  └─────────┘ │ │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘ │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Definitions

### 1. Tool
A **tool** is an external system or integration that provides functionality.

**Examples**:
- Email Tool (Gmail, Outlook, SMTP)
- CRM Tool (Salesforce, HubSpot, Dynamics)
- Calendar Tool (Google Calendar, Outlook Calendar)
- Database Tool (PostgreSQL, MongoDB)
- File Storage Tool (S3, Google Drive)

**Properties**:
- Name
- Description
- Connection config (API keys, endpoints)
- Authentication method
- Available skills

### 2. Skill
A **skill** is a specific capability within a tool - something the agent can DO with that tool.

**Examples for Email Tool**:
- `parse_email` - Extract information from email
- `summarize_email` - Create summary of email content
- `classify_email` - Categorize email (urgent/normal/spam)
- `draft_reply` - Generate email response
- `send_email` - Send an email

**Examples for Salesforce Tool**:
- `query_leads` - Search for leads
- `create_lead` - Create new lead
- `update_opportunity` - Update opportunity status
- `get_account_info` - Retrieve account details
- `generate_sales_report` - Create sales reports

**Properties**:
- Name
- Description
- Tool it belongs to
- Input parameters
- Output format
- Function to execute

### 3. Function
The **function** is the actual executable code that calls the API and performs the action.

**Example**:
```typescript
async function parse_email(emailId: string): Promise<ParsedEmail> {
  // Call Gmail API
  // Extract sender, subject, body, attachments
  // Return structured data
}
```

---

## Implementation

### Core Types

```typescript
// Tool definition
interface Tool {
  id: string;
  name: string;
  description: string;
  type: 'email' | 'crm' | 'calendar' | 'database' | 'custom';
  config: ToolConfig;
  skills: ToolSkill[];
  isActive: boolean;
}

// Skill within a tool
interface ToolSkill {
  name: string;
  description: string;
  toolId: string; // Which tool this skill belongs to
  parameters: SkillParameter[];
  execute: (params: any) => Promise<any>; // The actual function
  requiredAuth?: string[]; // Required permissions
}

// Configuration for tool connection
interface ToolConfig {
  apiKey?: string;
  endpoint?: string;
  authType: 'oauth' | 'api_key' | 'basic';
  credentials?: Record<string, string>;
}

// Parameter definition for a skill
interface SkillParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required: boolean;
  default?: any;
}
```

---

## Example: Email Tool with Skills

```typescript
// Define the Email Tool
const emailTool: Tool = {
  id: 'gmail-tool-001',
  name: 'Gmail Email Tool',
  description: 'Integration with Gmail for email management',
  type: 'email',
  config: {
    authType: 'oauth',
    endpoint: 'https://gmail.googleapis.com',
    credentials: {
      clientId: process.env.GMAIL_CLIENT_ID,
      clientSecret: process.env.GMAIL_CLIENT_SECRET
    }
  },
  isActive: true,
  skills: [
    {
      name: 'parse_email',
      description: 'Extract structured information from an email',
      toolId: 'gmail-tool-001',
      parameters: [
        {
          name: 'emailId',
          type: 'string',
          description: 'Gmail message ID',
          required: true
        }
      ],
      execute: async (params) => {
        const { emailId } = params;
        // Call Gmail API
        const email = await gmailClient.getMessage(emailId);
        return {
          sender: email.from,
          subject: email.subject,
          body: email.body,
          date: email.date,
          attachments: email.attachments
        };
      }
    },
    {
      name: 'summarize_email',
      description: 'Create a concise summary of email content',
      toolId: 'gmail-tool-001',
      parameters: [
        {
          name: 'emailId',
          type: 'string',
          description: 'Gmail message ID',
          required: true
        },
        {
          name: 'maxLength',
          type: 'number',
          description: 'Maximum summary length',
          required: false,
          default: 100
        }
      ],
      execute: async (params) => {
        const { emailId, maxLength = 100 } = params;
        
        // 1. Get email content
        const email = await gmailClient.getMessage(emailId);
        
        // 2. Use LLM to summarize
        const summary = await llm.summarize(email.body, maxLength);
        
        return {
          summary,
          keyPoints: summary.keyPoints,
          sentiment: summary.sentiment
        };
      }
    },
    {
      name: 'identify_critical_email',
      description: 'Identify if email requires urgent attention',
      toolId: 'gmail-tool-001',
      parameters: [
        {
          name: 'emailId',
          type: 'string',
          description: 'Gmail message ID',
          required: true
        }
      ],
      execute: async (params) => {
        const { emailId } = params;
        
        // Get email
        const email = await gmailClient.getMessage(emailId);
        
        // Use LLM to analyze urgency
        const analysis = await llm.analyze({
          prompt: `Analyze this email for urgency and criticality:
          From: ${email.from}
          Subject: ${email.subject}
          Body: ${email.body}
          
          Determine:
          1. Is this critical? (yes/no)
          2. Urgency level (high/medium/low)
          3. Reason
          4. Suggested action
          `,
          context: { email }
        });
        
        return {
          isCritical: analysis.isCritical,
          urgency: analysis.urgency,
          reason: analysis.reason,
          suggestedAction: analysis.suggestedAction
        };
      }
    }
  ]
};
```

---

## Example: Salesforce Tool with Skills

```typescript
const salesforceTool: Tool = {
  id: 'salesforce-001',
  name: 'Salesforce CRM',
  description: 'Integration with Salesforce for CRM operations',
  type: 'crm',
  config: {
    authType: 'oauth',
    endpoint: 'https://yourinstance.salesforce.com',
    credentials: {
      clientId: process.env.SALESFORCE_CLIENT_ID,
      clientSecret: process.env.SALESFORCE_CLIENT_SECRET
    }
  },
  isActive: true,
  skills: [
    {
      name: 'query_leads',
      description: 'Search and retrieve leads from Salesforce',
      toolId: 'salesforce-001',
      parameters: [
        {
          name: 'criteria',
          type: 'object',
          description: 'Search criteria (status, company, etc.)',
          required: true
        },
        {
          name: 'limit',
          type: 'number',
          description: 'Max number of results',
          required: false,
          default: 10
        }
      ],
      execute: async (params) => {
        const { criteria, limit = 10 } = params;
        
        // Build SOQL query
        const query = buildSOQLQuery('Lead', criteria, limit);
        
        // Execute via Salesforce API
        const results = await salesforceClient.query(query);
        
        return results.records;
      }
    },
    {
      name: 'create_lead',
      description: 'Create a new lead in Salesforce',
      toolId: 'salesforce-001',
      parameters: [
        {
          name: 'leadData',
          type: 'object',
          description: 'Lead information (firstName, lastName, company, email, etc.)',
          required: true
        }
      ],
      execute: async (params) => {
        const { leadData } = params;
        
        // Create lead via Salesforce API
        const result = await salesforceClient.create('Lead', leadData);
        
        return {
          leadId: result.id,
          success: result.success,
          errors: result.errors
        };
      }
    },
    {
      name: 'update_opportunity',
      description: 'Update an existing opportunity',
      toolId: 'salesforce-001',
      parameters: [
        {
          name: 'opportunityId',
          type: 'string',
          description: 'Salesforce Opportunity ID',
          required: true
        },
        {
          name: 'updates',
          type: 'object',
          description: 'Fields to update',
          required: true
        }
      ],
      execute: async (params) => {
        const { opportunityId, updates } = params;
        
        const result = await salesforceClient.update('Opportunity', opportunityId, updates);
        
        return result;
      }
    },
    {
      name: 'analyze_pipeline',
      description: 'Analyze sales pipeline and generate insights',
      toolId: 'salesforce-001',
      parameters: [
        {
          name: 'timeframe',
          type: 'string',
          description: 'Timeframe for analysis (this_quarter, this_year, etc.)',
          required: false,
          default: 'this_quarter'
        }
      ],
      execute: async (params) => {
        const { timeframe = 'this_quarter' } = params;
        
        // Query opportunities
        const opportunities = await salesforceClient.query(`
          SELECT Amount, StageName, CloseDate, Probability
          FROM Opportunity
          WHERE CloseDate = ${timeframe}
        `);
        
        // Use LLM to analyze
        const analysis = await llm.analyze({
          prompt: `Analyze this sales pipeline data and provide insights:
          ${JSON.stringify(opportunities)}
          
          Provide:
          1. Total pipeline value
          2. Win rate prediction
          3. Top opportunities to focus on
          4. Risks and recommendations
          `,
          context: { opportunities }
        });
        
        return analysis;
      }
    }
  ]
};
```

---

## Dynamic Tool & Skill Registration

```typescript
class ToolRegistry {
  private tools: Map<string, Tool> = new Map();
  
  // Register a new tool
  registerTool(tool: Tool): void {
    this.tools.set(tool.id, tool);
    console.log(`✅ Tool registered: ${tool.name} with ${tool.skills.length} skills`);
  }
  
  // Get all tools
  getTools(): Tool[] {
    return Array.from(this.tools.values());
  }
  
  // Get a specific tool
  getTool(toolId: string): Tool | undefined {
    return this.tools.get(toolId);
  }
  
  // Get all skills across all tools
  getAllSkills(): ToolSkill[] {
    return Array.from(this.tools.values())
      .flatMap(tool => tool.skills);
  }
  
  // Get skills for a specific tool
  getToolSkills(toolId: string): ToolSkill[] {
    const tool = this.tools.get(toolId);
    return tool?.skills || [];
  }
  
  // Find skill by name
  findSkill(skillName: string): ToolSkill | undefined {
    for (const tool of this.tools.values()) {
      const skill = tool.skills.find(s => s.name === skillName);
      if (skill) return skill;
    }
    return undefined;
  }
  
  // Execute a skill
  async executeSkill(skillName: string, params: any): Promise<any> {
    const skill = this.findSkill(skillName);
    
    if (!skill) {
      throw new Error(`Skill not found: ${skillName}`);
    }
    
    // Validate parameters
    this.validateParameters(skill, params);
    
    // Execute
    try {
      const result = await skill.execute(params);
      return result;
    } catch (error) {
      console.error(`Skill execution failed: ${skillName}`, error);
      throw error;
    }
  }
  
  private validateParameters(skill: ToolSkill, params: any): void {
    for (const param of skill.parameters) {
      if (param.required && !(param.name in params)) {
        throw new Error(`Missing required parameter: ${param.name}`);
      }
    }
  }
}

// Global tool registry
export const toolRegistry = new ToolRegistry();
```

---

## Agent with Dynamic Tools

```typescript
class EnhancedAgent extends BaseAgent {
  private toolRegistry: ToolRegistry;
  private attachedTools: Set<string> = new Set();
  
  constructor(id: string, config: AgentConfig, toolRegistry: ToolRegistry) {
    super(id, config);
    this.toolRegistry = toolRegistry;
  }
  
  // Attach a tool to this agent
  attachTool(toolId: string): void {
    const tool = this.toolRegistry.getTool(toolId);
    if (!tool) {
      throw new Error(`Tool not found: ${toolId}`);
    }
    
    this.attachedTools.add(toolId);
    
    // Automatically add tool skills to agent
    for (const skill of tool.skills) {
      this.config.skills.push({
        name: skill.name,
        level: 5, // Tool skills are always expert level
        config: {
          toolId: tool.id,
          toolName: tool.name,
          description: skill.description
        }
      });
    }
    
    console.log(`✅ Tool attached: ${tool.name} (${tool.skills.length} skills added)`);
  }
  
  // Get all available skills (core + tool skills)
  getAvailableSkills(): string[] {
    return this.config.skills.map(s => s.name);
  }
  
  // Execute based on natural language prompt
  async executeFromPrompt(prompt: string, context: any = {}): Promise<any> {
    // 1. Use LLM to understand intent and determine which skill to use
    const intent = await this.analyzeIntent(prompt, context);
    
    // 2. Check if agent has the required skill
    const skill = this.findSkill(intent.skillName);
    if (!skill) {
      return {
        success: false,
        error: `Agent doesn't have skill: ${intent.skillName}`
      };
    }
    
    // 3. Extract parameters from prompt
    const params = await this.extractParameters(prompt, skill, context);
    
    // 4. Execute the skill
    try {
      const result = await this.toolRegistry.executeSkill(intent.skillName, params);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  private async analyzeIntent(prompt: string, context: any): Promise<{ skillName: string }> {
    // Use LLM to determine which skill to use
    const availableSkills = this.getAvailableSkills();
    
    const response = await createChatCompletion([
      {
        role: 'system',
        content: `You are an AI agent with the following skills: ${availableSkills.join(', ')}.
        Analyze the user's request and determine which skill to use.
        Respond with JSON: { "skillName": "skill_name" }`
      },
      {
        role: 'user',
        content: prompt
      }
    ], this.config.llm_config);
    
    return JSON.parse(response);
  }
  
  private async extractParameters(prompt: string, skill: ToolSkill, context: any): Promise<any> {
    // Use LLM to extract parameters from natural language
    const response = await createChatCompletion([
      {
        role: 'system',
        content: `Extract parameters for skill: ${skill.name}
        Required parameters: ${JSON.stringify(skill.parameters)}
        Context: ${JSON.stringify(context)}
        
        Return JSON with parameter values.`
      },
      {
        role: 'user',
        content: prompt
      }
    ], this.config.llm_config);
    
    return JSON.parse(response);
  }
  
  private findSkill(skillName: string): ToolSkill | undefined {
    return this.toolRegistry.findSkill(skillName);
  }
}
```

---

## Usage Example

```typescript
// 1. Register tools
toolRegistry.registerTool(emailTool);
toolRegistry.registerTool(salesforceTool);

// 2. Create agent
const agent = new EnhancedAgent('agent-001', {
  personality: { /* ... */ },
  skills: [], // Start with no tool skills
  knowledge_bases: [],
  llm_config: { /* ... */ }
}, toolRegistry);

// 3. Attach tools to agent
agent.attachTool('gmail-tool-001');
agent.attachTool('salesforce-001');

// Now agent has:
// - 5 core intelligence skills (auto-attached)
// - 3 email skills (from Gmail tool)
// - 4 Salesforce skills (from Salesforce tool)
// Total: 12 skills!

// 4. Execute with natural language
const result1 = await agent.executeFromPrompt(
  "Summarize the email from john@example.com about the Q4 project",
  { userId: 'user-123' }
);
// Agent automatically:
// - Determines to use 'summarize_email' skill
// - Extracts emailId from context
// - Calls Gmail API
// - Returns summary

const result2 = await agent.executeFromPrompt(
  "Create a lead for Acme Corp, contact is Jane Smith at jane@acme.com",
  {}
);
// Agent automatically:
// - Determines to use 'create_lead' skill
// - Extracts parameters (company, contact, email)
// - Calls Salesforce API
// - Returns lead ID
```

---

## Benefits of This Architecture

### ✅ Modularity
- Tools are independent, reusable components
- Easy to add new tools without changing agent code

### ✅ Dynamic Discovery
- Agents automatically get skills when tools are attached
- No manual skill management

### ✅ Natural Language Interface
- Users don't need to know skill names or parameters
- Agent understands intent and maps to appropriate skill

### ✅ Scalability
- Add unlimited tools and skills
- Tools can be shared across multiple agents

### ✅ Maintainability
- Tool logic is encapsulated
- Easy to update tool implementations

### ✅ Flexibility
- Mix and match tools for different agent types
- Same tool can be used by multiple agents

---

## Comparison

| Aspect | Simple Skills | Tools + Skills |
|--------|---------------|----------------|
| **Complexity** | Low | Higher |
| **Flexibility** | Limited | Very High |
| **Extensibility** | Manual | Automatic |
| **API Integration** | Manual coding | Built-in |
| **Natural Language** | Limited | Full support |
| **Reusability** | Low | High |

---

## When to Use What?

### Use Simple Skills When:
- Building a proof of concept
- Agent needs basic labeling/categorization
- No external API integration needed
- Small team, limited resources

### Use Tools + Skills When:
- Production system with multiple integrations
- Need to dynamically add capabilities
- Multiple agents sharing tools
- Natural language interface is critical
- Enterprise-grade requirements

---

Your understanding is spot-on! This Tools + Skills architecture is how production AI agent systems work.


