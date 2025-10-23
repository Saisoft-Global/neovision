# 📄 PDF Upload Fix & Knowledge Base Guide

## 🔧 PDF Upload Issue - FIXED!

### Problem
```
PDF processing error: Error: Failed to initialize PDF processor
Failed to load PDF.js: InvalidPDFException
```

### Root Cause
- PDF.js worker file (`/pdf.worker.min.js`) was not loading correctly
- Single worker URL dependency with no fallback
- CORS issues when loading worker from local path

### Solution Applied ✅

**File: `src/utils/imports/pdf.ts`**
- Added multiple fallback CDN URLs for PDF.js worker
- Automatic failover if local worker file is missing
- Disabled `useWorkerFetch` to avoid CORS issues
- Better error handling and logging

**Changes:**
```typescript
// BEFORE (Single URL, no fallback)
const WORKER_URL = '/pdf.worker.min.js';
pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_URL;

// AFTER (Multiple fallback URLs)
const WORKER_URLS = [
  '/pdf.worker.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js'
];

// Try each URL until one works
for (let i = workerUrlIndex; i < WORKER_URLS.length; i++) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_URLS[i];
    // Test and verify worker loads...
    console.log(`✅ PDF.js worker loaded successfully from: ${workerUrl}`);
    return;
  } catch (error) {
    console.warn(`Failed to load from ${WORKER_URLS[i]}, trying next...`);
    continue;
  }
}
```

**File: `src/services/document/processors/pdf/PDFProcessor.ts`**
- Changed `useWorkerFetch: true` → `useWorkerFetch: false`
- Prevents CORS errors when fetching PDF resources

---

## 📚 Knowledge Base: Complete Guide

### 🎯 What is the Knowledge Base?

The Knowledge Base (KB) is where you add information that your AI agents can access and use to answer questions. It's like giving your AI a "brain" with specific knowledge about your business, products, policies, etc.

---

## 🚀 How to Add Information to Your Knowledge Base

Navigate to: **Knowledge Base** page (in your main navigation)

You'll see **3 tabs** for adding knowledge:

### **Tab 1: 📤 Upload File** ✅ NOW WORKING!

**What it does:**
- Upload documents directly from your computer
- Supports: `.txt`, `.md`, `.pdf`, `.doc`, `.docx`
- **Automatically extracts text and vectorizes it**

**How to use:**
1. Click the **"Upload File"** tab
2. Drag & drop a file OR click to browse
3. Select your file (PDF, Word, text, etc.)
4. Click **"Upload"**
5. Wait for processing (you'll see a progress indicator)

**What happens behind the scenes:**
```
Your File
   ↓
Text Extraction (PDF → text, Word → text, etc.)
   ↓
Save to Supabase (documents table)
   ↓
Chunking (split into ~500 word chunks)
   ↓
Generate Embeddings (OpenAI converts each chunk to a vector)
   ↓
Store Vectors in Pinecone (with organization_id for multi-tenancy)
   ↓
Update Knowledge Graph (Neo4j - entities & relationships)
   ↓
Status: ✅ Completed
```

---

### **Tab 2: 🔗 Add URL**

**What it does:**
- Fetches content from any web page
- Extracts the main text content
- Ignores ads, navigation, footers
- **Automatically vectorizes the content**

**How to use:**
1. Click the **"Add URL"** tab
2. Paste a URL (e.g., blog post, documentation, article)
   ```
   https://example.com/blog/our-company-policy
   ```
3. Click **"Add Knowledge"**
4. Wait for processing

**Best for:**
- Company blogs
- Documentation pages
- News articles
- Product pages
- Help center articles

---

### **Tab 3: 📝 Add Text** ⭐ RECOMMENDED!

**What it does:**
- Type or paste text directly
- No file upload needed
- **Automatically vectorizes the content**

**How to use:**
1. Click the **"Add Text"** tab
2. Type or paste your content into the text area
3. Click **"Add Text"**
4. Wait for processing

**Example content to add:**

```
Company Policy: Remote Work Guidelines

Employees can work remotely up to 3 days per week.
Remote work days must be scheduled in advance.
Core hours (10 AM - 3 PM) require availability on Slack.
Monthly in-office meetings are mandatory.
VPN must be used for all company systems.
```

**Best for:**
- Company policies
- FAQs
- Product specifications
- Internal procedures
- Quick notes
- Copied content from emails/documents

---

## 🔍 How AI Agents Use Your Knowledge

Once you add information to the KB, here's what happens when someone asks a question:

### Example Scenario:

**1. You add this to KB (via "Add Text" tab):**
```
Our return policy allows customers to return items within 30 days
of purchase for a full refund. Items must be in original packaging
and unused. Customers need to provide the original receipt.
```

**2. User asks your AI agent:**
```
"What is your return policy?"
```

**3. Behind the scenes:**
```
User Question: "What is your return policy?"
   ↓
Convert question to vector (embedding)
   ↓
Search Pinecone for similar vectors (semantic search)
   ↓
Find: "Our return policy allows customers to return items..."
   ↓
Retrieve the matched content
   ↓
Send to LLM with prompt:
   "Based on this context: [retrieved content]
    Answer the user's question: What is your return policy?"
   ↓
AI Response: "Our return policy allows customers to return items
   within 30 days of purchase for a full refund. Items must be
   in original packaging, unused, and you'll need the original receipt."
```

**The magic:** The AI agent doesn't hallucinate! It uses YOUR actual knowledge to answer questions accurately.

---

## ✨ Advanced Features

### 🔐 Multi-Tenancy (Organization Isolation)

Every piece of knowledge you add is tagged with your `organization_id`:

- **Vectors in Pinecone** include `organization_id` in metadata
- **Queries filter** by `organization_id` automatically
- **Other organizations can't see your data** (enforced at vector search level)

### 🧠 Semantic Search

Traditional search looks for exact keywords. Semantic search understands **meaning**:

**Example:**
- You add: "Employees receive 15 vacation days per year"
- User asks: "How much PTO do I get?"
- Semantic search finds it! (Even though "PTO" ≠ "vacation days")

### 📊 Knowledge Graph (Neo4j)

While vectors handle semantic search, the knowledge graph tracks:
- **Entities**: People, products, concepts
- **Relationships**: "John works for Marketing", "Product X is made by Factory Y"
- **Context**: How things relate to each other

---

## 📋 Quick Start Checklist

To start using the Knowledge Base effectively:

1. ✅ **Navigate to Knowledge Base** page
2. ✅ **Click "Add Text" tab** (easiest to start with)
3. ✅ **Paste or type your first piece of knowledge**
   - Try: Company policy, FAQ, product info
4. ✅ **Click "Add Text"** and wait for "✅ Completed" status
5. ✅ **Create or select an AI agent**
6. ✅ **Ask a question** related to what you just added
7. ✅ **Verify** the agent uses your knowledge in the answer!

---

## 🎯 Example Use Cases

### Use Case 1: HR Policies
**Add to KB:**
```
Sick Leave Policy:
- 10 sick days per year
- Can be used for personal illness or caring for family
- Doctor's note required after 3 consecutive days
- Unused sick days don't roll over to next year
```

**Agent can answer:**
- "How many sick days do I get?"
- "Do I need a doctor's note if I'm sick for 2 days?"
- "Can I use sick leave for my child's illness?"

### Use Case 2: Product Information
**Add to KB:**
```
Product: CloudSync Pro
- Cloud storage service with 1TB capacity
- Pricing: $9.99/month or $99/year
- Features: Auto-sync, end-to-end encryption, mobile apps
- Supported platforms: Windows, Mac, iOS, Android
- Free trial: 30 days, no credit card required
```

**Agent can answer:**
- "What's the pricing for CloudSync Pro?"
- "Does it work on Android?"
- "How much storage do I get?"

### Use Case 3: Customer Support
**Add to KB:**
```
Common Issue: Password Reset

To reset your password:
1. Click "Forgot Password" on the login page
2. Enter your email address
3. Check your email for a reset link (valid for 1 hour)
4. Click the link and create a new password
5. Password must be at least 8 characters with 1 number

If you don't receive the email:
- Check spam folder
- Verify the email address is correct
- Contact support@example.com
```

**Agent can answer:**
- "How do I reset my password?"
- "I didn't get the password reset email, what do I do?"
- "How long is the reset link valid?"

---

## 🔧 Troubleshooting

### "OpenAI not configured" warning
- **Cause**: OpenAI API key not set in environment variables
- **Impact**: Can't generate embeddings (vectors)
- **Solution**: Add `VITE_OPENAI_API_KEY` to your `.env` file

### "Vector store not available" warning
- **Cause**: Pinecone not configured or backend not running
- **Impact**: Can't store/search vectors
- **Solution**: 
  1. Ensure backend is running: `.\start-backend.ps1`
  2. Check Pinecone credentials in `.env`

### PDF upload fails
- **Status**: ✅ FIXED! (as of this update)
- **What was fixed**: Added fallback CDN URLs for PDF.js worker
- **If still failing**: Check console for specific error and verify network connectivity

---

## 🎉 Summary

You now have **3 working methods** to add knowledge:

1. ✅ **Upload File** (PDF, Word, text) - NOW WORKING!
2. ✅ **Add URL** (web pages, articles)
3. ✅ **Add Text** (direct input) - EASIEST!

All three methods:
- ✅ Save to database
- ✅ Generate vectors (embeddings)
- ✅ Store in Pinecone with organization isolation
- ✅ Update knowledge graph
- ✅ Make knowledge available to AI agents immediately

**Your AI agents will now answer questions using YOUR knowledge, not generic information!** 🚀


