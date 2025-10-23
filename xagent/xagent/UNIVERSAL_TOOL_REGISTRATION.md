# 🌐 Universal Tool Registration System

## ✅ **You Already Have This!** 

Your platform supports **dynamic tool registration** - banks can register their APIs without code changes!

---

## 🎯 **How Banks Register Their APIs**

### **Step 1: Create JSON Configuration**

Each bank creates a JSON file defining their API:

```json
{
  "id": "mybank_api",
  "name": "MyBank API Integration",
  "description": "Core banking APIs for customer operations",
  "category": "integration",
  "provider": "MyBank Ltd.",
  "version": "1.0.0",
  "isActive": true,
  "requiresAuth": true,
  
  "auth": {
    "type": "bearer",
    "credentials": {
      "api_key": "{{MYBANK_API_KEY}}",
      "base_url": "{{MYBANK_API_URL}}"
    }
  },
  
  "skills": [
    {
      "id": "mybank_balance",
      "name": "get_account_balance",
      "description": "Get account balance",
      
      "request": {
        "method": "GET",
        "url": "{{base_url}}/accounts/{{account_id}}/balance",
        "headers": {
          "Authorization": "Bearer {{api_key}}"
        }
      },
      
      "parameters": {
        "account_id": {
          "type": "string",
          "required": true,
          "description": "Account number"
        }
      },
      
      "response": {
        "extractPath": "data.balance",
        "successMessage": "Balance: ₹{{response}}"
      },
      
      "errorHandling": {
        "useBrowserFallback": true,
        "browserFallbackConfig": {
          "websiteUrl": "https://netbanking.mybank.com",
          "searchQuery": "MyBank netbanking login"
        }
      }
    }
  ]
}
```

---

### **Step 2: Upload via UI**

1. **Navigate:** Settings → Tools → Dynamic Tool Manager
2. **Click:** "Upload Tool" button
3. **Select:** Your JSON file (e.g., `hdfc_bank_api.json`)
4. **System:**
   - ✅ Validates JSON
   - ✅ Saves to `dynamic_tools` table in Supabase
   - ✅ Loads tool into registry
   - ✅ Makes skills available to all agents

---

### **Step 3: Configure Environment Variables**

Add API credentials to `.env`:

```bash
# HDFC Bank
HDFC_API_KEY=your_hdfc_api_key_here
HDFC_API_URL=https://api.hdfcbank.com

# ICICI Bank  
ICICI_API_KEY=your_icici_api_key_here
ICICI_API_URL=https://api.icicibank.com

# SBI Bank
SBI_API_KEY=your_sbi_api_key_here
SBI_API_URL=https://api.sbi.co.in
```

---

### **Step 4: Attach to Agents**

Via Agent Builder:
1. Create/Edit agent
2. Set type: `tool_enabled`
3. **Tools tab** → Select "HDFC Bank API"
4. Save

**Agent now has:**
- ✅ All HDFC API skills
- ✅ Browser automation fallback
- ✅ Works even if API fails

---

## 🏦 **Example: Multiple Banks on Same Platform**

### **Scenario:** Multi-bank support platform

```
Platform has 3 banking agents:
├─ HDFC Support Agent (uses hdfc_bank_api tool)
├─ ICICI Support Agent (uses icici_bank_api tool)
└─ SBI Support Agent (uses sbi_bank_api tool)

Each tool has:
├─ get_account_balance
├─ block_card
├─ check_loan_eligibility
└─ Browser automation fallback for ALL
```

**User Experience:**
- Selects their bank agent
- Asks "Check my balance"
- Agent uses that bank's API
- If API fails → Browser automation to that bank's portal
- **Seamless, no errors!**

---

## 🌐 **The Intelligence: Auto-Fallback**

### **What Happens When API Fails:**

```javascript
// In DynamicToolLoader.ts (already enhanced)

async executeSkill(skillConfig, context) {
  try {
    // Try API call
    const result = await this.callAPI(url, method, body);
    return { success: true, data: result };
    
  } catch (apiError) {
    // Check if browser fallback enabled
    if (skillConfig.errorHandling?.useBrowserFallback) {
      console.log('🌐 API failed, using browser automation...');
      
      return {
        success: false,
        error: apiError.message,
        metadata: {
          shouldFallbackToBrowser: true,
          browserFallbackConfig: skillConfig.errorHandling.browserFallbackConfig
        }
      };
    }
  }
}
```

Then `ToolEnabledAgent` catches `shouldFallbackToBrowser` and triggers browser automation!

---

## 📋 **Tool Registration Process**

### **For Bank IT Teams:**

1. **Get API Documentation** from your core banking system
2. **Map APIs to skills** using our JSON schema
3. **Upload JSON** via Dynamic Tool Manager UI
4. **Configure credentials** in environment variables
5. **Test** using built-in test function
6. **Deploy** - all agents can now use your APIs!

### **No Code Changes Required!** ✅

---

## 🔧 **What's Already Built:**

✅ **DynamicToolLoader.ts** - Loads tools from JSON  
✅ **DynamicToolManager.tsx** - UI for uploading/managing tools  
✅ **Supabase `dynamic_tools` table** - Stores configurations  
✅ **Tool Registry** - Registers tools globally  
✅ **ToolEnabledAgent** - Uses tools with fallback  
✅ **Browser Fallback** - Universal backup  

---

## 🚀 **How to Use Right Now:**

### **Step 1: Go to Dynamic Tool Manager**
Navigate to: Settings → Tools (or `/tools/dynamic`)

### **Step 2: Upload Bank API Config**
- Click "Upload Tool"
- Select `tool_configs/hdfc_bank_api.json`
- Tool registered! ✅

### **Step 3: Add Credentials**
Add to `.env`:
```bash
HDFC_API_KEY=test_key_123
HDFC_API_URL=https://api.mockbank.com
```

### **Step 4: Create Banking Agent**
- Agent Builder → Type: `tool_enabled`
- Tools tab → Select "HDFC Bank API"
- Save

### **Step 5: Test!**
Ask agent: "Check my account balance for 123456789"

**Expected Flow:**
1. Agent calls `get_account_balance` skill
2. DynamicTool makes API call to HDFC
3. **If API works** → Instant response ✅
4. **If API fails** → Browser opens → Netbanking login → Extract balance ✅

---

## 📊 **Benefits of This Approach:**

✅ **Universal** - Works for ANY bank's API  
✅ **No Code** - Pure JSON configuration  
✅ **Multi-Tenant** - Each org can have different bank tools  
✅ **Fallback** - Browser automation if API unavailable  
✅ **Scalable** - Add unlimited banks  
✅ **Versioned** - Update tools without breaking agents  
✅ **Testable** - Built-in test function  
✅ **Secure** - Credentials in env vars, not JSON  

---

## 📁 **Example Configs Provided:**

- `tool_configs/hdfc_bank_api.json` - HDFC Bank integration
- `tool_configs/icici_bank_api.json` - ICICI Bank integration

**Banks can use these as templates!**

---

## 🎯 **Summary**

**You asked:** *"How will we handle different banks' APIs intelligently?"*

**Answer:** ✅ **Already implemented!**

1. **Dynamic Tool Loader** - Loads tools from JSON
2. **Tool Manager UI** - Upload/manage tools visually
3. **Browser Fallback** - Works even if API unavailable
4. **Multi-Bank Support** - Unlimited banks can register
5. **Zero Code Changes** - Pure configuration

**Your system is already universal and intelligent!** 🚀

Banks just need to:
1. Create JSON config
2. Upload via UI
3. Add credentials to `.env`
4. Done!

**Test it now:** Upload `tool_configs/hdfc_bank_api.json` via Dynamic Tool Manager!



