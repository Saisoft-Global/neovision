-- ============================================
-- DATABASE PREREQUISITES CHECK
-- Run this BEFORE applying new migrations
-- ============================================

-- This script checks if all required components exist
-- for the new autonomous agents and collective learning migrations

\echo '=========================================='
\echo 'CHECKING DATABASE PREREQUISITES'
\echo '=========================================='
\echo ''

-- ============================================
-- 1. CHECK AUTHENTICATION SETUP
-- ============================================
\echo '1. Checking Authentication Setup...'

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users')
    THEN '✅ auth.users table exists'
    ELSE '❌ auth.users table MISSING - Supabase Auth not set up!'
  END AS auth_check;

-- ============================================
-- 2. CHECK CORE TABLES
-- ============================================
\echo ''
\echo '2. Checking Core Tables...'

SELECT 
  table_name,
  CASE 
    WHEN table_name IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END AS status
FROM (
  VALUES 
    ('agents'),
    ('workflows'),
    ('users')
) AS required_tables(table_name)
LEFT JOIN information_schema.tables t 
  ON t.table_schema = 'public' 
  AND t.table_name = required_tables.table_name
ORDER BY required_tables.table_name;

-- ============================================
-- 3. CHECK IF NEW TABLES ALREADY EXIST
-- ============================================
\echo ''
\echo '3. Checking if new tables already exist...'

SELECT 
  table_name,
  CASE 
    WHEN table_name IS NOT NULL THEN '⚠️ ALREADY EXISTS (migration may have been applied)'
    ELSE '✅ DOES NOT EXIST (ready to create)'
  END AS status
FROM (
  VALUES 
    ('agent_schedules'),
    ('system_events'),
    ('agent_goals'),
    ('goal_progress'),
    ('customer_journeys'),
    ('collective_learnings'),
    ('agent_learning_profiles'),
    ('learning_application_log')
) AS new_tables(table_name)
LEFT JOIN information_schema.tables t 
  ON t.table_schema = 'public' 
  AND t.table_name = new_tables.table_name
ORDER BY new_tables.table_name;

-- ============================================
-- 4. CHECK POSTGRES VERSION
-- ============================================
\echo ''
\echo '4. Checking PostgreSQL Version...'

SELECT 
  version(),
  CASE 
    WHEN current_setting('server_version_num')::int >= 140000 
    THEN '✅ PostgreSQL 14+ (Compatible)'
    ELSE '⚠️ PostgreSQL < 14 (Should still work)'
  END AS version_check;

-- ============================================
-- 5. CHECK EXTENSIONS
-- ============================================
\echo ''
\echo '5. Checking Required Extensions...'

SELECT 
  extname,
  CASE 
    WHEN extname IS NOT NULL THEN '✅ INSTALLED'
    ELSE '❌ MISSING'
  END AS status
FROM (
  VALUES 
    ('uuid-ossp'),
    ('pg_stat_statements')
) AS required_ext(extname)
LEFT JOIN pg_extension e ON e.extname = required_ext.extname
ORDER BY required_ext.extname;

-- ============================================
-- 6. CHECK PERMISSIONS
-- ============================================
\echo ''
\echo '6. Checking Permissions...'

SELECT 
  grantee,
  table_schema,
  COUNT(*) as permissions_count
FROM information_schema.table_privileges
WHERE grantee = 'authenticated'
  AND table_schema = 'public'
GROUP BY grantee, table_schema;

-- ============================================
-- 7. CHECK RLS (Row Level Security)
-- ============================================
\echo ''
\echo '7. Checking RLS Status on Core Tables...'

SELECT 
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ RLS ENABLED'
    ELSE '⚠️ RLS DISABLED'
  END AS rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('agents', 'workflows', 'users')
ORDER BY tablename;

-- ============================================
-- 8. SUMMARY
-- ============================================
\echo ''
\echo '=========================================='
\echo 'SUMMARY'
\echo '=========================================='

SELECT 
  'PREREQUISITE CHECK COMPLETE' AS status,
  COUNT(*) FILTER (WHERE table_schema = 'public') AS public_tables_count,
  COUNT(*) FILTER (WHERE table_schema = 'auth') AS auth_tables_count
FROM information_schema.tables
WHERE table_schema IN ('public', 'auth');

\echo ''
\echo '✅ If auth.users exists: Proceed with migrations'
\echo '⚠️ If any core tables missing: Apply earlier migrations first'
\echo '⚠️ If new tables already exist: Migrations may be partially applied'
\echo ''
\echo 'Ready to proceed? Run the migrations in this order:'
\echo '1. 20250119000000_autonomous_agents.sql'
\echo '2. 20250119100000_collective_learning.sql'
\echo ''
\echo '=========================================='


