-- ============================================
-- SIMPLE 3-QUERY VERIFICATION
-- Copy/paste these in Supabase SQL Editor
-- ============================================

-- ════════════════════════════════════════════
-- QUERY 1: Show all current public tables
-- ════════════════════════════════════════════

SELECT 
  table_name,
  'Currently exists' AS status
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Look for:
-- ✅ agents (required)
-- ✅ workflows or workflow (required)
-- ✅ users (required)


-- ════════════════════════════════════════════
-- QUERY 2: Check if auth is set up
-- ════════════════════════════════════════════

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'auth' AND table_name = 'users'
    )
    THEN '✅ Supabase Auth is configured'
    ELSE '❌ Supabase Auth is NOT configured'
  END AS auth_status;

-- Expected: ✅ Supabase Auth is configured


-- ════════════════════════════════════════════
-- QUERY 3: Check if new tables already exist
-- ════════════════════════════════════════════

SELECT 
  table_name,
  'Already exists - migration may be applied' AS status
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
  )
ORDER BY table_name;

-- Expected: NO ROWS (empty result)
-- If NO ROWS: ✅ Ready to apply migrations
-- If ROWS appear: ⚠️ Migrations already applied


-- ════════════════════════════════════════════
-- INTERPRETATION
-- ════════════════════════════════════════════

-- ✅ GOOD TO GO if:
--    - Query 1 shows agents, workflows (or workflow)
--    - Query 2 shows ✅ Auth configured
--    - Query 3 shows NO ROWS

-- ⚠️ ALREADY DONE if:
--    - Query 3 shows the 8 new tables
--    - Just start your app: npm run dev

-- ❌ NEED EARLIER MIGRATIONS if:
--    - Query 1 doesn't show agents or workflows
--    - Need to apply base migrations first


