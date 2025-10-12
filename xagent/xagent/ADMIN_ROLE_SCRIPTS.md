# 🔑 Admin Role Database Scripts

## 📋 Overview

Your database has a `public.users` table with a `role` column that supports:
- `'admin'` - Full access
- `'user'` - Regular user (default)
- `'manager'` - Manager level access

---

## 🎯 Scripts to Make Users Admin

### **Script 1: Make Specific User Admin by Email**

```sql
-- Make a specific user admin by email
UPDATE public.users 
SET role = 'admin',
    permissions = '["admin:access", "admin:users", "admin:system"]'::jsonb,
    updated_at = now()
WHERE email = 'your-email@example.com';

-- Verify the change
SELECT id, email, role, permissions, updated_at 
FROM public.users 
WHERE email = 'your-email@example.com';
```

### **Script 2: Make First User Admin**

```sql
-- Make the first registered user admin
UPDATE public.users 
SET role = 'admin',
    permissions = '["admin:access", "admin:users", "admin:system"]'::jsonb,
    updated_at = now()
WHERE id = (
    SELECT id 
    FROM public.users 
    ORDER BY created_at ASC 
    LIMIT 1
);

-- Verify the change
SELECT id, email, role, permissions, created_at 
FROM public.users 
WHERE role = 'admin';
```

### **Script 3: Make User Admin by User ID**

```sql
-- Make a user admin by their UUID
UPDATE public.users 
SET role = 'admin',
    permissions = '["admin:access", "admin:users", "admin:system"]'::jsonb,
    updated_at = now()
WHERE id = 'your-user-uuid-here';

-- Verify the change
SELECT id, email, role, permissions 
FROM public.users 
WHERE id = 'your-user-uuid-here';
```

### **Script 4: Make Multiple Users Admin**

```sql
-- Make multiple users admin by email list
UPDATE public.users 
SET role = 'admin',
    permissions = '["admin:access", "admin:users", "admin:system"]'::jsonb,
    updated_at = now()
WHERE email IN (
    'admin1@example.com',
    'admin2@example.com',
    'admin3@example.com'
);

-- Verify the changes
SELECT id, email, role, permissions 
FROM public.users 
WHERE role = 'admin';
```

---

## 🔍 Verification Scripts

### **Check All Users and Their Roles**

```sql
-- View all users with their roles
SELECT 
    id,
    email,
    role,
    permissions,
    created_at,
    updated_at
FROM public.users 
ORDER BY created_at DESC;
```

### **Check Admin Users Only**

```sql
-- View only admin users
SELECT 
    id,
    email,
    role,
    permissions,
    created_at
FROM public.users 
WHERE role = 'admin'
ORDER BY created_at;
```

### **Check User Count by Role**

```sql
-- Count users by role
SELECT 
    role,
    COUNT(*) as user_count
FROM public.users 
GROUP BY role
ORDER BY user_count DESC;
```

---

## 🚨 Emergency Admin Access

### **Script 5: Create Admin User Directly (If No Users Exist)**

```sql
-- If you have no users yet, create an admin user directly
-- First, you need to create the auth user, then sync to public.users

-- Step 1: Create auth user (you'll need to do this through Supabase Dashboard)
-- Go to: Authentication → Users → Invite User
-- Email: admin@example.com
-- Password: your-secure-password

-- Step 2: After user signs up, make them admin
UPDATE public.users 
SET role = 'admin',
    permissions = '["admin:access", "admin:users", "admin:system", "admin:automation"]'::jsonb,
    updated_at = now()
WHERE email = 'admin@example.com';

-- Step 3: Verify
SELECT id, email, role, permissions 
FROM public.users 
WHERE email = 'admin@example.com';
```

### **Script 6: Make Yourself Admin (If You're Already a User)**

```sql
-- If you're already registered, just update your role
-- Replace 'your-actual-email@example.com' with your real email

UPDATE public.users 
SET role = 'admin',
    permissions = '["admin:access", "admin:users", "admin:system", "admin:automation"]'::jsonb,
    updated_at = now()
WHERE email = 'your-actual-email@example.com';

-- Verify you're now admin
SELECT id, email, role, permissions 
FROM public.users 
WHERE email = 'your-actual-email@example.com';
```

---

## 🎯 Quick Commands

### **Most Common Use Case: Make Yourself Admin**

```sql
-- Replace with your actual email
UPDATE public.users 
SET role = 'admin',
    permissions = '["admin:access"]'::jsonb,
    updated_at = now()
WHERE email = 'your-email@example.com';
```

### **Make All Current Users Admin (Use Carefully!)**

```sql
-- WARNING: This makes ALL users admin - use with caution!
UPDATE public.users 
SET role = 'admin',
    permissions = '["admin:access"]'::jsonb,
    updated_at = now();

-- Check the result
SELECT COUNT(*) as admin_count FROM public.users WHERE role = 'admin';
```

---

## 📊 Admin Permissions Structure

### **Full Admin Permissions**

```json
{
  "admin:access": "Access admin dashboard",
  "admin:users": "Manage users",
  "admin:system": "System configuration",
  "admin:automation": "Manage automation",
  "admin:knowledge": "Manage knowledge base",
  "admin:agents": "Manage AI agents"
}
```

### **Limited Admin Permissions**

```json
{
  "admin:access": "Access admin dashboard",
  "admin:users": "View users only"
}
```

---

## 🔧 How to Run These Scripts

### **Option 1: Supabase Dashboard (Recommended)**

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Paste the script
4. Click **Run**

### **Option 2: Database Client**

```bash
# If using psql
psql -h your-db-host -U postgres -d postgres -f admin_script.sql

# If using other clients (DBeaver, pgAdmin, etc.)
# Just run the SQL directly
```

### **Option 3: Application Code**

```typescript
// In your backend code
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(url, serviceKey);

await supabase
  .from('users')
  .update({ 
    role: 'admin',
    permissions: ['admin:access', 'admin:users'],
    updated_at: new Date().toISOString()
  })
  .eq('email', 'admin@example.com');
```

---

## ✅ Testing Admin Access

### **1. Check Frontend Admin Route**

After making yourself admin, try accessing:
```
http://localhost:5173/admin
```

You should see the admin dashboard instead of being redirected to `/unauthorized`.

### **2. Check Admin Permissions in Code**

```typescript
// In your frontend code
const { user } = useAuthStore();

// Check if user is admin
const isAdmin = user?.role === 'admin' || 
                user?.permissions?.includes('admin:access');

if (isAdmin) {
  // Show admin features
}
```

### **3. Check Backend Authorization**

```typescript
// In your backend
app.get('/api/admin/users', (req, res) => {
  const userRole = req.user?.role;
  
  if (userRole !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  // Admin-only logic here
});
```

---

## 🚨 Troubleshooting

### **Issue: "Permission denied"**

**Solution:** Make sure you're running as a superuser or the service role:

```sql
-- Check your current role
SELECT current_user, session_user;

-- If not superuser, use service role key in Supabase Dashboard
```

### **Issue: "Row Level Security policy violation"**

**Solution:** Temporarily disable RLS for the update:

```sql
-- Temporarily disable RLS
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Run your admin update
UPDATE public.users SET role = 'admin' WHERE email = 'your@email.com';

-- Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
```

### **Issue: "User not found"**

**Solutions:**

1. **Check if user exists:**
```sql
SELECT id, email FROM public.users WHERE email = 'your@email.com';
```

2. **Check if user exists in auth.users:**
```sql
SELECT id, email FROM auth.users WHERE email = 'your@email.com';
```

3. **Sync missing users:**
```sql
-- Run the sync script from FIX_EXISTING_AUTH.md
INSERT INTO public.users (id, email, role, permissions, metadata)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'role', 'user') as role,
  COALESCE(raw_user_meta_data->'permissions', '[]'::jsonb) as permissions,
  COALESCE(raw_user_meta_data, '{}'::jsonb) as metadata
FROM auth.users
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
```

---

## 📝 Summary

**Quickest Way to Make Yourself Admin:**

```sql
UPDATE public.users 
SET role = 'admin',
    permissions = '["admin:access"]'::jsonb,
    updated_at = now()
WHERE email = 'your-email@example.com';
```

**Then test admin access:**
```
http://localhost:5173/admin
```

**Need help?** Check the troubleshooting section or run the verification scripts to debug issues.
