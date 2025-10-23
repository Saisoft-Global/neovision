-- ============================================
-- SIMPLE TABLE CHECK (Browser Compatible)
-- Copy/paste this in Supabase SQL Editor
-- ============================================

-- ════════════════════════════════════════════
-- CHECK 1: Do required tables exist?
-- ════════════════════════════════════════════

SELECT 
  'CHECK 1: Required Tables' AS check_name,
  string_agg(table_name, ', ') AS tables_found,
  COUNT(*) AS count_found,
  CASE 
    WHEN COUNT(*) >= 2 THEN '✅ READY TO PROCEED'
    ELSE '❌ MISSING CORE TABLES - Apply base migrations first'
  END AS status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('agents', 'workflows', 'workflow', 'users');

-- Expected: Shows 2-3 tables (agents, workflows or workflow, maybe users)
-- Status: ✅ READY TO PROCEED


-- ════════════════════════════════════════════
-- CHECK 2: Are new tables already created?
-- ════════════════════════════════════════════

SELECT 
  'CHECK 2: New Tables' AS check_name,
  COALESCE(string_agg(table_name, ', '), 'None') AS tables_found,
  COUNT(*) AS count_found,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ NOT YET CREATED - Ready to apply migrations'
    WHEN COUNT(*) = 8 THEN '✅ ALL 8 EXIST - Migrations already applied'
    ELSE '⚠️ PARTIAL - Some tables exist, check which ones'
  END AS status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'agent_schedules',
    'system_events',
    'agent_goals',
    'goal_progress',
    'customer_journeys',
    'collective_learnings',
    'agent_learning_profiles',
    'learning_application_log'
  );

-- Expected: 0 rows (none exist yet) OR 8 rows (all already applied)
-- Status: ✅ Ready to apply OR ✅ Already done


-- ════════════════════════════════════════════
-- CHECK 3: Auth setup
-- ════════════════════════════════════════════

SELECT 
  'CHECK 3: Authentication' AS check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'auth' AND table_name = 'users'
    )
    THEN '✅ Supabase Auth is configured'
    ELSE '❌ Supabase Auth NOT configured'
  END AS status;

-- Expected: ✅ Supabase Auth is configured


-- ════════════════════════════════════════════
-- FINAL SUMMARY
-- ════════════════════════════════════════════

SELECT 
  '🎯 SUMMARY' AS section,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') AS total_public_tables,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('agents', 'workflows', 'workflow')) AS required_tables_found,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('agent_schedules', 'collective_learnings')) AS new_tables_found,
  CASE 
    WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('agents', 'workflows', 'workflow')) >= 1
      AND (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('agent_schedules', 'collective_learnings')) = 0
    THEN '✅ READY TO APPLY MIGRATIONS'
    WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('agent_schedules', 'collective_learnings')) > 0
    THEN '✅ MIGRATIONS ALREADY APPLIED'
    ELSE '⚠️ CHECK RESULTS ABOVE'
  END AS final_verdict;

-- ════════════════════════════════════════════
-- INTERPRETATION:
-- ════════════════════════════════════════════
-- 
-- ✅ "READY TO APPLY MIGRATIONS"
--    → Proceed with applying both migrations
--    → Follow EXECUTE_MIGRATIONS_NOW.md
--
-- ✅ "MIGRATIONS ALREADY APPLIED"  
--    → Skip migrations
--    → Just start your app: npm run dev
--
-- ⚠️ "CHECK RESULTS ABOVE"
--    → Review individual checks
--    → May need base migrations first
--
-- ════════════════════════════════════════════


