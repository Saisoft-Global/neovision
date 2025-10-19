# 🔓 Fix RLS Authentication Issue

## 🎯 **THE PROBLEM**

Your backend logs show:
```
⚠️ No credentiials provided, using dev fallback user
```

This means the Supabase client is NOT authenticated, so **Row Level Security (RLS) is blocking ALL database queries** to:
- `customer_journeys`
- `collective_learnings`
- `agent_learning_profiles`
- `learning_application_log`

**Result:** Frontend stuck after vector search, no LLM call made.

---

## ⚡ **THE FIX: Run This SQL (5 seconds)**

### **Step 1: Open Supabase SQL Editor**

1. Go to: https://app.supabase.com
2. Login
3. Select project: `cybstyrslstfxlabiqyy`
4. Click **SQL Editor** (left sidebar)

---

### **Step 2: Copy & Run This SQL**

**Copy the ENTIRE contents of:** `DISABLE_RLS_FOR_DEV.sql`

**Or copy this:**

```sql
-- Add policies for anonymous users (development only)

-- Customer Journeys
CREATE POLICY "Anon users can view journeys (DEV)"
  ON public.customer_journeys FOR SELECT TO anon USING (true);

CREATE POLICY "Anon users can create journeys (DEV)"
  ON public.customer_journeys FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon users can update journeys (DEV)"
  ON public.customer_journeys FOR UPDATE TO anon USING (true);

CREATE POLICY "Anon users can delete journeys (DEV)"
  ON public.customer_journeys FOR DELETE TO anon USING (true);

-- Collective Learnings
CREATE POLICY "Anon users can view learnings (DEV)"
  ON public.collective_learnings FOR SELECT TO anon USING (true);

CREATE POLICY "Anon users can create learnings (DEV)"
  ON public.collective_learnings FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon users can update learnings (DEV)"
  ON public.collective_learnings FOR UPDATE TO anon USING (true);

-- Agent Learning Profiles
CREATE POLICY "Anon users can view profiles (DEV)"
  ON public.agent_learning_profiles FOR SELECT TO anon USING (true);

CREATE POLICY "Anon users can create profiles (DEV)"
  ON public.agent_learning_profiles FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon users can update profiles (DEV)"
  ON public.agent_learning_profiles FOR UPDATE TO anon USING (true);

-- Learning Application Log
CREATE POLICY "Anon users can view logs (DEV)"
  ON public.learning_application_log FOR SELECT TO anon USING (true);

CREATE POLICY "Anon users can create logs (DEV)"
  ON public.learning_application_log FOR INSERT TO anon WITH CHECK (true);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_journeys TO anon;
GRANT SELECT, INSERT, UPDATE ON public.collective_learnings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.agent_learning_profiles TO anon;
GRANT SELECT, INSERT ON public.learning_application_log TO anon;

SELECT 'RLS Policies Added Successfully!' as status;
```

**Paste into SQL Editor → Click "Run"**

---

### **Step 3: Verify**

You should see:
```
✅ Success. 0 rows affected.
✅ RLS Policies Added Successfully!
```

---

### **Step 4: Test Frontend**

1. **Refresh browser:** Ctrl+F5
2. **Send message:** "Hello"
3. **Watch console:** Should work now!

---

## 📊 **WHAT THIS DOES**

**Before:**
```
Supabase: "Who are you?"
Frontend: "dev fallback user" (not authenticated)
Supabase: "Access DENIED!" ❌
Frontend: [STUCK]
```

**After:**
```
Supabase: "Who are you?"
Frontend: "dev fallback user" (not authenticated)
Supabase: "You're anon role, access GRANTED!" ✅
Frontend: [WORKS!]
```

---

## 🔒 **SECURITY NOTE**

**For Development:** This is fine - allows anonymous users to access tables.

**For Production:** You'll need to:
1. Implement proper authentication (Supabase Auth)
2. Remove the `anon` policies
3. Use only `authenticated` policies

**Later, we can fix proper authentication. For now, this unblocks you!**

---

## 🎯 **DO THIS NOW**

1. Open Supabase SQL Editor
2. Copy the SQL above
3. Run it
4. Refresh browser (Ctrl+F5)
5. Send "Hello"
6. Watch it work! ⚡

**Should get response in 10-15 seconds instead of stuck!**

