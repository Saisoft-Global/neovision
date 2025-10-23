-- ============================================
-- SETUP DEFAULT ORGANIZATION & MIGRATE EXISTING DATA (SIMPLE VERSION)
-- ============================================
-- This script creates a default organization using a specific admin user

-- ============================================
-- 1. CREATE DEFAULT ORGANIZATION
-- ============================================
DO $$
DECLARE
  v_user_id uuid := '06cb0260-217e-4eff-b80a-7844cce8b8e2'::uuid; -- admin@example.com (established admin)
  v_user_email text := 'admin@example.com';
  v_org_id uuid;
  v_slug text;
BEGIN
  -- Generate unique slug
  v_slug := 'xagent-workspace-' || substr(md5(v_user_id::text), 1, 8);
  
  -- Create organization
  INSERT INTO public.organizations (name, slug, plan, status, description)
  VALUES (
    'XAgent Workspace',
    v_slug,
    'trial',
    'active',
    'Default workspace for XAgent platform'
  )
  RETURNING id INTO v_org_id;
  
  -- Add user as owner
  INSERT INTO public.organization_members (organization_id, user_id, role, status, permissions)
  VALUES (
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
  );
  
  -- Create organization LLM settings
  INSERT INTO public.organization_llm_settings (
    organization_id,
    monthly_request_quota,
    current_requests,
    allow_user_keys,
    fallback_to_org_keys
  )
  VALUES (
    v_org_id,
    10000, -- 10K requests per month
    0,
    true,
    true
  );
  
  RAISE NOTICE 'Created organization: % (ID: %)', 'XAgent Workspace', v_org_id;
  RAISE NOTICE 'Added user % (%) as owner', v_user_email, v_user_id;
  
  -- Store org ID for migration
  PERFORM set_config('app.current_org_id', v_org_id::text, true);
END $$;

-- ============================================
-- 2. MIGRATE EXISTING AGENTS
-- ============================================
DO $$
DECLARE
  v_org_id uuid;
  v_agent_count integer;
BEGIN
  -- Get the organization ID we just created
  SELECT current_setting('app.current_org_id')::uuid INTO v_org_id;
  
  -- Update existing agents to belong to the organization
  UPDATE public.agents 
  SET 
    organization_id = v_org_id,
    visibility = 'organization'
  WHERE organization_id IS NULL;
  
  GET DIAGNOSTICS v_agent_count = ROW_COUNT;
  
  RAISE NOTICE 'Migrated % agents to organization', v_agent_count;
END $$;

-- ============================================
-- 3. MIGRATE EXISTING WORKFLOWS
-- ============================================
DO $$
DECLARE
  v_org_id uuid;
  v_workflow_count integer;
BEGIN
  -- Get the organization ID
  SELECT current_setting('app.current_org_id')::uuid INTO v_org_id;
  
  -- Update existing workflows to belong to the organization
  UPDATE public.workflows 
  SET 
    organization_id = v_org_id,
    visibility = 'organization'
  WHERE organization_id IS NULL;
  
  GET DIAGNOSTICS v_workflow_count = ROW_COUNT;
  
  RAISE NOTICE 'Migrated % workflows to organization', v_workflow_count;
END $$;

-- ============================================
-- 4. UPDATE USER LLM SETTINGS
-- ============================================
DO $$
DECLARE
  v_org_id uuid;
  v_user_id uuid := '06cb0260-217e-4eff-b80a-7844cce8b8e2'::uuid;
BEGIN
  -- Get the organization ID
  SELECT current_setting('app.current_org_id')::uuid INTO v_org_id;
  
  -- Update user LLM settings to use the organization
  INSERT INTO public.user_llm_settings (
    user_id,
    current_organization_id,
    prefer_org_keys,
    default_provider
  )
  VALUES (
    v_user_id,
    v_org_id,
    true,
    'openai'
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    current_organization_id = v_org_id,
    prefer_org_keys = true;
  
  RAISE NOTICE 'Updated user LLM settings for organization';
END $$;

-- ============================================
-- 5. VERIFICATION
-- ============================================
-- Show what we've created and migrated
SELECT 
  'MIGRATION_SUMMARY' as info_type,
  o.name as organization_name,
  o.slug as organization_slug,
  o.plan as organization_plan,
  COUNT(DISTINCT a.id) as total_agents,
  COUNT(DISTINCT w.id) as total_workflows,
  COUNT(DISTINCT om.user_id) as total_members
FROM public.organizations o
LEFT JOIN public.agents a ON o.id = a.organization_id
LEFT JOIN public.workflows w ON o.id = w.organization_id
LEFT JOIN public.organization_members om ON o.id = om.organization_id
WHERE o.slug LIKE 'xagent-workspace-%'
GROUP BY o.id, o.name, o.slug, o.plan;

-- Show migrated agents
SELECT 
  'MIGRATED_AGENTS' as info_type,
  id,
  name,
  type,
  status,
  organization_id,
  visibility
FROM public.agents 
WHERE organization_id IS NOT NULL
ORDER BY created_at;

-- Show migrated workflows
SELECT 
  'MIGRATED_WORKFLOWS' as info_type,
  id,
  name,
  organization_id,
  visibility
FROM public.workflows 
WHERE organization_id IS NOT NULL
ORDER BY created_at;

-- ============================================
-- 6. SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ DEFAULT ORGANIZATION SETUP COMPLETE!';
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
