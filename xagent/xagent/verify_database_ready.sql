-- ============================================
-- VERIFY DATABASE IS CLEAN AND READY
-- ============================================
-- Run this query to check if all multi-tenancy setup is complete

-- ============================================
-- 1. CHECK ORGANIZATION TABLES EXIST
-- ============================================
SELECT 
  'ORGANIZATION TABLES' as check_type,
  table_name,
  'EXISTS' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'organizations', 
    'organization_members', 
    'organization_llm_settings',
    'organization_usage',
    'organization_invitations',
    'organization_audit_logs'
  )
ORDER BY table_name;

-- ============================================
-- 2. CHECK MULTI-TENANT COLUMNS IN KEY TABLES
-- ============================================
SELECT 
  'MULTI-TENANT COLUMNS' as check_type,
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('agents', 'workflows', 'uploaded_documents', 'tools', 'conversations', 'documents')
  AND column_name IN ('organization_id', 'visibility', 'shared_with', 'created_by', 'user_id')
ORDER BY table_name, column_name;

-- ============================================
-- 3. CHECK TOOLS FRAMEWORK TABLES
-- ============================================
SELECT 
  'TOOLS FRAMEWORK' as check_type,
  table_name,
  'EXISTS' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('tools', 'tool_skills', 'agent_tools')
ORDER BY table_name;

-- ============================================
-- 4. CHECK SYSTEM TOOLS ARE INSERTED
-- ============================================
SELECT 
  'SYSTEM TOOLS' as check_type,
  id,
  name,
  type,
  is_system_tool,
  is_active,
  visibility
FROM public.tools 
WHERE is_system_tool = true
ORDER BY name;

-- ============================================
-- 5. CHECK TOOL SKILLS ARE INSERTED
-- ============================================
SELECT 
  'TOOL SKILLS' as check_type,
  t.name as tool_name,
  ts.name as skill_name,
  ts.description,
  ts.is_active
FROM public.tool_skills ts
JOIN public.tools t ON ts.tool_id = t.id
WHERE t.is_system_tool = true
ORDER BY t.name, ts.name;

-- ============================================
-- 6. CHECK RLS POLICIES ARE ENABLED
-- ============================================
SELECT 
  'RLS POLICIES' as check_type,
  schemaname,
  tablename,
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('agents', 'workflows', 'tools', 'organizations', 'organization_members')
ORDER BY tablename, policyname;

-- ============================================
-- 7. CHECK INDEXES ARE CREATED
-- ============================================
SELECT 
  'INDEXES' as check_type,
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('agents', 'workflows', 'tools', 'organizations', 'organization_members')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- ============================================
-- 8. CHECK HELPER VIEWS EXIST
-- ============================================
SELECT 
  'HELPER VIEWS' as check_type,
  table_name,
  table_type,
  'EXISTS' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('user_accessible_agents', 'organization_resource_summary')
ORDER BY table_name;

-- ============================================
-- 9. CHECK HELPER FUNCTIONS EXIST
-- ============================================
SELECT 
  'HELPER FUNCTIONS' as check_type,
  routine_name,
  routine_type,
  'EXISTS' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('migrate_user_to_organization', 'create_personal_organization')
ORDER BY routine_name;

-- ============================================
-- 10. CHECK USER LLM SETTINGS TABLE
-- ============================================
SELECT 
  'USER LLM SETTINGS' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'user_llm_settings'
  AND column_name IN ('prefer_org_keys', 'current_organization_id')
ORDER BY column_name;

-- ============================================
-- 11. SUMMARY COUNT
-- ============================================
SELECT 
  'SUMMARY' as check_type,
  'Total Organizations' as metric,
  COUNT(*)::text as value
FROM public.organizations
UNION ALL
SELECT 
  'SUMMARY' as check_type,
  'Total System Tools' as metric,
  COUNT(*)::text as value
FROM public.tools WHERE is_system_tool = true
UNION ALL
SELECT 
  'SUMMARY' as check_type,
  'Total Tool Skills' as metric,
  COUNT(*)::text as value
FROM public.tool_skills
UNION ALL
SELECT 
  'SUMMARY' as check_type,
  'Total Agents' as metric,
  COUNT(*)::text as value
FROM public.agents
UNION ALL
SELECT 
  'SUMMARY' as check_type,
  'Total Workflows' as metric,
  COUNT(*)::text as value
FROM public.workflows;

-- ============================================
-- 12. FINAL STATUS CHECK
-- ============================================
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations' AND table_schema = 'public')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tools' AND table_schema = 'public')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tool_skills' AND table_schema = 'public')
     AND EXISTS (SELECT 1 FROM public.tools WHERE is_system_tool = true)
     AND EXISTS (SELECT 1 FROM public.tool_skills)
    THEN '✅ DATABASE IS READY FOR MULTI-TENANT AGENTIC AI PLATFORM'
    ELSE '❌ DATABASE SETUP INCOMPLETE - CHECK ABOVE RESULTS'
  END as final_status;
