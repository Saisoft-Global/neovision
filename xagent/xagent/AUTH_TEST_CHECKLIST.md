# Authentication Testing Checklist

## ✅ Quick Verification Steps

### Step 1: Check Environment Variables

1. Verify you have a `.env` file or environment variables set with:
   ```bash
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key_here
   ```

2. If not set, create a `.env` file in the project root:
   ```bash
   # Copy from render.env.template
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### Step 2: Verify Database Setup (Supabase Dashboard)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run this query to check if users table exists:
   ```sql
   SELECT COUNT(*) FROM public.users;
   ```
4. If error occurs, run the complete fix script from `FIX_EXISTING_AUTH.md` (lines 218-321)

### Step 3: Start the Application

```bash
npm run dev
```

### Step 4: Test Supabase Connection

1. Open browser and navigate to: `http://localhost:5173/test/supabase`
2. Check all tests pass (green checkmarks):
   - ✓ Supabase Client Availability
   - ✓ Environment Variables
   - ✓ Auth Session
   - ✓ Auth User
   - ✓ Database Connection
   - ✓ Auth State Listener

### Step 5: Test User Registration

1. Navigate to: `http://localhost:5173/login`
2. Look for "Create your account" or toggle to registration mode
3. Enter test credentials:
   - Email: `test@example.com`
   - Password: `test123456` (min 6 characters)
4. Click "Sign up" or "Create account"
5. **Expected Result:** 
   - Should redirect to home page (`/`)
   - User should be logged in
   - Check Supabase Dashboard → Authentication → Users (should see new user)

### Step 6: Test User Logout

1. Look for logout button in the UI
2. Click logout
3. **Expected Result:**
   - Should redirect to `/login`
   - Session should be cleared

### Step 7: Test User Login

1. At login page: `http://localhost:5173/login`
2. Enter the credentials from Step 5:
   - Email: `test@example.com`
   - Password: `test123456`
3. Click "Sign in"
4. **Expected Result:**
   - Should redirect to home page
   - User should be logged in

### Step 8: Test Protected Routes

1. Logout if logged in
2. Try to access: `http://localhost:5173/agents`
3. **Expected Result:** Should redirect to `/login`
4. Login and try again
5. **Expected Result:** Should access the agents page

### Step 9: Test Session Persistence

1. Login
2. Refresh the page (F5)
3. **Expected Result:** Should remain logged in
4. Close browser and reopen
5. Navigate to: `http://localhost:5173`
6. **Expected Result:** Should still be logged in

## 🐛 Common Issues & Solutions

### Issue: "Supabase Client Availability" test fails

**Solution:**
- Check environment variables are set correctly
- Restart the dev server: `npm run dev`
- Clear browser cache and reload

### Issue: "Environment Variables" test fails

**Solution:**
```bash
# Create .env file in project root
echo "VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co" > .env
echo "VITE_SUPABASE_ANON_KEY=your_key_here" >> .env

# Restart dev server
npm run dev
```

### Issue: Registration succeeds but user can't login

**Solution:**
1. Check Supabase Dashboard → Authentication → Users
2. Check if user exists in `auth.users`
3. Run sync script from `FIX_EXISTING_AUTH.md`:
   ```sql
   -- Sync auth.users to public.users
   INSERT INTO public.users (id, email, role, permissions, metadata)
   SELECT 
     id,
     email,
     COALESCE(raw_user_meta_data->>'role', 'user') as role,
     COALESCE(raw_user_meta_data->'permissions', '[]'::jsonb) as permissions,
     COALESCE(raw_user_meta_data, '{}'::jsonb) as metadata
   FROM auth.users
   ON CONFLICT (id) DO UPDATE
   SET email = EXCLUDED.email, updated_at = now();
   ```

### Issue: "Invalid credentials" error

**Solutions:**
1. Check email is confirmed in Supabase:
   ```sql
   SELECT email, email_confirmed_at FROM auth.users;
   ```
2. If `email_confirmed_at` is NULL, confirm manually:
   ```sql
   UPDATE auth.users
   SET email_confirmed_at = now(),
       confirmed_at = now()
   WHERE email = 'your@email.com';
   ```

### Issue: Protected routes not working

**Solution:**
- Check browser console for errors
- Verify user object exists: Open DevTools → Console → Type: `localStorage.getItem('multi-agent-auth')`
- Should see a token/session object

## 🎯 Quick Console Checks

Open browser DevTools (F12) and run these in Console:

```javascript
// Check if Supabase is loaded
console.log('Supabase available:', !!window.supabase);

// Check localStorage for session
console.log('Session:', localStorage.getItem('multi-agent-auth'));

// Check auth state (in React app)
// This will only work if you're on a page with the auth store
```

## ✅ Success Criteria

Authentication is working properly if:

- ✅ All tests pass on `/test/supabase` page
- ✅ User can register new account
- ✅ User can login with credentials
- ✅ User can logout
- ✅ Protected routes redirect to login when not authenticated
- ✅ Session persists across page refreshes
- ✅ Session persists across browser restarts

## 📝 Test Results Template

Copy and fill this out after testing:

```
Date: ___________
Tester: ___________

Environment Variables: [ ] Pass [ ] Fail
Supabase Connection: [ ] Pass [ ] Fail
User Registration: [ ] Pass [ ] Fail
User Login: [ ] Pass [ ] Fail
User Logout: [ ] Pass [ ] Fail
Protected Routes: [ ] Pass [ ] Fail
Session Persistence: [ ] Pass [ ] Fail

Notes:
_______________________________________________________
_______________________________________________________
_______________________________________________________
```

## 🚀 Ready for Production?

Before deploying to production, ensure:

- [ ] All tests pass in development
- [ ] Environment variables configured in Render/hosting platform
- [ ] Supabase database properly set up with all migrations
- [ ] RLS policies are enabled and tested
- [ ] Email confirmation is working (or disabled for testing)
- [ ] Password reset flow is working
- [ ] Session timeout is configured appropriately
- [ ] CORS is properly configured
- [ ] SSL/HTTPS is enabled

## 📚 Additional Resources

- **Supabase Setup:** `SUPABASE_DATABASE_SETUP.md`
- **Auth Fix Guide:** `FIX_EXISTING_AUTH.md`
- **Verification Report:** `AUTH_VERIFICATION_REPORT.md`
- **Supabase Docs:** https://supabase.com/docs/guides/auth

