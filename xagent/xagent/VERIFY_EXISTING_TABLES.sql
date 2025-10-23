-- ============================================
-- SIMPLE TABLE EXISTENCE CHECK
-- Copy/paste this in Supabase SQL Editor first
-- ============================================

-- Check what tables you currently have
SELECT 
  table_name,
  pg_size_pretty(pg_total_relation_size(quote_ident(table_name)::regclass)) AS size
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- This will show ALL your current tables
-- Look for these REQUIRED tables:
--   ✅ agents
--   ✅ workflows
--   ✅ users

-- Check if NEW tables already exist:
--   ⚠️ agent_schedules (should NOT exist yet)
--   ⚠️ collective_learnings (should NOT exist yet)

-- If you see agents, workflows, users: GOOD TO GO! ✅
-- If new tables already exist: Migrations already applied ✅
-- If required tables missing: Need to apply earlier migrations first ⚠️


