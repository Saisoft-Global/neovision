# 🤖 How AI Agents Automatically Know When to Use Tools

## 🎯 Your Question: How Does the Agent Know to Invoke Zoho Tools?

Great question! There are **3 mechanisms** that make agents intelligent about tool usage:

---

## 1️⃣ **Agent System Prompt (Automatic)**

### How It Works:
When you create an agent with tools enabled, the **system prompt** automatically includes information about available tools.

### Example:
```typescript
const invoiceAgent = await factory.createToolEnabledAgent(
  {
    name: 'Invoice Processing Agent',
    type: 'invoice_processor',
    // ... config
  },
  ['zoho-integration'] // ← Tools enabled for this agent
);
```

### What Happens Behind the Scenes:
The agent's system prompt becomes:

```
You are an Invoice Processing Agent.

AVAILABLE TOOLS:
1. Zoho Tool (zoho-integration)
   - extract_invoice_data: Extract structured invoice data from document text using AI
   - create_zoho_invoice: Create a new invoice in Zoho Books
   - search_invoices: Search for invoices by customer name, invoice number, status, or date
   - get_invoice_status: Get the status of a Zoho invoice
   - handle_natural_query: Handle natural language questions about invoices
   ... (all 10 skills)

When a user asks you to:
- Create an invoice → Use create_zoho_invoice
- Check invoice status → Use get_invoice_status or handle_natural_query
- Search invoices → Use search_invoices
- Upload a document to create invoice → Use document_to_invoice

IMPORTANT: When you need to perform these actions, call the appropriate tool.
```

### Code Location:
Check `src/services/agent/BaseAgent.ts` - the `buildSystemPrompt()` method:

```typescript
private buildSystemPrompt(context: AgentContext): string {
  let prompt = `You are ${this.config.name}, a ${this.config.type} agent.`;
  
  // Add available tools and skills
  if (this.config.capabilities?.includes('zoho_integration')) {
    const tools = this.getAvailableTools();
    prompt += `\n\nAVAILABLE TOOLS:\n`;
    tools.forEach(tool => {
      prompt += `- ${tool.name}:\n`;
      tool.skills.forEach(skill => {
        prompt += `  * ${skill.name}: ${skill.description}\n`;
      });
    });
  }
  
  return prompt;
}
```

---

## 2️⃣ **LLM Function Calling (OpenAI/GPT-4)**

### How It Works:
Modern LLMs like GPT-4 support **native function calling**. The agent automatically formats tools as functions.

### Example Request to LLM:
```json
{
  "model": "gpt-4",
  "messages": [
    {
      "role": "system",
      "content": "You are an Invoice Processing Agent..."
    },
    {
      "role": "user",
      "content": "Create an invoice for ABC Company for $5,000"
    }
  ],
  "functions": [
    {
      "name": "create_zoho_invoice",
      "description": "Create a new invoice in Zoho Books",
      "parameters": {
        "type": "object",
        "properties": {
          "invoiceData": {
            "type": "object",
            "description": "Invoice data structure",
            "properties": {
              "customer_name": {"type": "string"},
              "total_amount": {"type": "number"},
              "items": {"type": "array"}
            }
          }
        },
        "required": ["invoiceData"]
      }
    },
    {
      "name": "search_invoices",
      "description": "Search for invoices by customer name, invoice number, status, or date range",
      "parameters": {
        "type": "object",
        "properties": {
          "customer_name": {"type": "string"},
          "invoice_number": {"type": "string"},
          "status": {"type": "string"}
        }
      }
    }
    // ... all other skills as functions
  ],
  "function_call": "auto" // ← LLM decides when to call
}
```

### LLM Response (Automatic):
```json
{
  "role": "assistant",
  "function_call": {
    "name": "create_zoho_invoice",
    "arguments": {
      "invoiceData": {
        "customer_name": "ABC Company",
        "total_amount": 5000,
        "items": [
          {
            "item_name": "Service",
            "quantity": 1,
            "rate": 5000
          }
        ]
      }
    }
  }
}
```

The agent **automatically** calls the tool because GPT-4 understood the user's intent!

---

## 3️⃣ **Agent Reasoning Loop (ReAct Pattern)**

### How It Works:
Agents use the **ReAct (Reasoning + Acting)** pattern:

1. **Think** - Analyze the user's request
2. **Act** - Decide which tool to use
3. **Observe** - See the tool result
4. **Think** - Decide next step
5. **Respond** - Give user the answer

### Example Conversation Flow:

```
User: "Check if ABC Company has paid invoice INV-12345"

Agent Thinking: 
  "User wants to check payment status for a specific invoice.
   I need to:
   1. Search for invoice INV-12345
   2. Get payment history for that invoice
   I'll use search_invoices first."

Agent Action 1:
  → Call search_invoices(invoice_number="INV-12345")
  
Agent Observation 1:
  ← Result: Found invoice, invoice_id="INV-001"

Agent Thinking:
  "Good, I found the invoice. Now I need to check payments."

Agent Action 2:
  → Call get_payment_history(invoice_id="INV-001")
  
Agent Observation 2:
  ← Result: [Payment on 2025-10-20, $5,000, "Bank Transfer"]

Agent Response:
  "Yes, ABC Company has paid invoice INV-12345. 
   Payment of $5,000 was received on October 20, 2025 via Bank Transfer."
```

### Code Location:
Check `src/services/agent/BaseAgent.ts` - the `processMessage()` method:

```typescript
async processMessage(message: string, context: AgentContext): Promise<AgentResponse> {
  // Step 1: Analyze intent
  const intent = await this.analyzeIntent(message);
  
  // Step 2: Determine if tools are needed
  if (intent.requiresTools) {
    const tool = this.selectTool(intent.toolName);
    const skill = this.selectSkill(tool, intent.skillName);
    
    // Step 3: Execute tool
    const result = await tool.execute(skill.name, {
      parameters: intent.parameters,
      llmService: this.llmRouter,
      userId: context.userId,
      organizationId: context.organizationId,
    });
    
    // Step 4: Format response with result
    return this.formatResponse(result);
  }
  
  // No tools needed, just respond
  return this.generateResponse(message, context);
}
```

---

## 🎯 Putting It All Together

### Scenario: User Uploads Invoice Document

```typescript
User: *uploads PDF invoice*
User: "Create an invoice from this document"

// 1. Agent receives message with attachment
Agent System Prompt includes:
  "AVAILABLE TOOLS:
   - document_to_invoice: Complete workflow to create invoice from document"

// 2. LLM analyzes the request
LLM thinks: "User wants to create invoice from a document. 
             I should use document_to_invoice skill."

// 3. LLM decides to call function
LLM response: {
  function_call: {
    name: "document_to_invoice",
    arguments: {
      documentText: "[extracted text from PDF]"
    }
  }
}

// 4. Agent executes the tool
const result = await zohoTool.execute('document_to_invoice', {
  parameters: { documentText },
  llmService,
  userId,
  organizationId,
});

// 5. Agent formats response
Agent: "I've processed your invoice document and created invoice 
        INV-12345 in Zoho Books for $5,000. The invoice has been 
        sent to ABC Company."
```

---

## 🔧 How to Control Tool Usage

### Option 1: Explicit Instructions (Recommended)
```typescript
const agentConfig = {
  name: 'Invoice Agent',
  description: `You are an invoice processing agent.
  
  WHEN TO USE TOOLS:
  - User uploads document → use document_to_invoice
  - User asks "status of invoice" → use get_invoice_status or handle_natural_query
  - User asks "search invoices" → use search_invoices
  - User asks to send invoice → use send_invoice_email
  
  ALWAYS use tools for invoice operations. Don't try to answer without checking Zoho.`,
  // ...
}
```

### Option 2: Workflow Engine (Automated)
```json
{
  "workflow": "document-to-invoice",
  "trigger": "document_uploaded",
  "steps": [
    {
      "type": "tool_execution",
      "tool": "zoho-integration",
      "skill": "document_to_invoice",
      "auto_execute": true
    }
  ]
}
```

### Option 3: Agent Skills Configuration
```typescript
const agentConfig = {
  skills: [
    {
      name: 'invoice_processing',
      level: 5,
      category: 'business',
      preferred_tools: ['zoho-integration'], // ← Agent prefers Zoho
      auto_invoke: true, // ← Automatically use for invoice tasks
    }
  ]
}
```

---

## 🧠 Intelligence Behind Tool Selection

### The Agent Considers:

1. **User Intent**
   - Keywords: "create", "check", "search", "send"
   - Context: uploaded document, invoice number mentioned

2. **Tool Capabilities**
   - What tools are available?
   - Which tool skills match the intent?

3. **Skill Descriptions**
   - Each skill has a clear description
   - LLM reads these and matches to intent

4. **Context & History**
   - Previous conversation
   - What was just discussed

5. **Parameter Availability**
   - Does the agent have the data needed?
   - If not, ask user first

---

## 📝 Example: How Agent Decides

```
User Message: "What's the status of invoice INV-12345?"

Agent Analysis:
  Intent: CHECK_STATUS
  Keywords: ["status", "invoice", "INV-12345"]
  Available Tools: [zoho-integration]
  Matching Skills:
    - get_invoice_status (exact match)
    - handle_natural_query (can handle natural questions)
    - search_invoices (can find invoice first)
  
  Decision: Use handle_natural_query
  Reason: It's designed for exactly this type of question
  
  Parameters Extracted:
    query: "What's the status of invoice INV-12345?"

Agent Action:
  await zohoTool.execute('handle_natural_query', {
    parameters: { query: "What's the status of invoice INV-12345?" }
  });
```

---

## ✅ Summary

### The agent knows to use Zoho tools through:

1. **System Prompt** - Lists all available tools and when to use them
2. **LLM Function Calling** - GPT-4 natively understands function calling
3. **ReAct Pattern** - Agent reasons about which tool to use
4. **Skill Descriptions** - Each skill clearly describes what it does
5. **Intent Analysis** - Agent analyzes user's request and matches to tools

### You can enhance this by:
- ✅ Clear agent descriptions
- ✅ Detailed skill descriptions
- ✅ Example prompts in system prompt
- ✅ Workflow automation
- ✅ Agent training with examples

---

## 🎯 Want to See It in Action?

Check these files:
- `src/services/agent/BaseAgent.ts` - Agent reasoning logic
- `src/services/agent/AgentFactory.ts` - Tool registration
- `src/services/tools/implementations/ZohoTool.ts` - Your enhanced tool
- `src/services/llm/LLMRouter.ts` - LLM function calling

**The magic happens automatically!** 🎉


