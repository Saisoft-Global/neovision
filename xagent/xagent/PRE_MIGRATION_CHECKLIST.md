# ✅ PRE-MIGRATION CHECKLIST

## 🎯 **Run This Verification BEFORE Applying New Migrations**

**Time:** 2 minutes  
**Purpose:** Ensure all prerequisites are in place

---

## 📋 **STEP 1: Check Current Tables**

**In Supabase Dashboard → SQL Editor:**

**Copy/paste this query:**
```sql
SELECT 
  table_name,
  pg_size_pretty(pg_total_relation_size(quote_ident(table_name)::regclass)) AS size
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Click "Run"**

**Look for these REQUIRED tables:**
```
✅ agents          (Must exist - core table)
✅ workflows       (Must exist - for workflow linking)
✅ users           (Should exist - user management)
```

**Check for NEW tables (should NOT exist yet):**
```
Should be missing (we're about to create these):
❌ agent_schedules
❌ system_events
❌ agent_goals
❌ goal_progress
❌ customer_journeys
❌ collective_learnings
❌ agent_learning_profiles
❌ learning_application_log
```

---

## ✅ **SCENARIOS**

### **Scenario A: Perfect State** ✅

**Query shows:**
```
✅ agents - EXISTS
✅ workflows - EXISTS
✅ users - EXISTS
❌ agent_schedules - DOES NOT EXIST
❌ collective_learnings - DOES NOT EXIST
... (other new tables don't exist)
```

**Action:** ✅ **PROCEED with migrations!**
- You're ready to apply both new migrations
- Everything will work perfectly

---

### **Scenario B: New Tables Already Exist** ⚠️

**Query shows:**
```
✅ agents - EXISTS
✅ workflows - EXISTS
✅ agent_schedules - EXISTS ⚠️
✅ collective_learnings - EXISTS ⚠️
```

**Action:** ⚠️ **Migrations already applied!**
- You've already run these migrations
- No need to run them again
- Just start your app: `npm run dev`

---

### **Scenario C: Missing Core Tables** ❌

**Query shows:**
```
❌ agents - DOES NOT EXIST
❌ workflows - DOES NOT EXIST
```

**Action:** ⚠️ **Apply earlier migrations first!**

**Run these in Supabase SQL Editor (in order):**

```sql
-- 1. Organizations & Multi-tenancy
-- File: 20250113100000_create_organizations_multitenancy.sql

-- 2. Agents table
-- File: 20251012120000_enhance_agents_for_skills_hierarchy.sql

-- 3. Workflows
-- File: 20251012000000_create_agent_workflows_table.sql

-- Then come back and run the new migrations
```

---

## 📋 **STEP 2: Check Auth Setup**

**Run this query:**
```sql
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users')
    THEN '✅ Supabase Auth is set up'
    ELSE '❌ Supabase Auth is NOT set up'
  END AS auth_status;
```

**Expected:** ✅ "Supabase Auth is set up"

**If NOT set up:** 
- You need to enable Supabase Auth in your project
- Dashboard → Authentication → Enable

---

## 📋 **STEP 3: Quick Summary Check**

**Run this simple query:**
```sql
-- Count tables by category
SELECT 
  'Total public tables' AS category,
  COUNT(*) AS count
FROM information_schema.tables
WHERE table_schema = 'public'

UNION ALL

SELECT 
  'Auth tables',
  COUNT(*)
FROM information_schema.tables
WHERE table_schema = 'auth'

UNION ALL

SELECT 
  'New tables (should be 0)',
  COUNT(*)
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'agent_schedules', 'system_events', 'agent_goals', 
    'goal_progress', 'customer_journeys',
    'collective_learnings', 'agent_learning_profiles', 
    'learning_application_log'
  );
```

**Expected Results:**
```
Total public tables: 20-40 (varies by your setup)
Auth tables: 5-10 (Supabase auth tables)
New tables (should be 0): 0  ← This should be ZERO
```

**If "New tables" = 0:** ✅ **Ready to proceed!**
**If "New tables" > 0:** ⚠️ **Already applied, skip migration**

---

## ✅ **DECISION TREE**

```
Run verification queries
    ↓
Do you have agents, workflows, users tables?
    ↓
  YES                          NO
    ↓                           ↓
Are new tables (agent_schedules, etc.) missing?
    ↓                           Apply earlier migrations first
  YES              NO           (organizations, agents, workflows)
    ↓               ↓
PROCEED      ALREADY DONE
Apply new    Just start app
migrations   npm run dev
```

---

## 🚀 **READY TO PROCEED?**

**If verification passed:**

1. ✅ auth.users exists
2. ✅ agents table exists
3. ✅ workflows table exists (or workflow table)
4. ✅ New tables don't exist yet

**Then proceed with:**
- Open Supabase Dashboard
- SQL Editor → New Query
- Paste Migration 1 → Run
- New Query → Paste Migration 2 → Run
- Done!

**Read:** `MIGRATION_VISUAL_GUIDE.md` for detailed steps

---

## 📊 **VERIFICATION SUMMARY**

**Run these 3 queries in Supabase SQL Editor:**

**Query 1:** Check existing tables
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' ORDER BY table_name;
```

**Query 2:** Check for required tables
```sql
SELECT 
  unnest(ARRAY['agents', 'workflows', 'users']) AS required_table,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = unnest
  ) AS exists;
```

**Query 3:** Check for new tables (should return 0 rows)
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'agent_schedules', 'system_events', 'agent_goals', 
  'collective_learnings', 'agent_learning_profiles'
);
```

**If Query 3 returns 0 rows:** ✅ **Ready to apply migrations!**

---

## 🎯 **QUICK START**

**Don't want to run all these checks?**

**Just try applying the migrations:**
- If they fail, you'll get a clear error message
- If they succeed, you're good!
- Either way, you'll know quickly

**Most likely:** Everything is fine and migrations will work! ✅


