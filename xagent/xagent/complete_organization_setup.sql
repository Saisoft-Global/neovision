-- ============================================
-- COMPLETE ORGANIZATION SETUP (SAFE VERSION)
-- ============================================
-- This script completes the organization setup safely

-- ============================================
-- 1. COMPLETE THE EXISTING ORGANIZATION SETUP
-- ============================================
DO $$
DECLARE
  v_user_id uuid := '06cb0260-217e-4eff-b80a-7844cce8b8e2'::uuid; -- admin@example.com
  v_org_id uuid := '6057c26c-0862-4f12-a1a8-fe9b887d6c0d'::uuid; -- Your existing org ID
  v_agent_count integer;
  v_workflow_count integer;
BEGIN
  RAISE NOTICE 'Completing setup for organization: %', v_org_id;
  
  -- Ensure user is added as owner (with conflict handling)
  INSERT INTO public.organization_members (
    organization_id,
    user_id,
    role,
    status,
    permissions
  ) VALUES (
    v_org_id,
    v_user_id,
    'owner',
    'active',
    '{
      "agents": {"create": true, "read": true, "update": true, "delete": true},
      "workflows": {"create": true, "read": true, "update": true, "delete": true},
      "tools": {"create": true, "read": true, "update": true, "delete": true},
      "documents": {"create": true, "read": true, "update": true, "delete": true},
      "members": {"invite": true, "manage": true}
    }'::jsonb
  )
  ON CONFLICT (organization_id, user_id) 
  DO UPDATE SET
    role = 'owner',
    status = 'active',
    permissions = EXCLUDED.permissions;
  
  RAISE NOTICE '✅ User admin@example.com set as owner';
  
  -- Ensure organization LLM settings exist (with conflict handling)
  INSERT INTO public.organization_llm_settings (
    organization_id,
    monthly_request_quota,
    current_requests,
    allow_user_keys,
    fallback_to_org_keys
  ) VALUES (
    v_org_id,
    10000, -- 10K requests per month
    0,
    true,
    true
  )
  ON CONFLICT (organization_id) 
  DO UPDATE SET
    monthly_request_quota = EXCLUDED.monthly_request_quota,
    allow_user_keys = EXCLUDED.allow_user_keys,
    fallback_to_org_keys = EXCLUDED.fallback_to_org_keys;
  
  RAISE NOTICE '✅ Organization LLM settings configured';
  
  -- Migrate existing agents to the organization
  UPDATE public.agents 
  SET 
    organization_id = v_org_id,
    visibility = 'organization'
  WHERE organization_id IS NULL;
  
  GET DIAGNOSTICS v_agent_count = ROW_COUNT;
  
  -- Migrate existing workflows to the organization
  UPDATE public.workflows 
  SET 
    organization_id = v_org_id,
    visibility = 'organization'
  WHERE organization_id IS NULL;
  
  GET DIAGNOSTICS v_workflow_count = ROW_COUNT;
  
  -- Update user LLM settings
  INSERT INTO public.user_llm_settings (
    user_id,
    current_organization_id,
    prefer_org_keys,
    default_provider
  ) VALUES (
    v_user_id,
    v_org_id,
    true,
    'openai'
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    current_organization_id = v_org_id,
    prefer_org_keys = true;
  
  RAISE NOTICE '✅ Organization setup completed successfully!';
  RAISE NOTICE 'Organization ID: %', v_org_id;
  RAISE NOTICE 'Migrated % agents to organization', v_agent_count;
  RAISE NOTICE 'Migrated % workflows to organization', v_workflow_count;
  RAISE NOTICE 'User admin@example.com set as owner';
  
END $$;

-- ============================================
-- 2. VERIFICATION
-- ============================================
-- Show the organization details
SELECT 
  'ORGANIZATION_DETAILS' as info_type,
  o.id,
  o.name,
  o.slug,
  o.plan,
  o.status,
  o.created_at,
  COUNT(DISTINCT a.id) as total_agents,
  COUNT(DISTINCT w.id) as total_workflows,
  COUNT(DISTINCT om.user_id) as total_members
FROM public.organizations o
LEFT JOIN public.agents a ON o.id = a.organization_id
LEFT JOIN public.workflows w ON o.id = w.organization_id
LEFT JOIN public.organization_members om ON o.id = om.organization_id
WHERE o.id = '6057c26c-0862-4f12-a1a8-fe9b887d6c0d'::uuid
GROUP BY o.id, o.name, o.slug, o.plan, o.status, o.created_at;

-- Show migrated agents
SELECT 
  'MIGRATED_AGENTS' as info_type,
  id,
  name,
  type,
  status,
  organization_id,
  visibility,
  created_by
FROM public.agents 
WHERE organization_id = '6057c26c-0862-4f12-a1a8-fe9b887d6c0d'::uuid
ORDER BY created_at;

-- Show migrated workflows
SELECT 
  'MIGRATED_WORKFLOWS' as info_type,
  id,
  name,
  organization_id,
  visibility,
  created_by
FROM public.workflows 
WHERE organization_id = '6057c26c-0862-4f12-a1a8-fe9b887d6c0d'::uuid
ORDER BY created_at;

-- Show organization members
SELECT 
  'ORG_MEMBERS' as info_type,
  om.organization_id,
  o.name as org_name,
  om.user_id,
  om.role,
  om.status,
  om.permissions
FROM public.organization_members om
JOIN public.organizations o ON om.organization_id = o.id
WHERE o.id = '6057c26c-0862-4f12-a1a8-fe9b887d6c0d'::uuid
ORDER BY om.created_at;

-- Show organization LLM settings
SELECT 
  'ORG_LLM_SETTINGS' as info_type,
  organization_id,
  monthly_request_quota,
  current_requests,
  allow_user_keys,
  fallback_to_org_keys,
  created_at
FROM public.organization_llm_settings
WHERE organization_id = '6057c26c-0862-4f12-a1a8-fe9b887d6c0d'::uuid;

-- ============================================
-- 3. SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ ORGANIZATION SETUP COMPLETED!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Organization ID: 6057c26c-0862-4f12-a1a8-fe9b887d6c0d';
  RAISE NOTICE 'Owner: admin@example.com';
  RAISE NOTICE 'Plan: Trial (10K requests/month)';
  RAISE NOTICE 'Status: Active';
  RAISE NOTICE 'All existing agents and workflows migrated';
  RAISE NOTICE 'User set as owner with full permissions';
  RAISE NOTICE 'Ready for testing and development!';
  RAISE NOTICE '============================================';
END $$;
