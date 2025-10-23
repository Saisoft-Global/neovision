# 🚀 Quick Zoho Setup - 5 Minutes

## ✅ YES! You Can Upload Documents and Create Zoho Invoices

### What I Just Built For You:

1. ✅ **ZohoTool** - Complete Zoho Books integration
2. ✅ **5 Skills** ready to use:
   - `extract_invoice_data` - AI extracts data from documents
   - `create_zoho_invoice` - Creates invoice in Zoho Books
   - `manage_zoho_customer` - Creates/updates customers
   - `get_invoice_status` - Check invoice status
   - `document_to_invoice` - **Complete workflow in one call!**

3. ✅ **Registered** - Tool auto-loads when app starts

---

## 📝 Setup (5 Minutes)

### 1. Get Zoho OAuth Credentials

Go to: https://api-console.zoho.com/

1. Click **"Add Client"** → **"Self Client"**
2. Give it a name: "XAgent Platform"
3. Click **"Create"**
4. Copy **Client ID** and **Client Secret**

### 2. Generate Refresh Token

Use this URL (replace YOUR_CLIENT_ID):
```
https://accounts.zoho.com/oauth/v2/auth?scope=ZohoBooks.invoices.ALL,ZohoBooks.contacts.ALL&client_id=YOUR_CLIENT_ID&response_type=code&access_type=offline&redirect_uri=https://www.zoho.com/books
```

1. Open URL in browser
2. Authorize the app
3. Copy the **code** from the redirect URL
4. Use code to get refresh token:

```bash
curl -X POST https://accounts.zoho.com/oauth/v2/token \
  -d "code=YOUR_CODE" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "redirect_uri=https://www.zoho.com/books" \
  -d "grant_type=authorization_code"
```

5. Copy the **refresh_token** from response

### 3. Get Organization ID

1. Log into Zoho Books
2. Go to Settings → Organization Profile
3. Copy your **Organization ID**

### 4. Add to .env

Add these lines to your `.env` file:

```env
# Zoho Configuration
VITE_ZOHO_CLIENT_ID=1000.XXXXXXXXXXXXXX
VITE_ZOHO_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_ZOHO_REFRESH_TOKEN=1000.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_ZOHO_ORGANIZATION_ID=123456789
VITE_ZOHO_API_ENDPOINT=https://www.zohoapis.com
```

### 5. Restart Frontend

```bash
# Stop and restart
npm run dev
```

---

## 🎯 How to Use

### Option 1: Using an Agent (Recommended)

1. **Create Invoice Agent** in Agent Builder:
   - Name: "Invoice Processor"
   - Type: "invoice_processor"
   - Tools: Enable "Zoho Tool"

2. **Chat with Agent**:
   ```
   User: "I've uploaded an invoice document, please create it in Zoho Books"
   Agent: "I'll process that invoice for you..."
   Agent: "✅ Invoice INV-001234 created successfully in Zoho Books!"
   ```

### Option 2: Direct Tool Call

```typescript
import { ToolRegistry } from './services/tools/ToolRegistry';

const toolRegistry = ToolRegistry.getInstance();
const zohoTool = toolRegistry.getTool('zoho-integration');

// Upload document → Extract text with OCR
const documentText = await ocrProcessor.processDocument(file);

// Create invoice (all-in-one)
const result = await zohoTool.execute('document_to_invoice', {
  parameters: { documentText },
  llmService: yourLLMService,
  userId: 'user-123',
  organizationId: 'org-456',
});

console.log(result.data.invoice); // Invoice details
```

### Option 3: Step-by-Step with Review

```typescript
// Step 1: Extract data
const extractResult = await zohoTool.execute('extract_invoice_data', {
  parameters: { documentText },
  llmService,
  userId: 'user-123',
  organizationId: 'org-456',
});

// Step 2: Show to user for review/edit
console.log('Extracted:', extractResult.data);

// Step 3: User approves → Create invoice
const invoiceResult = await zohoTool.execute('create_zoho_invoice', {
  parameters: { invoiceData: extractResult.data },
  llmService,
  userId: 'user-123',
  organizationId: 'org-456',
});

console.log('Created:', invoiceResult.data.invoice_number);
```

---

## 📋 Test It Now!

### Sample Invoice Text (for testing):

```
INVOICE #12345

From: Test Company Inc.
To: John Doe
john@example.com

Date: 2025-10-15
Due Date: 2025-11-15

Items:
- Web Development: $2,500
- Hosting: $500
- Domain: $15

Total: $3,015
```

### Test Command:

```typescript
const result = await zohoTool.execute('document_to_invoice', {
  parameters: { 
    documentText: `[paste sample invoice above]`
  },
  llmService,
  userId: 'test-user',
  organizationId: 'test-org',
});

console.log(result); // Should show created invoice!
```

---

## ✅ What You Get

When you upload a document:

1. **OCR extracts text** from PDF/image
2. **AI analyzes** and structures the data
3. **Validates** customer, items, amounts
4. **Creates customer** in Zoho if needed
5. **Creates invoice** with all line items
6. **Returns** invoice number, URL, and details

**All automatically!** 🎉

---

## 🎨 Files Added

1. `src/services/tools/implementations/ZohoTool.ts` - Main integration
2. `src/services/tools/implementations/registerZohoTool.ts` - Registration helper
3. `ZOHO_INVOICE_WORKFLOW_GUIDE.md` - Complete documentation
4. `QUICK_ZOHO_SETUP.md` - This file

**Tool is already registered in:**
- `src/services/initialization/toolsInitializer.ts`

---

## 🔥 Next Steps

1. ✅ Add Zoho credentials to `.env`
2. ✅ Restart frontend
3. ✅ Create an Invoice Agent
4. ✅ Upload a test document
5. ✅ Watch it create an invoice! 🚀

**You're ready to go!**


