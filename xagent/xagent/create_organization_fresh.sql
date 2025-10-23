-- ============================================
-- CREATE ORGANIZATION FRESH (SAFE VERSION)
-- ============================================
-- This script creates a new organization safely, handling any existing data

-- ============================================
-- 1. CREATE ORGANIZATION
-- ============================================
DO $$
DECLARE
  v_user_id uuid := '06cb0260-217e-4eff-b80a-7844cce8b8e2'::uuid; -- admin@example.com
  v_org_id uuid;
  v_slug text;
  v_agent_count integer;
  v_workflow_count integer;
BEGIN
  -- Generate unique slug with timestamp to avoid conflicts
  v_slug := 'xagent-workspace-' || to_char(now(), 'YYYYMMDD-HH24MISS');
  
  -- Create the organization
  INSERT INTO public.organizations (
    name,
    slug,
    description,
    plan,
    status,
    settings
  ) VALUES (
    'XAgent Workspace',
    v_slug,
    'Default organization for XAgent platform testing and development',
    'trial',
    'active',
    '{
      "features": {
        "agents": true,
        "workflows": true,
        "tools": true,
        "documents": true,
        "integrations": true
      },
      "limits": {
        "max_agents": 50,
        "max_workflows": 100,
        "max_documents": 1000
      }
    }'::jsonb
  ) RETURNING id INTO v_org_id;
  
  RAISE NOTICE 'Created organization: % (ID: %)', v_slug, v_org_id;
  
  -- Add user as owner (with conflict handling)
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
  
  RAISE NOTICE 'Added admin@example.com as owner';
  
  -- Create organization LLM settings (with conflict handling)
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
  
  RAISE NOTICE 'Created organization LLM settings';
  
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
  RAISE NOTICE 'Organization Slug: %', v_slug;
  RAISE NOTICE 'Migrated % agents to organization', v_agent_count;
  RAISE NOTICE 'Migrated % workflows to organization', v_workflow_count;
  RAISE NOTICE 'User admin@example.com set as owner';
  
END $$;

-- ============================================
-- 2. VERIFICATION
-- ============================================
-- Show the created organization
SELECT 
  'CREATED_ORGANIZATION' as info_type,
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
WHERE o.slug LIKE 'xagent-workspace-%'
GROUP BY o.id, o.name, o.slug, o.plan, o.status, o.created_at
ORDER BY o.created_at DESC;

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
WHERE organization_id IS NOT NULL
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
WHERE organization_id IS NOT NULL
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
WHERE o.slug LIKE 'xagent-workspace-%'
ORDER BY om.created_at;

-- ============================================
-- 3. SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ ORGANIZATION CREATED SUCCESSFULLY!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Organization: XAgent Workspace';
  RAISE NOTICE 'Owner: admin@example.com';
  RAISE NOTICE 'Plan: Trial (10K requests/month)';
  RAISE NOTICE 'Status: Active';
  RAISE NOTICE 'All existing agents and workflows migrated';
  RAISE NOTICE 'User set as owner with full permissions';
  RAISE NOTICE 'Ready for testing and development!';
  RAISE NOTICE '============================================';
END $$;
