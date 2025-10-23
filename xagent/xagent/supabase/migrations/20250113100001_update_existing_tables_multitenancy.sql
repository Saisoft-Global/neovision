-- ============================================
-- UPDATE EXISTING TABLES FOR MULTI-TENANCY
-- ============================================
-- This migration adds organization_id and visibility controls to all existing tables

-- ============================================
-- 1. UPDATE AGENTS TABLE
-- ============================================

-- Add organization columns
ALTER TABLE public.agents 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'organization' CHECK (visibility IN ('private', 'organization', 'team', 'public')),
ADD COLUMN IF NOT EXISTS shared_with jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS team_ids jsonb DEFAULT '[]'::jsonb;

-- Create index
CREATE INDEX IF NOT EXISTS idx_agents_organization_id ON public.agents(organization_id);
CREATE INDEX IF NOT EXISTS idx_agents_visibility ON public.agents(visibility);
-- Create index for created_by + organization_id (agents table uses created_by, not user_id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'agents' AND column_name = 'created_by'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_agents_created_by_org ON public.agents(created_by, organization_id);
  END IF;
END $$;

-- Update RLS policies for agents (using created_by column)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'agents' AND column_name = 'created_by'
  ) THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view their own agents" ON public.agents;
    DROP POLICY IF EXISTS "Users can create their own agents" ON public.agents;
    DROP POLICY IF EXISTS "Users can update their own agents" ON public.agents;
    DROP POLICY IF EXISTS "Users can delete their own agents" ON public.agents;

    -- New multi-tenant RLS policies for agents
    CREATE POLICY "Users can view accessible agents"
      ON public.agents FOR SELECT
      TO authenticated
      USING (
        -- Own private agents
        (created_by = auth.uid() AND visibility = 'private')
        OR
        -- Organization agents
        (organization_id IN (
          SELECT organization_id 
          FROM public.organization_members 
          WHERE user_id = auth.uid() 
            AND status = 'active'
        ) AND visibility IN ('organization', 'team', 'public'))
        OR
        -- Explicitly shared agents
        (auth.uid()::text = ANY(SELECT jsonb_array_elements_text(shared_with)))
        OR
        -- Public agents
        (visibility = 'public')
        OR
        -- Admin override
        (auth.jwt()->>'role' = 'admin')
      );

    CREATE POLICY "Users can create agents"
      ON public.agents FOR INSERT
      TO authenticated
      WITH CHECK (
        created_by = auth.uid()
        AND (
          organization_id IS NULL 
          OR organization_id IN (
            SELECT organization_id 
            FROM public.organization_members 
            WHERE user_id = auth.uid() 
              AND status = 'active'
              AND (permissions->'agents'->>'create')::boolean = true
          )
        )
      );

    CREATE POLICY "Users can update their accessible agents"
      ON public.agents FOR UPDATE
      TO authenticated
      USING (
        -- Own agents
        created_by = auth.uid()
        OR
        -- Org agents with permission
        (organization_id IN (
          SELECT organization_id 
          FROM public.organization_members 
          WHERE user_id = auth.uid() 
            AND status = 'active'
            AND (permissions->'agents'->>'update')::boolean = true
        ))
        OR
        -- Admin override
        (auth.jwt()->>'role' = 'admin')
      );

    CREATE POLICY "Users can delete their agents"
      ON public.agents FOR DELETE
      TO authenticated
      USING (
        -- Own agents
        created_by = auth.uid()
        OR
        -- Org agents with permission
        (organization_id IN (
          SELECT organization_id 
          FROM public.organization_members 
          WHERE user_id = auth.uid() 
            AND status = 'active'
            AND role IN ('owner', 'admin')
            AND (permissions->'agents'->>'delete')::boolean = true
        ))
        OR
        -- Admin override
        (auth.jwt()->>'role' = 'admin')
      );
  END IF;
END $$;

-- Comment
COMMENT ON COLUMN public.agents.organization_id IS 'Organization this agent belongs to (NULL for personal agents)';
COMMENT ON COLUMN public.agents.visibility IS 'Agent visibility: private (owner only), organization (all org members), team (specific teams), public (everyone)';
COMMENT ON COLUMN public.agents.shared_with IS 'Array of user IDs this agent is explicitly shared with';

-- ============================================
-- 2. UPDATE WORKFLOWS TABLE
-- ============================================

-- Add organization columns to workflows table
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workflows') THEN
    ALTER TABLE public.workflows 
    ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'organization' CHECK (visibility IN ('private', 'organization', 'team', 'public')),
    ADD COLUMN IF NOT EXISTS shared_with jsonb DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Create indexes for workflows table
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workflows') THEN
    CREATE INDEX IF NOT EXISTS idx_workflows_organization_id ON public.workflows(organization_id);
    CREATE INDEX IF NOT EXISTS idx_workflows_visibility ON public.workflows(visibility);
    CREATE INDEX IF NOT EXISTS idx_workflows_created_by ON public.workflows(created_by);
  END IF;
END $$;

-- Update RLS policies for workflows table
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workflows') THEN
    DROP POLICY IF EXISTS "Users can view workflows" ON public.workflows;
    DROP POLICY IF EXISTS "Users can create workflows" ON public.workflows;
    DROP POLICY IF EXISTS "Users can update workflows" ON public.workflows;
    DROP POLICY IF EXISTS "Users can delete workflows" ON public.workflows;

    CREATE POLICY "Users can view accessible workflows"
      ON public.workflows FOR SELECT
      TO authenticated
      USING (
        (created_by = auth.uid() AND visibility = 'private')
        OR (organization_id IN (
          SELECT organization_id FROM public.organization_members 
          WHERE user_id = auth.uid() AND status = 'active'
        ) AND visibility IN ('organization', 'team', 'public'))
        OR (auth.uid()::text = ANY(SELECT jsonb_array_elements_text(shared_with)))
        OR (visibility = 'public')
      );

    CREATE POLICY "Users can create workflows"
      ON public.workflows FOR INSERT
      TO authenticated
      WITH CHECK (
        created_by = auth.uid()
        AND (
          organization_id IS NULL 
          OR organization_id IN (
            SELECT organization_id FROM public.organization_members 
            WHERE user_id = auth.uid() AND status = 'active'
            AND (permissions->'workflows'->>'create')::boolean = true
          )
        )
      );

    CREATE POLICY "Users can update workflows"
      ON public.workflows FOR UPDATE
      TO authenticated
      USING (
        created_by = auth.uid()
        OR (organization_id IN (
          SELECT organization_id FROM public.organization_members 
          WHERE user_id = auth.uid() AND status = 'active'
          AND (permissions->'workflows'->>'update')::boolean = true
        ))
      );

    CREATE POLICY "Users can delete workflows"
      ON public.workflows FOR DELETE
      TO authenticated
      USING (
        created_by = auth.uid()
        OR (organization_id IN (
          SELECT organization_id FROM public.organization_members 
          WHERE user_id = auth.uid() AND status = 'active'
          AND role IN ('owner', 'admin')
        ))
      );
  END IF;
END $$;

-- ============================================
-- 3. UPDATE UPLOADED_DOCUMENTS TABLE
-- ============================================

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'uploaded_documents') THEN
    -- Add organization columns
    ALTER TABLE public.uploaded_documents 
    ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'private' CHECK (visibility IN ('private', 'organization', 'team', 'public')),
    ADD COLUMN IF NOT EXISTS shared_with jsonb DEFAULT '[]'::jsonb;

    -- Create index
    CREATE INDEX IF NOT EXISTS idx_uploaded_documents_organization_id ON public.uploaded_documents(organization_id);
    CREATE INDEX IF NOT EXISTS idx_uploaded_documents_visibility ON public.uploaded_documents(visibility);

    -- Update RLS policies
    DROP POLICY IF EXISTS "Users can view their own documents" ON public.uploaded_documents;
    DROP POLICY IF EXISTS "Users can upload their own documents" ON public.uploaded_documents;
    DROP POLICY IF EXISTS "Users can update their own documents" ON public.uploaded_documents;
    DROP POLICY IF EXISTS "Users can delete their own documents" ON public.uploaded_documents;

    CREATE POLICY "Users can view accessible documents"
      ON public.uploaded_documents FOR SELECT
      TO authenticated
      USING (
        (user_id = auth.uid() AND visibility = 'private')
        OR (organization_id IN (
          SELECT organization_id FROM public.organization_members 
          WHERE user_id = auth.uid() AND status = 'active'
        ) AND visibility IN ('organization', 'team', 'public'))
        OR (auth.uid()::text = ANY(SELECT jsonb_array_elements_text(shared_with)))
      );

    CREATE POLICY "Users can upload documents"
      ON public.uploaded_documents FOR INSERT
      TO authenticated
      WITH CHECK (
        user_id = auth.uid()
        AND (
          organization_id IS NULL 
          OR organization_id IN (
            SELECT organization_id FROM public.organization_members 
            WHERE user_id = auth.uid() AND status = 'active'
            AND (permissions->'documents'->>'upload')::boolean = true
          )
        )
      );

    CREATE POLICY "Users can update their documents"
      ON public.uploaded_documents FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid());

    CREATE POLICY "Users can delete their documents"
      ON public.uploaded_documents FOR DELETE
      TO authenticated
      USING (
        user_id = auth.uid()
        OR (organization_id IN (
          SELECT organization_id FROM public.organization_members 
          WHERE user_id = auth.uid() AND status = 'active'
          AND role IN ('owner', 'admin')
        ))
      );
  END IF;
END $$;

-- ============================================
-- 4. UPDATE TOOLS TABLE
-- ============================================

-- Add organization columns
ALTER TABLE public.tools 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'organization' CHECK (visibility IN ('system', 'private', 'organization', 'public'));

-- Create index
CREATE INDEX IF NOT EXISTS idx_tools_organization_id ON public.tools(organization_id);
CREATE INDEX IF NOT EXISTS idx_tools_visibility ON public.tools(visibility);

-- Update RLS policies
DROP POLICY IF EXISTS "Users can view all system tools and their own tools" ON public.tools;
DROP POLICY IF EXISTS "Users can create their own tools" ON public.tools;
DROP POLICY IF EXISTS "Users can update their own tools" ON public.tools;
DROP POLICY IF EXISTS "Users can delete their own tools" ON public.tools;

CREATE POLICY "Users can view accessible tools"
  ON public.tools FOR SELECT
  TO authenticated
  USING (
    (visibility = 'system')
    OR (user_id = auth.uid() AND visibility = 'private')
    OR (organization_id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid() AND status = 'active'
    ) AND visibility IN ('organization', 'public'))
    OR (visibility = 'public')
  );

CREATE POLICY "Users can create tools"
  ON public.tools FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND visibility != 'system'
  );

CREATE POLICY "Users can update their tools"
  ON public.tools FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (organization_id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid() AND status = 'active'
      AND role IN ('owner', 'admin')
    ))
  );

CREATE POLICY "Users can delete their tools"
  ON public.tools FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (organization_id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid() AND status = 'active'
      AND role IN ('owner', 'admin')
    ))
  );

-- ============================================
-- 5. UPDATE CONVERSATIONS/THREADS TABLE
-- ============================================

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations') THEN
    ALTER TABLE public.conversations 
    ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

    CREATE INDEX IF NOT EXISTS idx_conversations_organization_id ON public.conversations(organization_id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'threads') THEN
    ALTER TABLE public.threads 
    ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

    CREATE INDEX IF NOT EXISTS idx_threads_organization_id ON public.threads(organization_id);
  END IF;
END $$;

-- ============================================
-- 6. UPDATE KNOWLEDGE BASE TABLES
-- ============================================

DO $$ 
BEGIN
  -- documents table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents' AND table_schema = 'public') THEN
    ALTER TABLE public.documents 
    ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'organization' CHECK (visibility IN ('private', 'organization', 'public'));

    CREATE INDEX IF NOT EXISTS idx_documents_organization_id ON public.documents(organization_id);
  END IF;

  -- embeddings table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'embeddings' AND table_schema = 'public') THEN
    ALTER TABLE public.embeddings 
    ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

    CREATE INDEX IF NOT EXISTS idx_embeddings_organization_id ON public.embeddings(organization_id);
  END IF;

  -- knowledge_bases table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'knowledge_bases' AND table_schema = 'public') THEN
    ALTER TABLE public.knowledge_bases 
    ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'organization' CHECK (visibility IN ('private', 'organization', 'public'));

    CREATE INDEX IF NOT EXISTS idx_knowledge_bases_organization_id ON public.knowledge_bases(organization_id);
  END IF;
END $$;

-- ============================================
-- 7. UPDATE AGENT PERSONALITY TRAITS
-- ============================================

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agent_personality_traits') THEN
    -- Personality traits inherit from agent, but add for easier queries
    ALTER TABLE public.agent_personality_traits 
    ADD COLUMN IF NOT EXISTS organization_id uuid;

    CREATE INDEX IF NOT EXISTS idx_agent_personality_traits_organization_id 
    ON public.agent_personality_traits(organization_id);

    -- Update existing records to sync with agent's organization
    UPDATE public.agent_personality_traits apt
    SET organization_id = a.organization_id
    FROM public.agents a
    WHERE apt.agent_id = a.id AND apt.organization_id IS NULL;
  END IF;
END $$;

-- ============================================
-- 8. UPDATE AGENT SKILLS
-- ============================================

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agent_skills') THEN
    -- Skills inherit from agent
    ALTER TABLE public.agent_skills 
    ADD COLUMN IF NOT EXISTS organization_id uuid;

    CREATE INDEX IF NOT EXISTS idx_agent_skills_organization_id 
    ON public.agent_skills(organization_id);

    -- Update existing records
    UPDATE public.agent_skills ags
    SET organization_id = a.organization_id
    FROM public.agents a
    WHERE ags.agent_id = a.id AND ags.organization_id IS NULL;
  END IF;
END $$;

-- ============================================
-- 9. UPDATE USER LLM SETTINGS
-- ============================================

-- User LLM settings work alongside organization settings
-- Add preference for using org keys vs user keys
ALTER TABLE public.user_llm_settings 
ADD COLUMN IF NOT EXISTS prefer_org_keys boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS current_organization_id uuid REFERENCES public.organizations(id);

CREATE INDEX IF NOT EXISTS idx_user_llm_settings_current_org 
ON public.user_llm_settings(current_organization_id);

COMMENT ON COLUMN public.user_llm_settings.prefer_org_keys IS 'Prefer organization API keys over user keys when available';
COMMENT ON COLUMN public.user_llm_settings.current_organization_id IS 'Currently active organization for this user';

-- ============================================
-- 10. CREATE HELPER VIEWS
-- ============================================

-- View: User's accessible agents across all organizations (using created_by column)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'agents' AND column_name = 'created_by'
  ) THEN
    CREATE OR REPLACE VIEW public.user_accessible_agents AS
    SELECT DISTINCT
      a.*,
      om.organization_id as user_organization_id,
      om.role as user_role,
      CASE 
        WHEN a.created_by = auth.uid() THEN 'owner'
        WHEN a.organization_id IS NOT NULL THEN 'organization'
        WHEN auth.uid()::text = ANY(SELECT jsonb_array_elements_text(a.shared_with)) THEN 'shared'
        ELSE 'public'
      END as access_type
    FROM public.agents a
    LEFT JOIN public.organization_members om ON a.organization_id = om.organization_id
    WHERE 
      -- Own agents
      a.created_by = auth.uid()
      OR
      -- Organization agents
      (a.organization_id = om.organization_id AND om.user_id = auth.uid() AND om.status = 'active')
      OR
      -- Shared agents
      auth.uid()::text = ANY(SELECT jsonb_array_elements_text(a.shared_with))
      OR
      -- Public agents
      a.visibility = 'public';
  END IF;
END $$;

-- View: Organization resource summary
CREATE OR REPLACE VIEW public.organization_resource_summary AS
SELECT 
  o.id as organization_id,
  o.name as organization_name,
  o.plan,
  o.status,
  COUNT(DISTINCT a.id) as total_agents,
  COUNT(DISTINCT om.user_id) as total_members,
  COUNT(DISTINCT w.id) as total_workflows,
  COALESCE(ols.current_requests, 0) as current_llm_requests,
  COALESCE(ols.monthly_request_quota, 0) as llm_request_quota,
  COALESCE(ols.current_cost_monthly, 0) as current_monthly_cost
FROM public.organizations o
LEFT JOIN public.agents a ON o.id = a.organization_id
LEFT JOIN public.organization_members om ON o.id = om.organization_id AND om.status = 'active'
LEFT JOIN public.workflows w ON o.id = w.organization_id
LEFT JOIN public.organization_llm_settings ols ON o.id = ols.organization_id
GROUP BY o.id, o.name, o.plan, o.status, ols.current_requests, ols.monthly_request_quota, ols.current_cost_monthly;

-- ============================================
-- 11. MIGRATION HELPER FUNCTIONS
-- ============================================

-- Function to assign existing agents to personal organization
CREATE OR REPLACE FUNCTION public.migrate_user_to_organization(p_user_id uuid, p_organization_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update user's agents (using created_by column)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'agents' AND column_name = 'created_by'
  ) THEN
    UPDATE public.agents
    SET organization_id = p_organization_id,
        visibility = 'organization'
    WHERE created_by = p_user_id AND organization_id IS NULL;
  END IF;

  -- Update user's workflows
  UPDATE public.workflows
  SET organization_id = p_organization_id,
      visibility = 'organization'
  WHERE created_by = p_user_id AND organization_id IS NULL;

  -- Update user's documents
  UPDATE public.uploaded_documents
  SET organization_id = p_organization_id,
      visibility = 'organization'
  WHERE user_id = p_user_id AND organization_id IS NULL;

  -- Set current organization
  UPDATE public.user_llm_settings
  SET current_organization_id = p_organization_id
  WHERE user_id = p_user_id;
END;
$$;

-- Function to create personal organization for user
CREATE OR REPLACE FUNCTION public.create_personal_organization(p_user_id uuid, p_user_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id uuid;
  v_slug text;
BEGIN
  -- Generate unique slug from email
  v_slug := regexp_replace(split_part(p_user_email, '@', 1), '[^a-z0-9]', '-', 'g') || '-' || substr(md5(p_user_id::text), 1, 6);

  -- Create organization
  INSERT INTO public.organizations (name, slug, plan, status)
  VALUES (
    split_part(p_user_email, '@', 1) || '''s Workspace',
    v_slug,
    'trial',
    'active'
  )
  RETURNING id INTO v_org_id;

  -- Add user as owner
  INSERT INTO public.organization_members (organization_id, user_id, role, status)
  VALUES (v_org_id, p_user_id, 'owner', 'active');

  -- Migrate user's existing resources
  PERFORM public.migrate_user_to_organization(p_user_id, v_org_id);

  RETURN v_org_id;
END;
$$;

-- ============================================
-- 12. COMMENTS
-- ============================================

COMMENT ON VIEW public.user_accessible_agents IS 'All agents accessible to the current user across personal and organizational contexts';
COMMENT ON VIEW public.organization_resource_summary IS 'Summary of resources and usage per organization';
COMMENT ON FUNCTION public.migrate_user_to_organization IS 'Migrate user resources to an organization';
COMMENT ON FUNCTION public.create_personal_organization IS 'Create a personal workspace organization for a user';


