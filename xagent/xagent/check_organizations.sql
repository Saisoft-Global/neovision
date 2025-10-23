-- ============================================
-- CHECK EXISTING ORGANIZATIONS
-- ============================================
-- This script checks what organizations currently exist

-- Check all organizations
SELECT 
  'ALL_ORGANIZATIONS' as info_type,
  id,
  name,
  slug,
  plan,
  status,
  created_at,
  updated_at
FROM public.organizations 
ORDER BY created_at;

-- Check organization members
SELECT 
  'ORG_MEMBERS' as info_type,
  om.organization_id,
  o.name as org_name,
  om.user_id,
  om.role,
  om.status,
  om.created_at
FROM public.organization_members om
JOIN public.organizations o ON om.organization_id = o.id
ORDER BY om.created_at;

-- Check organization LLM settings
SELECT 
  'ORG_LLM_SETTINGS' as info_type,
  organization_id,
  monthly_request_quota,
  current_requests,
  allow_user_keys,
  fallback_to_org_keys,
  created_at
FROM public.organization_llm_settings
ORDER BY created_at;

-- Check if any agents have organization_id set
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

-- Check if any workflows have organization_id set
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

-- Check all users
SELECT 
  'ALL_USERS' as info_type,
  id,
  email,
  role,
  permissions,
  created_at
FROM public.users
ORDER BY created_at;
