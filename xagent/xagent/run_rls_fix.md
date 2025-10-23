# Fix RLS Infinite Recursion - Copy & Paste Instructions

## 🚨 **URGENT: Fix Required**

Your platform is experiencing infinite recursion errors in the RLS policies. Here's how to fix it:

## 📋 **Step 1: Open Supabase Dashboard**

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **"New Query"**

## 📋 **Step 2: Copy & Paste This Script**

Copy the entire contents of the `fix_rls_infinite_recursion.sql` file and paste it into the SQL Editor.

## 📋 **Step 3: Run the Script**

1. Click **"Run"** button
2. Wait for completion
3. You should see success messages

## 🎯 **Expected Results**

After running the script, you should see:
- ✅ No more infinite recursion errors
- ✅ Organization selector should work
- ✅ Agent list should load (showing your 4 agents)
- ✅ Workflow list should load (showing your 11 workflows)

## 🚀 **Alternative: Quick Fix Script**

If you prefer, here's a minimal version that just fixes the core issue:

```sql
-- Quick fix for infinite recursion
DROP POLICY IF EXISTS "Users can view organization members" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view accessible organizations" ON public.organizations;

CREATE POLICY "Users can view their own memberships"
  ON public.organization_members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view organizations they belong to"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );
```

## ⚠️ **Important Notes**

- This will temporarily disable some advanced RLS features
- The basic multi-tenancy will still work
- You can enhance the policies later once the platform is working

## 🔧 **After Running the Fix**

1. Refresh your browser
2. Login again with `admin@example.com`
3. Check that the organization selector appears
4. Verify that agents and workflows load properly

---

**Ready to fix the infinite recursion issue?** 🚀
