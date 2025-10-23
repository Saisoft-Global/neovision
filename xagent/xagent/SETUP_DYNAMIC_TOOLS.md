# 🔧 Setup Dynamic Tools - Quick Guide

## 📋 **Issue Detected**

Your console shows:
```
⚠️ Failed to load dynamic tools (table may not exist): Could not find the table 'public.dynamic_tools' in the schema cache
```

This means the `dynamic_tools` table doesn't exist in Supabase yet.

---

## ✅ **Solution: Run Migration**

### **Option 1: Via Supabase Dashboard (Easiest)**

1. **Go to:** [Supabase Dashboard](https://supabase.com/dashboard)
2. **Select your project:** `cybstyrslstfxlabiqyy`
3. **Navigate:** SQL Editor (left sidebar)
4. **Create new query**
5. **Copy & paste** the entire content from:
   ```
   supabase/migrations/20250121_create_dynamic_tools_table.sql
   ```
6. **Click:** "Run"
7. **Verify:**
   - Tables created: `dynamic_tools`, `organization_tools`
   - 2 seed tools inserted: HDFC Bank API, ICICI Bank API

### **Option 2: Via Supabase CLI**

```bash
# If you have Supabase CLI installed
supabase db push

# Or apply specific migration
supabase migration up
```

---

## 🧪 **Verify Setup**

### **1. Check Supabase Tables**

Go to: **Table Editor** in Supabase Dashboard

You should see:
- ✅ `dynamic_tools` (2 rows: HDFC Bank API, ICICI Bank API)
- ✅ `organization_tools` (empty initially)

### **2. Refresh Frontend**

```bash
# In your browser
Ctrl + Shift + R  (Windows)
Cmd + Shift + R   (Mac)
```

### **3. Check Console**

You should now see:
```
📦 Loading dynamic tools from database...
✅ Loaded 2 dynamic tools from database
✅ Tool registered: HDFC Bank API with 3 skills
✅ Tool registered: ICICI Bank API with 1 skills
```

**Instead of the 404 error!** ✅

---

## 🎯 **What This Enables**

Once the migration runs, you'll have:

### **1. Dynamic Tool Registration** 🔧
- Banks/orgs can upload their own API tools
- No code changes needed
- Tools stored in database

### **2. Organization-Level Tool Enablement** 🏢
- Each org can enable/disable tools
- Configuration overrides per org
- Secure, isolated

### **3. Pre-Seeded Banking Tools** 🏦
- HDFC Bank API (3 skills)
- ICICI Bank API (1 skill)
- Ready to use immediately

### **4. Full Tool Lifecycle** ♻️
- Create, Read, Update, Delete
- Version control
- Activity tracking

---

## 📊 **What Gets Created**

### **Table: `dynamic_tools`**

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID | Unique tool ID |
| `name` | TEXT | Tool name (e.g., "HDFC Bank API") |
| `description` | TEXT | Tool description |
| `config` | JSONB | Full tool config (skills, endpoints, auth) |
| `organization_id` | UUID | Owner organization (NULL = public) |
| `is_active` | BOOLEAN | Enable/disable |
| `is_public` | BOOLEAN | Available to all orgs? |
| `category` | TEXT | e.g., 'banking', 'crm' |
| `tags` | TEXT[] | For search/filtering |

### **Table: `organization_tools`**

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID | Unique ID |
| `organization_id` | UUID | Which org |
| `tool_id` | UUID | Which tool |
| `enabled` | BOOLEAN | Is tool enabled? |
| `config_override` | JSONB | Org-specific config |

---

## 🔐 **Security (RLS Enabled)**

### **Row Level Security Policies:**

✅ **Users can only:**
- View tools in their organization
- View public tools (is_public = true)
- Create tools for their own organization
- Update/delete tools they own

✅ **Prevents:**
- Cross-organization data leaks
- Unauthorized tool access
- Tool tampering

---

## 🧪 **Test the Complete Flow**

### **After Migration:**

1. **Refresh frontend**
2. **Go to Agent Builder**
3. **Scroll to "Tools" section**
4. **You should see:**
   - ☐ Email Tool (5 skills)
   - ☐ CRM Tool (5 skills)
   - ☐ Zoho Tool (10 skills)
   - ☐ **HDFC Bank API (3 skills)** ← NEW!
   - ☐ **ICICI Bank API (1 skill)** ← NEW!

5. **Create a banking agent:**
   - Use "Banking Support AI Teller" template
   - Check "HDFC Bank API" tool
   - Save agent

6. **Use the agent:**
   - Ask: "Check my balance for account 123456"
   - Agent will try to call HDFC API
   - Falls back to browser if API not configured

---

## 🚀 **Next Steps**

### **For Production:**

1. **Add Environment Variables:**
   ```bash
   # .env
   HDFC_API_URL=https://api.hdfcbank.com
   HDFC_API_KEY=your_actual_hdfc_api_key
   
   ICICI_API_URL=https://api.icicibank.com
   ICICI_API_KEY=your_actual_icici_api_key
   ```

2. **Register More Tools:**
   - Go to Settings → Tools → Dynamic Tool Manager
   - Upload `tool_configs/*.json` files
   - SBI, Axis, Kotak, etc.

3. **Create Banking Agents:**
   - Use Agent Builder
   - Attach bank-specific tools
   - Deploy to customers

---

## ❓ **Troubleshooting**

### **Issue: Still getting 404 after migration**
**Solution:** 
- Clear browser cache
- Hard refresh (Ctrl+Shift+R)
- Check Supabase Table Editor confirms tables exist

### **Issue: RLS blocking inserts**
**Solution:**
- Ensure user is part of an organization
- Check `organization_members` table has your user
- Temporarily disable RLS for testing:
  ```sql
  ALTER TABLE public.dynamic_tools DISABLE ROW LEVEL SECURITY;
  ```

### **Issue: Tools not showing in UI**
**Solution:**
- Check `is_active = true` in database
- Check `is_public = true` OR your org has access
- Verify `organization_tools` table has enabled entry

---

## ✅ **Summary**

**Run the migration, refresh frontend, and you'll have:**

✅ Dynamic tool registration system  
✅ 2 pre-seeded banking API tools  
✅ Organization-level tool management  
✅ Secure RLS policies  
✅ Ready for multi-bank platform  

**Your platform is production-ready!** 🎉



