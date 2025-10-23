## 🎯 Dynamic Tools - No-Code Tool Registration

## ✅ What You Asked For

**Your Question:** "How can we allow anyone to register tools & skills without coding? Just upload JSON and APIs get called through prompt understanding?"

**Answer:** YES! I've built a complete **Dynamic Tool System** that allows **non-technical users** to:

1. ✅ Upload a JSON file to register tools
2. ✅ Define API endpoints and parameters
3. ✅ No coding required
4. ✅ AI agents automatically understand and use the tools
5. ✅ Prompt-based tool invocation

---

## 🚀 How It Works

### **3-Step Process:**

```
1. User creates JSON config → 
2. Upload to platform → 
3. Agents automatically use it!
```

No coding, no deployment, instant activation!

---

## 📝 JSON Configuration Format

### **Basic Structure:**

```json
{
  "id": "my-tool",
  "name": "My Custom Tool",
  "description": "What this tool does",
  "category": "integration",
  "provider": "my-api-provider",
  "version": "1.0.0",
  "isActive": true,
  "requiresAuth": true,
  
  "auth": {
    "type": "api_key",
    "credentials": {
      "api_key": "{{VITE_MY_API_KEY}}",
      "base_url": "https://api.example.com"
    }
  },
  
  "skills": [
    {
      "id": "create_record",
      "name": "create_record",
      "description": "Creates a new record",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/records",
        "headers": {
          "Authorization": "Bearer {{api_key}}"
        },
        "body": {
          "type": "json",
          "template": "{\"name\": \"{{name}}\", \"value\": \"{{value}}\"}"
        }
      },
      "parameters": {
        "name": {
          "type": "string",
          "required": true,
          "description": "Record name"
        },
        "value": {
          "type": "string",
          "required": true,
          "description": "Record value"
        }
      },
      "response": {
        "successMessage": "Created record: {{response.name}}"
      }
    }
  ]
}
```

---

## 🎯 Real Examples

### **Example 1: Stripe Integration**

See `examples/dynamic-tools/stripe-tool.json`:

```json
{
  "id": "stripe-integration",
  "name": "Stripe Payment Tool",
  "auth": {
    "type": "bearer",
    "credentials": {
      "api_key": "{{VITE_STRIPE_API_KEY}}",
      "base_url": "https://api.stripe.com/v1"
    }
  },
  "skills": [
    {
      "id": "create_customer",
      "name": "create_customer",
      "description": "Create a new customer in Stripe",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/customers",
        "headers": {
          "Authorization": "Bearer {{api_key}}"
        }
      },
      "parameters": {
        "email": {
          "type": "string",
          "required": true,
          "description": "Customer email"
        }
      }
    }
  ]
}
```

**User Action:** Upload this JSON  
**Result:** Agents can now create Stripe customers!

---

### **Example 2: QuickBooks Integration**

See `examples/dynamic-tools/quickbooks-tool.json`:

```json
{
  "id": "quickbooks-integration",
  "name": "QuickBooks Tool",
  "skills": [
    {
      "id": "create_invoice",
      "name": "create_invoice",
      "description": "Create an invoice in QuickBooks",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/invoice"
      },
      "parameters": {
        "customer_id": {
          "type": "string",
          "required": true
        },
        "amount": {
          "type": "number",
          "required": true
        }
      }
    }
  ]
}
```

---

## 🎨 Using the UI

### **Option 1: Upload JSON File**

1. Go to **Tools Manager** page
2. Click **"Upload JSON"** button
3. Select your JSON file
4. Tool is registered automatically!

```
┌────────────────────────────────────┐
│   Dynamic Tool Manager             │
├────────────────────────────────────┤
│  [+ Create from JSON] [Upload JSON]│
│                                    │
│  ┌──────────────────────────────┐ │
│  │ Stripe Payment Tool          │ │
│  │ stripe • 3 skills            │ │
│  │ [View] [Test] [Download] [X] │ │
│  └──────────────────────────────┘ │
└────────────────────────────────────┘
```

### **Option 2: Paste JSON Directly**

1. Click **"Create from JSON"**
2. Paste your JSON configuration
3. Click **"Register Tool"**
4. Done!

---

## 🤖 How Agents Automatically Use It

### **Scenario: User Wants to Create Stripe Customer**

```
User: "Create a Stripe customer for john@example.com"

Agent Thinking:
  - User wants to create a customer
  - I have a Stripe Tool with create_customer skill
  - The skill description says: "Create a new customer in Stripe"
  - This matches the user's intent!

Agent Action:
  → Call stripe-integration.create_customer(email="john@example.com")

API Call Made:
  POST https://api.stripe.com/v1/customers
  Headers: Authorization: Bearer sk_test_...
  Body: {"email": "john@example.com"}

Response:
  {"id": "cus_123", "email": "john@example.com", ...}

Agent Response:
  "I've created a Stripe customer for john@example.com with ID: cus_123"
```

**No coding required!** The agent understands from the JSON configuration!

---

## 📋 Configuration Options

### **Authentication Types:**

```json
{
  "auth": {
    "type": "api_key",        // API Key in header
    "type": "bearer",         // Bearer token
    "type": "basic",          // Basic auth
    "type": "oauth2",         // OAuth 2.0
    "type": "custom"          // Custom headers
  }
}
```

### **HTTP Methods:**

```json
{
  "request": {
    "method": "GET",     // Read data
    "method": "POST",    // Create data
    "method": "PUT",     // Update data
    "method": "PATCH",   // Partial update
    "method": "DELETE"   // Delete data
  }
}
```

### **Parameter Types:**

```json
{
  "parameters": {
    "name": {
      "type": "string",   // Text
      "type": "number",   // Numbers
      "type": "boolean",  // True/False
      "type": "object",   // JSON object
      "type": "array"     // List
    }
  }
}
```

### **Variable Substitution:**

Use `{{variable_name}}` in any string:

```json
{
  "url": "{{base_url}}/customers/{{customer_id}}",
  "headers": {
    "Authorization": "Bearer {{api_key}}"
  },
  "template": "{\"name\": \"{{customer_name}}\", \"email\": \"{{email}}\"}"
}
```

Variables are automatically replaced with:
- Credentials: `{{api_key}}`, `{{base_url}}`
- Parameters: `{{customer_name}}`, `{{email}}`
- Response data: `{{response.id}}`

---

## 🎯 Advanced Features

### **1. Response Transformation**

Extract specific fields from API response:

```json
{
  "response": {
    "extractPath": "data.customers",
    "transform": {
      "customer_id": "id",
      "customer_email": "email",
      "created_date": "created_at"
    },
    "successMessage": "Customer {{response.customer_id}} created!"
  }
}
```

### **2. Error Handling**

```json
{
  "errorHandling": {
    "retryCount": 3,
    "retryDelay": 1000,
    "fallbackMessage": "Failed to create customer. Please try again."
  }
}
```

### **3. Multi-Tenancy**

Tools are automatically isolated by organization:
- Each organization has its own tools
- Credentials are organization-specific
- No data leakage between orgs

---

## 🚀 How to Use

### **Step 1: Create JSON Configuration**

```bash
# Create your tool JSON file
nano my-tool.json
```

### **Step 2: Add Environment Variables**

Add API credentials to `.env`:

```env
VITE_MY_API_KEY=your_api_key_here
VITE_MY_BASE_URL=https://api.example.com
```

### **Step 3: Upload via UI**

1. Login to platform
2. Go to **Tools Manager**
3. Click **Upload JSON**
4. Select `my-tool.json`
5. Done!

### **Step 4: Create Agent**

```typescript
const agent = await factory.createToolEnabledAgent(
  {
    name: 'My Agent',
    type: 'custom',
  },
  ['my-tool'] // Enable your custom tool
);
```

### **Step 5: Use Naturally**

```
User: "Create a record with name ABC and value 123"
Agent: → Calls my-tool.create_record(name="ABC", value="123")
Agent: "Created record: ABC"
```

---

## 📊 Tool Categories

| Category | Use For | Examples |
|----------|---------|----------|
| `integration` | Third-party APIs | Stripe, QuickBooks, Salesforce |
| `communication` | Messaging & email | Twilio, SendGrid, Slack |
| `data` | Database operations | PostgreSQL, MongoDB, Redis |
| `automation` | Workflows | Zapier, IFTTT, n8n |
| `custom` | Anything else | Custom APIs, internal tools |

---

## 🎨 UI Features

### **Tool Manager Includes:**

✅ **Upload JSON files**
✅ **Create from JSON editor**
✅ **View tool details**
✅ **Test connections**
✅ **Download tools as JSON**
✅ **Delete tools**
✅ **See all skills**
✅ **Multi-organization support**

---

## 🔐 Security

### **Credentials Handling:**

1. ✅ API keys stored as environment variables
2. ✅ Never exposed in JSON
3. ✅ Organization-specific isolation
4. ✅ RLS policies enforce access control

### **Best Practices:**

```json
{
  "auth": {
    "credentials": {
      // ✅ Good: Reference env var
      "api_key": "{{VITE_STRIPE_API_KEY}}",
      
      // ❌ Bad: Hardcode secret
      "api_key": "sk_live_actual_key"
    }
  }
}
```

---

## 📦 Database Schema

```sql
CREATE TABLE dynamic_tools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  provider TEXT NOT NULL,
  configuration JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  organization_id UUID REFERENCES organizations(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## ✅ Summary

### **What You Get:**

1. ✅ **No-Code Tool Registration** - Upload JSON, done!
2. ✅ **Automatic Agent Integration** - Agents understand tools from descriptions
3. ✅ **Prompt-Based Invocation** - Natural language triggers API calls
4. ✅ **Multi-Tenancy** - Organization-specific tools
5. ✅ **Security** - Environment variables for credentials
6. ✅ **UI Management** - Upload, test, manage tools visually
7. ✅ **Unlimited Extensibility** - Add any API as a tool

### **Process:**

```
Create JSON → Upload → Agents Use It!
```

**Zero coding required for end users!** 🎉

---

## 🎯 Next Steps

1. Run migration: `supabase/migrations/20251015000000_create_dynamic_tools.sql`
2. Add DynamicToolManager to your UI
3. Try example tools: `stripe-tool.json`, `quickbooks-tool.json`
4. Create your own tool JSON
5. Upload and test!

---

**Files Created:**
- `src/services/tools/DynamicToolLoader.ts` - Core loader
- `src/components/tools/DynamicToolManager.tsx` - UI component
- `examples/dynamic-tools/stripe-tool.json` - Stripe example
- `examples/dynamic-tools/quickbooks-tool.json` - QuickBooks example
- `supabase/migrations/20251015000000_create_dynamic_tools.sql` - Database

**You can now let users create their own integrations without any coding!** 🚀


