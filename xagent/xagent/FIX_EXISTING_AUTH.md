# Fix Authentication for Existing Database

## 🎯 Problem
You have existing tables and data in Supabase, but authentication isn't working properly.

---

## 🔍 Diagnosis Steps

### Step 1: Check Auth Users vs Public Users

Go to Supabase Dashboard → SQL Editor and run:

```sql
-- Check auth.users
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 10;

-- Check public.users
SELECT id, email, role, created_at 
FROM public.users 
ORDER BY created_at DESC 
LIMIT 10;

-- Find users in auth but NOT in public (this is the problem!)
SELECT a.id, a.email, a.created_at
FROM auth.users a
LEFT JOIN public.users p ON a.id = p.id
WHERE p.id IS NULL;
```

---

## 🔧 Common Issues & Fixes

### Issue 1: Users exist in auth.users but not in public.users

**Fix:** Sync existing auth users to public.users

```sql
-- Create/update sync function
CREATE OR REPLACE FUNCTION public.sync_user_data()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.users (id, email, role, permissions, metadata)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    COALESCE(NEW.raw_user_meta_data->'permissions', '[]'::jsonb),
    COALESCE(NEW.raw_user_meta_data, '{}'::jsonb)
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    role = COALESCE(EXCLUDED.role, users.role),
    permissions = COALESCE(EXCLUDED.permissions, users.permissions),
    metadata = COALESCE(EXCLUDED.metadata, users.metadata),
    updated_at = now();
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error syncing user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_data();

-- IMPORTANT: Sync ALL existing auth users to public.users
INSERT INTO public.users (id, email, role, permissions, metadata)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'role', 'user') as role,
  COALESCE(raw_user_meta_data->'permissions', '[]'::jsonb) as permissions,
  COALESCE(raw_user_meta_data, '{}'::jsonb) as metadata
FROM auth.users
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  updated_at = now();
```

---

### Issue 2: RLS Policies Too Restrictive

Check if RLS is blocking access:

```sql
-- Check current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'users';

-- If policies are too restrictive, update them:
DROP POLICY IF EXISTS "Public users are viewable by everyone" ON public.users;
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "Users can insert" ON public.users;
DROP POLICY IF EXISTS "Users can update own record" ON public.users;

-- Create permissive policies
CREATE POLICY "Allow authenticated to view all users"
  ON public.users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated to insert users"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow users to update own data"
  ON public.users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);
```

---

### Issue 3: Missing or Wrong Schema

Check if users table has correct structure:

```sql
-- Check table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'users'
ORDER BY ordinal_position;

-- If structure is wrong, add missing columns:
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS permissions jsonb DEFAULT '[]';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
```

---

## 🧪 Test After Fixes

### 1. Verify Sync Worked
```sql
-- Should show same count
SELECT 'auth.users' as table_name, COUNT(*) as count FROM auth.users
UNION ALL
SELECT 'public.users' as table_name, COUNT(*) as count FROM public.users;

-- Should return no rows (all synced)
SELECT a.email
FROM auth.users a
LEFT JOIN public.users p ON a.id = p.id
WHERE p.id IS NULL;
```

### 2. Test Login
1. Go to: https://devai.neoworks.ai/login
2. Use existing credentials
3. Should work now!

### 3. Check Test Page
Go to: https://devai.neoworks.ai/test/supabase
- All tests should pass ✓

---

## 🔐 Check Email Confirmation

If users can't login, they might need email confirmation:

```sql
-- Check if users are confirmed
SELECT id, email, email_confirmed_at, created_at
FROM auth.users
ORDER BY created_at DESC;

-- If email_confirmed_at is NULL, confirm them:
UPDATE auth.users
SET email_confirmed_at = now(),
    confirmed_at = now()
WHERE email_confirmed_at IS NULL;
```

---

## 🚨 Emergency: Disable RLS Temporarily (Testing Only!)

**⚠️ Only use this for testing, re-enable after!**

```sql
-- Temporarily disable RLS to test
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Test your app...

-- Re-enable when done testing
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
```

---

## 📋 Complete Fix Script (Run This)

Here's a complete script that should fix everything:

```sql
-- 1. Ensure users table exists with correct structure
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'user',
  permissions jsonb DEFAULT '[]',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Add missing columns if needed
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS permissions jsonb DEFAULT '[]';

-- 3. Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 4. Drop old policies
DROP POLICY IF EXISTS "Public users are viewable by everyone" ON public.users;
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "Users can insert" ON public.users;
DROP POLICY IF EXISTS "Users can update own record" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated to view all users" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated to insert users" ON public.users;

-- 5. Create new permissive policies
CREATE POLICY "Authenticated users can view all"
  ON public.users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own data"
  ON public.users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- 6. Create/update sync function
CREATE OR REPLACE FUNCTION public.sync_user_data()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.users (id, email, role, permissions, metadata)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    COALESCE(NEW.raw_user_meta_data->'permissions', '[]'::jsonb),
    COALESCE(NEW.raw_user_meta_data, '{}'::jsonb)
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    updated_at = now();
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error syncing user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 7. Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_data();

-- 8. Sync existing users from auth to public
INSERT INTO public.users (id, email, role, permissions, metadata)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'role', 'user') as role,
  COALESCE(raw_user_meta_data->'permissions', '[]'::jsonb) as permissions,
  COALESCE(raw_user_meta_data, '{}'::jsonb) as metadata
FROM auth.users
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  updated_at = now();

-- 9. Confirm all emails (if needed for testing)
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, now()),
    confirmed_at = COALESCE(confirmed_at, now())
WHERE email_confirmed_at IS NULL;

-- 10. Verify sync
SELECT 
  (SELECT COUNT(*) FROM auth.users) as auth_users_count,
  (SELECT COUNT(*) FROM public.users) as public_users_count,
  (SELECT COUNT(*) FROM auth.users a LEFT JOIN public.users p ON a.id = p.id WHERE p.id IS NULL) as missing_in_public;
```

---

## ✅ After Running This Script

1. **All existing auth users** → synced to public.users
2. **Future signups** → automatically synced via trigger
3. **RLS policies** → permissive but secure
4. **Emails** → confirmed (for testing)

Now rebuild your app and try logging in! 🚀

