-- ============================================
-- CHECK CURRENT DATABASE STATE
-- ============================================
-- This script checks what actually exists in your database

-- Check if organizations table exists and what's in it
SELECT 
  'ORGANIZATIONS_TABLE' as info_type,
  COUNT(*) as total_organizations
FROM public.organizations;

-- Show all organizations (if any)
SELECT 
  'ALL_ORGANIZATIONS' as info_type,
  id,
  name,
  slug,
  plan,
  status,
  created_at
FROM public.organizations 
ORDER BY created_at;

-- Check organization_llm_settings table
SELECT 
  'ORG_LLM_SETTINGS_TABLE' as info_type,
  COUNT(*) as total_settings
FROM public.organization_llm_settings;

-- Show all organization LLM settings (if any)
SELECT 
  'ALL_ORG_LLM_SETTINGS' as info_type,
  organization_id,
  monthly_request_quota,
  current_requests,
  allow_user_keys,
  fallback_to_org_keys,
  created_at
FROM public.organization_llm_settings
ORDER BY created_at;

-- Check organization_members table
SELECT 
  'ORG_MEMBERS_TABLE' as info_type,
  COUNT(*) as total_members
FROM public.organization_members;

-- Show all organization members (if any)
SELECT 
  'ALL_ORG_MEMBERS' as info_type,
  organization_id,
  user_id,
  role,
  status,
  created_at
FROM public.organization_members
ORDER BY created_at;

-- Check agents table
SELECT 
  'AGENTS_TABLE' as info_type,
  COUNT(*) as total_agents,
  COUNT(CASE WHEN organization_id IS NOT NULL THEN 1 END) as agents_with_org
FROM public.agents;

-- Show agents with organization_id
SELECT 
  'AGENTS_WITH_ORG' as info_type,
  id,
  name,
  type,
  organization_id,
  visibility,
  created_by
FROM public.agents 
WHERE organization_id IS NOT NULL
ORDER BY created_at;

-- Check workflows table
SELECT 
  'WORKFLOWS_TABLE' as info_type,
  COUNT(*) as total_workflows,
  COUNT(CASE WHEN organization_id IS NOT NULL THEN 1 END) as workflows_with_org
FROM public.workflows;

-- Show workflows with organization_id
SELECT 
  'WORKFLOWS_WITH_ORG' as info_type,
  id,
  name,
  organization_id,
  visibility,
  created_by
FROM public.workflows 
WHERE organization_id IS NOT NULL
ORDER BY created_at;

-- Check users table
SELECT 
  'USERS_TABLE' as info_type,
  COUNT(*) as total_users
FROM public.users;

-- Show all users
SELECT 
  'ALL_USERS' as info_type,
  id,
  email,
  role,
  permissions,
  created_at
FROM public.users
ORDER BY created_at;
