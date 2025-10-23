# 📄 Document to Zoho Invoice - Complete Workflow Guide

## 🎯 Overview

Your platform can automatically:
1. **Upload a document** (PDF, image, scan)
2. **Extract text using OCR**
3. **Use AI to extract structured invoice data**
4. **Create invoice in Zoho Books**
5. **Create/update customer records**

---

## 🚀 Quick Start

### Step 1: Configure Zoho Credentials

Add these to your `.env` file:

```env
# Zoho Configuration
VITE_ZOHO_CLIENT_ID=your_client_id_here
VITE_ZOHO_CLIENT_SECRET=your_client_secret_here
VITE_ZOHO_REFRESH_TOKEN=your_refresh_token_here
VITE_ZOHO_ORGANIZATION_ID=your_organization_id_here
VITE_ZOHO_API_ENDPOINT=https://www.zohoapis.com
```

### Step 2: Get Zoho OAuth Credentials

1. Go to [Zoho API Console](https://api-console.zoho.com/)
2. Create a new "Self Client" application
3. Generate refresh token with scopes:
   - `ZohoBooks.invoices.CREATE`
   - `ZohoBooks.invoices.READ`
   - `ZohoBooks.contacts.CREATE`
   - `ZohoBooks.contacts.UPDATE`
4. Copy Client ID, Client Secret, and Refresh Token to `.env`

### Step 3: Register Zoho Tool

Add to `src/services/tools/toolsInitializer.ts`:

```typescript
import { registerZohoTool } from './implementations/registerZohoTool';

export async function initializeToolsAndSkills() {
  console.log('🔧 Initializing Tools & Skills Framework...');
  
  const toolRegistry = ToolRegistry.getInstance();

  // Existing tools
  registerEmailTool();
  registerCRMTool();
  
  // Add Zoho integration
  registerZohoTool(); // ← Add this line

  // ... rest of initialization
}
```

---

## 📋 Usage Examples

### Example 1: Simple Document Upload to Invoice

```typescript
import { ZohoTool } from './services/tools/implementations/ZohoTool';
import { OCRProcessor } from './services/ocr/OCRProcessor';

// 1. Upload and process document
const ocrProcessor = new OCRProcessor();
const documentText = await ocrProcessor.processDocument(uploadedFile);

// 2. Create invoice in Zoho (all-in-one)
const zohoTool = new ZohoTool();
const result = await zohoTool.execute('document_to_invoice', {
  parameters: { documentText },
  llmService: yourLLMService,
  userId: 'user-123',
  organizationId: 'org-456',
});

if (result.success) {
  console.log('✅ Invoice created:', result.data.invoice.invoice_number);
  console.log('Invoice URL:', result.data.invoice.invoice_url);
}
```

### Example 2: Step-by-Step with Validation

```typescript
// Step 1: Extract data first
const extractResult = await zohoTool.execute('extract_invoice_data', {
  parameters: { documentText },
  llmService,
  userId: 'user-123',
  organizationId: 'org-456',
});

// Step 2: Review and modify extracted data
const invoiceData = extractResult.data;
console.log('Extracted data:', invoiceData);

// User can edit/confirm data here
invoiceData.customer_email = 'updated@email.com';

// Step 3: Create invoice
const createResult = await zohoTool.execute('create_zoho_invoice', {
  parameters: { invoiceData },
  llmService,
  userId: 'user-123',
  organizationId: 'org-456',
});

console.log('Invoice created:', createResult.data);
```

### Example 3: Using Workflow Engine

Create a workflow JSON:

```json
{
  "id": "document-to-zoho-invoice",
  "name": "Document to Zoho Invoice",
  "description": "Process uploaded document and create invoice in Zoho Books",
  "nodes": [
    {
      "id": "ocr",
      "type": "ocr_extract",
      "config": {
        "input": "uploaded_document"
      }
    },
    {
      "id": "extract_data",
      "type": "tool_execution",
      "config": {
        "tool": "zoho-integration",
        "skill": "extract_invoice_data",
        "input": "{{ocr.text}}"
      }
    },
    {
      "id": "confirm",
      "type": "human_review",
      "config": {
        "message": "Please review invoice data",
        "data": "{{extract_data.result}}"
      }
    },
    {
      "id": "create_invoice",
      "type": "tool_execution",
      "config": {
        "tool": "zoho-integration",
        "skill": "create_zoho_invoice",
        "input": "{{confirm.approved_data}}"
      }
    }
  ]
}
```

---

## 🤖 Create an Invoice Processing Agent

### Create a Specialized Agent

```typescript
import { AgentFactory } from './services/agent/AgentFactory';

const factory = AgentFactory.getInstance();

const invoiceAgent = await factory.createToolEnabledAgent(
  {
    name: 'Invoice Processing Agent',
    type: 'invoice_processor',
    description: 'Automatically processes documents and creates invoices in Zoho Books',
    personality: {
      tone: 'professional',
      traits: ['accurate', 'detail-oriented', 'efficient'],
    },
    skills: [
      {
        name: 'document_processing',
        level: 5,
        category: 'technical',
      },
      {
        name: 'data_extraction',
        level: 5,
        category: 'technical',
      },
      {
        name: 'invoice_management',
        level: 5,
        category: 'business',
      },
    ],
    llm_config: {
      provider: 'openai',
      model: 'gpt-4',
      temperature: 0.1, // Low temperature for accuracy
    },
    capabilities: ['ocr', 'zoho_integration'],
  },
  ['zoho-integration'] // Enable Zoho tool
);
```

### Use the Agent

```typescript
// User uploads document
const userMessage = "I've uploaded an invoice document. Please process it and create an invoice in Zoho.";

const response = await invoiceAgent.processMessage(userMessage, {
  type: 'invoice_processing',
  attachments: [
    {
      type: 'document',
      file: uploadedFile,
    },
  ],
  userId: 'user-123',
  organizationId: 'org-456',
});

console.log(response.message);
// "I've processed your invoice document and created invoice #INV-001234 in Zoho Books..."
```

---

## 🔄 Complete Workflow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   USER UPLOADS DOCUMENT                     │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  OCR PROCESSOR (OCRProcessor.ts)                            │
│  - Extracts text from PDF/Image                             │
│  - Uses Tesseract/Cloud OCR                                 │
│  - Returns clean text                                       │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  AI DATA EXTRACTION (ZohoTool - extract_invoice_data)       │
│  - LLM analyzes document text                               │
│  - Extracts: customer, items, amounts, dates                │
│  - Returns structured JSON                                  │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  OPTIONAL: HUMAN REVIEW                                     │
│  - Show extracted data to user                              │
│  - Allow edits/corrections                                  │
│  - Confirm before creating invoice                          │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  CUSTOMER MANAGEMENT (ZohoTool - manage_zoho_customer)      │
│  - Check if customer exists                                 │
│  - Create new or update existing                            │
│  - Return customer ID                                       │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  CREATE INVOICE (ZohoTool - create_zoho_invoice)            │
│  - Format data for Zoho Books API                           │
│  - Create invoice with line items                           │
│  - Return invoice number & URL                              │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  NOTIFY USER                                                │
│  - Invoice created successfully                             │
│  - Show invoice number & link                               │
│  - Store in agent memory for reference                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎨 Frontend Integration

### Add Upload Component

```typescript
// In your agent chat or knowledge base
<DocumentUploader
  onUpload={async (file) => {
    // Process with agent
    const message = `Please process this invoice and create it in Zoho Books`;
    await sendMessageToAgent(message, { attachments: [file] });
  }}
  acceptedTypes={['application/pdf', 'image/*']}
  ocrEnabled={true}
/>
```

### Display Results

```typescript
// Show invoice creation result
{result.success && (
  <div className="success-message">
    <h3>✅ Invoice Created Successfully!</h3>
    <p>Invoice Number: {result.data.invoice.invoice_number}</p>
    <p>Customer: {result.data.invoice.customer_name}</p>
    <p>Amount: ${result.data.invoice.total}</p>
    <a href={result.data.invoice.invoice_url} target="_blank">
      View in Zoho Books
    </a>
  </div>
)}
```

---

## 📊 Example Document Processing

### Input Document (Scanned/PDF):
```
INVOICE

From: ABC Company
123 Business St
City, State 12345

To: John Doe
456 Customer Ave
Town, State 67890

Invoice Date: 2025-10-15
Due Date: 2025-11-15

Items:
1. Web Development Services - $2,500.00
2. Hosting (Annual) - $500.00
3. Domain Registration - $15.00

Subtotal: $3,015.00
Tax (10%): $301.50
Total: $3,316.50
```

### Extracted JSON:
```json
{
  "customer_name": "John Doe",
  "customer_email": null,
  "customer_address": "456 Customer Ave, Town, State 67890",
  "invoice_date": "2025-10-15",
  "due_date": "2025-11-15",
  "items": [
    {
      "item_name": "Web Development Services",
      "description": "Web Development Services",
      "quantity": 1,
      "rate": 2500.00,
      "amount": 2500.00
    },
    {
      "item_name": "Hosting (Annual)",
      "description": "Hosting (Annual)",
      "quantity": 1,
      "rate": 500.00,
      "amount": 500.00
    },
    {
      "item_name": "Domain Registration",
      "description": "Domain Registration",
      "quantity": 1,
      "rate": 15.00,
      "amount": 15.00
    }
  ],
  "subtotal": 3015.00,
  "tax_amount": 301.50,
  "total_amount": 3316.50,
  "currency": "USD",
  "notes": "From ABC Company"
}
```

### Created in Zoho:
- ✅ Customer "John Doe" created/updated
- ✅ Invoice INV-001234 created
- ✅ 3 line items added
- ✅ Total $3,316.50
- ✅ Due date: Nov 15, 2025

---

## 🔐 Security & Best Practices

1. **API Credentials**: Store in `.env`, never in code
2. **Token Refresh**: Automatically handles OAuth token refresh
3. **Error Handling**: Graceful failures with user notifications
4. **Validation**: AI extracts data, but allow human review
5. **Audit Trail**: All actions logged with organization context
6. **Multi-Tenancy**: Each organization has separate Zoho credentials

---

## 🛠️ Troubleshooting

### Issue: "Failed to refresh Zoho access token"
**Solution**: Check your refresh token is valid and has correct scopes

### Issue: "Invoice creation failed"
**Solution**: Ensure organization_id is correct in Zoho Books

### Issue: "Customer not found"
**Solution**: Tool will auto-create customer if not found

### Issue: "OCR text quality poor"
**Solution**: Use higher quality scans or Cloud OCR providers

---

## 🎯 Next Steps

1. **Register Zoho Tool** in toolsInitializer.ts
2. **Add Zoho credentials** to .env
3. **Create Invoice Agent** using Agent Builder
4. **Test workflow** with sample document
5. **Customize** extraction prompts for your invoice format

---

## ✅ You're Ready!

Your platform now supports:
- ✅ Document upload & OCR
- ✅ AI-powered data extraction
- ✅ Zoho Books integration
- ✅ Customer management
- ✅ Invoice creation
- ✅ Complete workflow automation

**Upload a document and let AI create your invoice in Zoho!** 🚀


