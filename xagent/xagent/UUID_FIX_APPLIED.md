# ✅ UUID Fix Applied!

## 🔧 **Issue:**
Your `tools` table uses **UUID** for `id` field, not text strings.

Error was:
```
ERROR: invalid input syntax for type uuid: "hdfc-bank-api"
```

## ✅ **Fixed:**

Changed:
```sql
-- ❌ BEFORE:
'hdfc-bank-api'  -- Text string

-- ✅ AFTER:
'550e8400-e29b-41d4-a716-446655440001'::uuid  -- Proper UUID
```

## 📄 **Updated File:**
`supabase/migrations/20250121_add_banking_tools.sql`

**Changes:**
- ✅ HDFC tool ID: `550e8400-e29b-41d4-a716-446655440001`
- ✅ ICICI tool ID: `550e8400-e29b-41d4-a716-446655440002`
- ✅ Added `is_system_tool` column (was missing)
- ✅ Fixed verification query to use UUIDs

## ⚡ **Run It Now:**

The SQL file is already open in your editor!

1. **Copy all content** from the file
2. **Go to:** Supabase Dashboard → SQL Editor
3. **Paste & Run**
4. **Refresh frontend** (Ctrl+Shift+R)

## 🎉 **Expected Result:**

```sql
-- Verification will show:
id                                   | name           | type   | is_active
550e8400-e29b-41d4-a716-446655440001 | HDFC Bank API  | custom | true
550e8400-e29b-41d4-a716-446655440002 | ICICI Bank API | custom | true
```

**Ready to run!** ✅



