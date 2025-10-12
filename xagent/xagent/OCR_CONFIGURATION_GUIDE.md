# 🔍 OCR Configuration Guide

## ✅ **ENHANCED EXISTING OCRProcessor.ts**

**File:** `src/services/document/OCRProcessor.ts`

**No new files created - existing component enhanced!** ✅

---

## 🎯 **SUPPORTED OCR ENGINES:**

```
✅ Tesseract.js (Local, Free)
✅ PaddleOCR (Self-hosted/Cloud)
✅ AWS Textract (Cloud, Powerful)
✅ Azure Form Recognizer (Cloud, Forms)
✅ Google Cloud Vision (Cloud, General)
✅ Custom IDP Solution (Your own endpoint)
```

---

## 🔧 **CONFIGURATION:**

### **Method 1: Environment Variables (Recommended)**

Create or update `.env` file in project root:

```bash
# ============================================
# OCR ENGINE CONFIGURATION
# ============================================

# Choose OCR Engine (default: tesseract)
# Options: tesseract | paddle | aws_textract | azure_form | google_vision | custom
VITE_OCR_ENGINE=tesseract

# ============================================
# TESSERACT (Local, Free)
# ============================================
VITE_TESSERACT_LANGUAGE=eng
# Multi-language: eng+spa+fra

# ============================================
# PADDLEOCR (Self-hosted or Cloud)
# ============================================
# If using custom endpoint
# VITE_CUSTOM_OCR_ENDPOINT=http://localhost:8866/predict/ocr_system

# ============================================
# AWS TEXTRACT (Cloud, Best for forms)
# ============================================
# VITE_OCR_ENGINE=aws_textract
# VITE_AWS_REGION=us-east-1
# VITE_AWS_ACCESS_KEY=your-access-key
# VITE_AWS_SECRET_KEY=your-secret-key

# ============================================
# AZURE FORM RECOGNIZER (Cloud, Forms)
# ============================================
# VITE_OCR_ENGINE=azure_form
# VITE_AZURE_FORM_RECOGNIZER_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
# VITE_AZURE_FORM_RECOGNIZER_KEY=your-key

# ============================================
# GOOGLE CLOUD VISION (Cloud, General)
# ============================================
# VITE_OCR_ENGINE=google_vision
# VITE_GOOGLE_VISION_API_KEY=your-api-key

# ============================================
# CUSTOM IDP SOLUTION (Your own endpoint)
# ============================================
# VITE_OCR_ENGINE=custom
# VITE_CUSTOM_OCR_ENDPOINT=https://your-idp-service.com/api/ocr
# VITE_CUSTOM_OCR_API_KEY=your-api-key
# VITE_CUSTOM_OCR_HEADERS={"X-Custom-Header":"value"}
```

---

## 🚀 **USAGE EXAMPLES:**

### **Example 1: Tesseract (Default - No Config Needed)**

```bash
# .env
# No configuration needed - works out of the box!
# Or explicitly set:
VITE_OCR_ENGINE=tesseract
VITE_TESSERACT_LANGUAGE=eng
```

**Benefits:**
- ✅ Free, local, no API keys
- ✅ Works offline
- ✅ Multi-language support
- ⚠️ Slower than cloud solutions

---

### **Example 2: PaddleOCR (Better Accuracy)**

```bash
# .env
VITE_OCR_ENGINE=paddle
VITE_CUSTOM_OCR_ENDPOINT=http://localhost:8866/predict/ocr_system
```

**Setup PaddleOCR Server:**
```bash
# Install PaddlePaddle
pip install paddlepaddle paddleocr

# Run server
paddleocr --lang=en --use_gpu=false --port=8866
```

**Benefits:**
- ✅ Better accuracy than Tesseract
- ✅ Good for Asian languages
- ✅ Can run locally or cloud
- ⚠️ Requires Python setup

---

### **Example 3: AWS Textract (Best for Forms)**

```bash
# .env
VITE_OCR_ENGINE=aws_textract
VITE_AWS_REGION=us-east-1
VITE_AWS_ACCESS_KEY=AKIA...
VITE_AWS_SECRET_KEY=wJalr...
```

**Install AWS SDK:**
```bash
npm install @aws-sdk/client-textract
```

**Benefits:**
- ✅ Excellent form/table extraction
- ✅ Key-value pair detection
- ✅ Multi-page document support
- ⚠️ Requires AWS account & costs money

---

### **Example 4: Google Cloud Vision**

```bash
# .env
VITE_OCR_ENGINE=google_vision
VITE_GOOGLE_VISION_API_KEY=AIzaSy...
```

**Benefits:**
- ✅ High accuracy
- ✅ Good multi-language support
- ✅ Handwriting recognition
- ⚠️ Requires Google Cloud account & API key

---

### **Example 5: Azure Form Recognizer**

```bash
# .env
VITE_OCR_ENGINE=azure_form
VITE_AZURE_FORM_RECOGNIZER_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
VITE_AZURE_FORM_RECOGNIZER_KEY=your-key
```

**Install Azure SDK:**
```bash
npm install @azure/ai-form-recognizer
```

**Benefits:**
- ✅ Excellent for structured forms
- ✅ Receipt/invoice processing
- ✅ Custom model training
- ⚠️ Requires Azure account

---

### **Example 6: Custom IDP Solution**

```bash
# .env
VITE_OCR_ENGINE=custom
VITE_CUSTOM_OCR_ENDPOINT=https://your-company-idp.com/api/extract
VITE_CUSTOM_OCR_API_KEY=your-secret-key
VITE_CUSTOM_OCR_HEADERS={"X-Company-ID":"12345"}
```

**Your IDP endpoint should accept:**
```json
POST /api/extract
{
  "image": "base64_or_url",
  "options": {
    "document_type": "resume",
    "language": "en"
  }
}
```

**And return:**
```json
{
  "text": "Extracted text content...",
  "confidence": 0.95,
  "fields": {
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

**Benefits:**
- ✅ Use your existing IDP infrastructure
- ✅ Custom processing logic
- ✅ Your own pricing/limits
- ✅ Full control

---

## 💻 **CODE USAGE:**

### **Existing code works automatically!**

```typescript
import { OCRProcessor } from './services/document/OCRProcessor';

// Get singleton instance (reads config from .env automatically)
const ocrProcessor = OCRProcessor.getInstance();

// Process document (uses configured engine)
const text = await ocrProcessor.processImage(document);

// Or get detailed results
const result = await ocrProcessor.processImageDetailed(document);
console.log('Text:', result.text);
console.log('Confidence:', result.confidence);
console.log('Fields:', result.fields); // For structured extraction
```

### **Check current engine:**

```typescript
const engine = ocrProcessor.getEngine();
console.log('Using:', engine); // 'tesseract', 'paddle', etc.

const capabilities = ocrProcessor.getCapabilities();
console.log('Supports structured data?', capabilities.supportsStructuredData);
console.log('Is local?', capabilities.isLocal);
console.log('Requires API key?', capabilities.requiresAPIKey);
```

---

## 🎯 **COMPARISON:**

```
┌──────────────┬──────────┬───────────┬─────────┬───────────┬──────────┐
│ Engine       │ Accuracy │ Speed     │ Cost    │ Setup     │ Offline  │
├──────────────┼──────────┼───────────┼─────────┼───────────┼──────────┤
│ Tesseract    │ ⭐⭐⭐    │ ⭐⭐      │ Free    │ Easy      │ ✅ Yes   │
│ PaddleOCR    │ ⭐⭐⭐⭐   │ ⭐⭐⭐    │ Free    │ Medium    │ ✅ Yes   │
│ AWS Textract │ ⭐⭐⭐⭐⭐  │ ⭐⭐⭐⭐   │ $$$     │ Easy      │ ❌ No    │
│ Azure Form   │ ⭐⭐⭐⭐⭐  │ ⭐⭐⭐⭐   │ $$$     │ Easy      │ ❌ No    │
│ Google Vision│ ⭐⭐⭐⭐⭐  │ ⭐⭐⭐⭐⭐  │ $$      │ Easy      │ ❌ No    │
│ Custom IDP   │ Varies   │ Varies    │ Varies  │ Varies    │ Varies   │
└──────────────┴──────────┴───────────┴─────────┴───────────┴──────────┘
```

---

## 📝 **RECOMMENDATIONS:**

### **For Development/Testing:**
```
✅ Use Tesseract
   - No setup required
   - Free
   - Good enough for testing
```

### **For Small Business:**
```
✅ Use PaddleOCR
   - Better accuracy
   - Still free
   - Self-hosted option
```

### **For Enterprise (Forms/Invoices):**
```
✅ Use AWS Textract or Azure Form Recognizer
   - Excellent accuracy
   - Structured data extraction
   - Table/form support
   - Worth the cost
```

### **For Enterprise (Existing IDP):**
```
✅ Use Custom IDP
   - Leverage existing infrastructure
   - Already paid for
   - Company-specific logic
```

---

## 🔄 **SWITCHING ENGINES:**

**Super easy - just change one variable!**

```bash
# Today: Using Tesseract
VITE_OCR_ENGINE=tesseract

# Tomorrow: Upgrade to AWS Textract
VITE_OCR_ENGINE=aws_textract
VITE_AWS_ACCESS_KEY=...
VITE_AWS_SECRET_KEY=...

# No code changes needed! 🎉
```

---

## 🧪 **TESTING:**

```typescript
// Test different engines
import { OCRProcessor } from './services/document/OCRProcessor';

const processor = OCRProcessor.getInstance();

console.log('Current engine:', processor.getEngine());
console.log('Capabilities:', processor.getCapabilities());

// Process test document
const result = await processor.processImageDetailed(testDocument);
console.log('✅ Text extracted:', result.text);
console.log('✅ Confidence:', result.confidence);
console.log('✅ Engine used:', result.metadata.engine);
```

---

## 🎊 **SUMMARY:**

```
✅ Enhanced EXISTING OCRProcessor.ts (no new files!)
✅ Supports 6 OCR engines
✅ Configurable via environment variables
✅ Easy to switch engines (one variable!)
✅ Works with existing DocumentUpload component
✅ Tesseract works by default (no config needed)
✅ Can integrate any custom IDP solution
✅ Production-ready!
```

---

## 🚀 **GET STARTED:**

### **Quick Start (Tesseract - Default):**
```bash
# No configuration needed!
# Just use the app - works out of the box
```

### **Use PaddleOCR:**
```bash
# .env
VITE_OCR_ENGINE=paddle
VITE_CUSTOM_OCR_ENDPOINT=http://localhost:8866/predict/ocr_system

# Terminal
paddleocr --lang=en --port=8866
```

### **Use Cloud OCR:**
```bash
# .env
VITE_OCR_ENGINE=google_vision
VITE_GOOGLE_VISION_API_KEY=your-key

# Done! Cloud OCR enabled
```

### **Use Your IDP:**
```bash
# .env
VITE_OCR_ENGINE=custom
VITE_CUSTOM_OCR_ENDPOINT=https://your-idp.com/api
VITE_CUSTOM_OCR_API_KEY=your-key

# Your IDP is now integrated!
```

---

**No new components created - existing OCRProcessor enhanced!** ✅

**User can choose any OCR engine they're comfortable with!** ✅

**Supports custom IDP integration!** ✅

