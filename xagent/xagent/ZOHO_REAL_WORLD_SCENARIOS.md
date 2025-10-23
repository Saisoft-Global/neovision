# 🌍 Zoho Integration - Real World Business Scenarios

## ✅ What You Asked For - All Scenarios Covered!

You're absolutely right - businesses need more than just invoice creation! Here are all the real-world scenarios now supported in the **SAME** `ZohoTool.ts` file:

---

## 📊 All 10 Skills in One Tool

### 1. **Extract Invoice Data** (AI-powered)
- Extract structured data from documents
- Works with any format/language

### 2. **Create Invoice** 
- Auto-create in Zoho Books
- With line items, taxes, totals

### 3. **Manage Customers**
- Auto-create or update
- No duplicates

### 4. **Get Invoice Status**
- Check current status
- Get payment info

### 5. **Complete Workflow** (All-in-one)
- Document → Extract → Customer → Invoice
- One command does it all

### 6. **Search Invoices** ← NEW!
- By customer name
- By invoice number
- By status (paid/unpaid/overdue)
- By date range

### 7. **Update Invoice Status** ← NEW!
- Mark as sent
- Send to customer
- Void invoice

### 8. **Send Invoice Email** ← NEW!
- Auto-email to customer
- Custom subject/body
- Multiple recipients

### 9. **Get Payment History** ← NEW!
- For specific invoice
- For customer
- All payments

### 10. **Natural Language Query** ← NEW!
- Ask in plain English
- AI understands and responds

---

## 🎯 Real-World Use Cases

### Scenario 1: Client Checking Invoice Status

**Client asks:**
> "What's the status of invoice INV-12345?"

**Agent response using `handle_natural_query`:**
```typescript
await zohoTool.execute('handle_natural_query', {
  parameters: { 
    query: "What's the status of invoice INV-12345?" 
  },
  llmService,
  userId: 'client-123',
  organizationId: 'org-456',
});

// Returns:
{
  success: true,
  data: {
    invoice_number: "INV-12345",
    status: "sent",
    due_date: "2025-11-15",
    total: 5000.00,
    balance: 5000.00,
    customer_name: "ABC Company"
  },
  message: "Invoice INV-12345 is currently sent. Due date: Nov 15, 2025. Amount due: $5,000"
}
```

---

### Scenario 2: Supplier Checking Multiple Invoices

**Supplier asks:**
> "Show me all unpaid invoices for XYZ Corp"

**Agent response:**
```typescript
await zohoTool.execute('search_invoices', {
  parameters: { 
    customer_name: "XYZ Corp",
    status: "unpaid"
  },
  llmService,
  userId: 'supplier-789',
  organizationId: 'org-456',
});

// Returns:
{
  success: true,
  data: [
    {
      invoice_number: "INV-12345",
      date: "2025-10-01",
      due_date: "2025-11-01",
      total: 5000.00,
      status: "overdue"
    },
    {
      invoice_number: "INV-12456",
      date: "2025-10-15",
      due_date: "2025-11-15",
      total: 3000.00,
      status: "sent"
    }
  ],
  message: "Found 2 unpaid invoice(s) for XYZ Corp"
}
```

---

### Scenario 3: Auto-Send Invoice After Creation

**Workflow:**
1. Upload document
2. Create invoice
3. **Automatically email to customer**

```typescript
// Step 1: Create invoice from document
const createResult = await zohoTool.execute('document_to_invoice', {
  parameters: { documentText },
  llmService,
  userId: 'user-123',
  organizationId: 'org-456',
});

// Step 2: Immediately send via email
if (createResult.success) {
  const invoiceId = createResult.data.invoice.invoice_id;
  
  await zohoTool.execute('send_invoice_email', {
    parameters: { 
      invoice_id: invoiceId,
      email_addresses: ['client@example.com'],
      subject: 'Your Invoice from ABC Company',
      body: 'Thank you for your business. Please find your invoice attached.'
    },
    llmService,
    userId: 'user-123',
    organizationId: 'org-456',
  });
}
```

---

### Scenario 4: Payment Status Check

**Client asks:**
> "Has ABC Company paid invoice INV-12345?"

**Agent response:**
```typescript
// First, find the invoice
const searchResult = await zohoTool.execute('search_invoices', {
  parameters: { invoice_number: "INV-12345" },
  llmService,
  userId: 'user-123',
  organizationId: 'org-456',
});

// Then check payment history
if (searchResult.success && searchResult.data.length > 0) {
  const invoiceId = searchResult.data[0].invoice_id;
  
  const paymentResult = await zohoTool.execute('get_payment_history', {
    parameters: { invoice_id: invoiceId },
    llmService,
    userId: 'user-123',
    organizationId: 'org-456',
  });
  
  // Response:
  {
    success: true,
    data: [
      {
        payment_id: "PAY-789",
        date: "2025-10-20",
        amount: 5000.00,
        payment_mode: "Bank Transfer",
        reference_number: "TXN-456"
      }
    ],
    message: "Found 1 payment(s). Invoice fully paid on Oct 20, 2025"
  }
}
```

---

### Scenario 5: Overdue Invoice Management

**Manager asks:**
> "Show me all overdue invoices from last month"

**Agent response:**
```typescript
await zohoTool.execute('search_invoices', {
  parameters: { 
    status: "overdue",
    date_from: "2025-09-01",
    date_to: "2025-09-30"
  },
  llmService,
  userId: 'manager-123',
  organizationId: 'org-456',
});

// Agent then can:
// 1. List all overdue invoices
// 2. Send reminder emails automatically
// 3. Generate aging report
```

---

### Scenario 6: Natural Language Conversations

**Your AI agent can now have conversations like:**

```
Client: "Hi, I need to check my invoice status"
Agent: "Sure! Do you have your invoice number?"

Client: "It's INV-12345"
Agent: *calls handle_natural_query*
Agent: "Invoice INV-12345 was sent on Oct 15, 2025. 
       The due date is Nov 15, 2025. 
       Total amount: $5,000
       Status: Unpaid"

Client: "Can you email it to me again?"
Agent: *calls send_invoice_email*
Agent: "I've sent the invoice to your email at client@example.com"

Client: "Have you received any payment?"
Agent: *calls get_payment_history*
Agent: "I checked and we haven't received payment yet for this invoice."
```

---

## 🤖 Create a Customer Service Agent

```typescript
const customerServiceAgent = await factory.createToolEnabledAgent(
  {
    name: 'Invoice Support Agent',
    type: 'customer_service',
    description: 'Helps clients check invoice status, payment history, and resend invoices',
    personality: {
      tone: 'professional',
      traits: ['helpful', 'patient', 'detail-oriented'],
    },
    skills: [
      {
        name: 'customer_service',
        level: 5,
        category: 'business',
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
      temperature: 0.7, // Friendly but accurate
    },
  },
  ['zoho-integration'] // Enable Zoho tool
);

// Now clients can chat naturally:
const response = await customerServiceAgent.processMessage(
  "What's the status of my invoice?",
  {
    type: 'customer_inquiry',
    userId: 'client-123',
    organizationId: 'org-456',
  }
);
```

---

## 📋 Complete Business Workflow

### From Document Upload to Payment Tracking

```typescript
// 1. Client uploads invoice document
const uploadResult = await handleDocumentUpload(file);

// 2. Agent creates invoice
const createResult = await zohoTool.execute('document_to_invoice', {
  parameters: { documentText: uploadResult.text },
  llmService,
  userId: 'user-123',
  organizationId: 'org-456',
});

// 3. Auto-send to customer
await zohoTool.execute('send_invoice_email', {
  parameters: { 
    invoice_id: createResult.data.invoice.invoice_id 
  },
  llmService,
  userId: 'user-123',
  organizationId: 'org-456',
});

// 4. Customer can later check status
const statusResult = await zohoTool.execute('handle_natural_query', {
  parameters: { 
    query: `What's the status of invoice ${createResult.data.invoice.invoice_number}?`
  },
  llmService,
  userId: 'client-456',
  organizationId: 'org-456',
});

// 5. Supplier can check payments
const paymentResult = await zohoTool.execute('get_payment_history', {
  parameters: { 
    invoice_id: createResult.data.invoice.invoice_id 
  },
  llmService,
  userId: 'supplier-789',
  organizationId: 'org-456',
});

// 6. Manager can view all overdue invoices
const overdueResult = await zohoTool.execute('search_invoices', {
  parameters: { 
    status: "overdue" 
  },
  llmService,
  userId: 'manager-123',
  organizationId: 'org-456',
});
```

---

## 🎯 Use Cases Summary

| Scenario | Skill Used | Who Uses It |
|----------|------------|-------------|
| Upload & create invoice | `document_to_invoice` | Internal team |
| Check invoice status | `get_invoice_status` or `handle_natural_query` | Clients, Suppliers |
| Search invoices | `search_invoices` | Everyone |
| Send invoice via email | `send_invoice_email` | Internal team |
| Check payment status | `get_payment_history` | Accounting, Suppliers |
| Update invoice | `update_invoice_status` | Internal team |
| Natural questions | `handle_natural_query` | Clients, Suppliers |

---

## ✅ Benefits

1. **✅ One Tool, All Features** - Everything in `ZohoTool.ts`
2. **✅ Real-World Ready** - Handles all business scenarios
3. **✅ Natural Language** - Clients can ask questions naturally
4. **✅ Automated Workflows** - Chain multiple skills together
5. **✅ Self-Service** - Clients check status themselves
6. **✅ Multi-User** - Clients, suppliers, managers all supported
7. **✅ Audit Trail** - All actions logged
8. **✅ Extensible** - Easy to add more skills

---

## 🚀 Ready to Use!

All 10 skills are now in the **same** `ZohoTool.ts` file:
- ✅ No separate "Enhanced" file
- ✅ All integrated in one place
- ✅ Easy to maintain
- ✅ Covers all real-world scenarios

**Just add Zoho credentials and start using!** 🎉


