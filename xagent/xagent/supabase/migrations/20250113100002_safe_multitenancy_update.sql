-- ============================================
-- SAFE MULTI-TENANCY UPDATE
-- ============================================
-- This migration safely adds multi-tenancy support by checking
-- the actual database schema before making any changes

-- ============================================
-- 1. SAFE AGENTS TABLE UPDATE
-- ============================================

-- Add organization columns to agents table (if it exists and columns don't exist)
DO $$ 
BEGIN
  -- Check if agents table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agents' AND table_schema = 'public') THEN
    
    -- Add organization_id column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'agents' AND column_name = 'organization_id' AND table_schema = 'public'
    ) THEN
      ALTER TABLE public.agents ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
      RAISE NOTICE 'Added organization_id column to agents table';
    ELSE
      RAISE NOTICE 'organization_id column already exists in agents table';
    END IF;

    -- Add visibility column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'agents' AND column_name = 'visibility' AND table_schema = 'public'
    ) THEN
      ALTER TABLE public.agents ADD COLUMN visibility text DEFAULT 'organization' CHECK (visibility IN ('private', 'organization', 'team', 'public'));
      RAISE NOTICE 'Added visibility column to agents table';
    ELSE
      RAISE NOTICE 'visibility column already exists in agents table';
    END IF;

    -- Add shared_with column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'agents' AND column_name = 'shared_with' AND table_schema = 'public'
    ) THEN
      ALTER TABLE public.agents ADD COLUMN shared_with jsonb DEFAULT '[]'::jsonb;
      RAISE NOTICE 'Added shared_with column to agents table';
    ELSE
      RAISE NOTICE 'shared_with column already exists in agents table';
    END IF;

    -- Add team_ids column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'agents' AND column_name = 'team_ids' AND table_schema = 'public'
    ) THEN
      ALTER TABLE public.agents ADD COLUMN team_ids jsonb DEFAULT '[]'::jsonb;
      RAISE NOTICE 'Added team_ids column to agents table';
    ELSE
      RAISE NOTICE 'team_ids column already exists in agents table';
    END IF;

  ELSE
    RAISE NOTICE 'agents table does not exist, skipping';
  END IF;
END $$;

-- Create indexes for agents table (only if table and columns exist)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agents' AND table_schema = 'public') THEN
    
    -- Create organization_id index if column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'organization_id' AND table_schema = 'public') THEN
      CREATE INDEX IF NOT EXISTS idx_agents_organization_id ON public.agents(organization_id);
      RAISE NOTICE 'Created idx_agents_organization_id index';
    END IF;

    -- Create visibility index if column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'visibility' AND table_schema = 'public') THEN
      CREATE INDEX IF NOT EXISTS idx_agents_visibility ON public.agents(visibility);
      RAISE NOTICE 'Created idx_agents_visibility index';
    END IF;

    -- Create user_id + organization_id index if both columns exist
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'user_id' AND table_schema = 'public') 
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'organization_id' AND table_schema = 'public') THEN
      CREATE INDEX IF NOT EXISTS idx_agents_user_org ON public.agents(user_id, organization_id);
      RAISE NOTICE 'Created idx_agents_user_org index';
    END IF;

  END IF;
END $$;

-- ============================================
-- 2. SAFE WORKFLOWS TABLE UPDATE
-- ============================================

-- Add organization columns to workflows table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workflows' AND table_schema = 'public') THEN
    
    -- Add organization_id column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'workflows' AND column_name = 'organization_id' AND table_schema = 'public'
    ) THEN
      ALTER TABLE public.workflows ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
      RAISE NOTICE 'Added organization_id column to workflows table';
    END IF;

    -- Add visibility column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'workflows' AND column_name = 'visibility' AND table_schema = 'public'
    ) THEN
      ALTER TABLE public.workflows ADD COLUMN visibility text DEFAULT 'organization' CHECK (visibility IN ('private', 'organization', 'team', 'public'));
      RAISE NOTICE 'Added visibility column to workflows table';
    END IF;

    -- Add shared_with column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'workflows' AND column_name = 'shared_with' AND table_schema = 'public'
    ) THEN
      ALTER TABLE public.workflows ADD COLUMN shared_with jsonb DEFAULT '[]'::jsonb;
      RAISE NOTICE 'Added shared_with column to workflows table';
    END IF;

    -- Add created_by column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'workflows' AND column_name = 'created_by' AND table_schema = 'public'
    ) THEN
      ALTER TABLE public.workflows ADD COLUMN created_by uuid REFERENCES auth.users(id);
      RAISE NOTICE 'Added created_by column to workflows table';
    END IF;

  ELSE
    RAISE NOTICE 'workflows table does not exist, skipping';
  END IF;
END $$;

-- Create indexes for workflows table
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workflows' AND table_schema = 'public') THEN
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workflows' AND column_name = 'organization_id' AND table_schema = 'public') THEN
      CREATE INDEX IF NOT EXISTS idx_workflows_organization_id ON public.workflows(organization_id);
      RAISE NOTICE 'Created idx_workflows_organization_id index';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workflows' AND column_name = 'visibility' AND table_schema = 'public') THEN
      CREATE INDEX IF NOT EXISTS idx_workflows_visibility ON public.workflows(visibility);
      RAISE NOTICE 'Created idx_workflows_visibility index';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workflows' AND column_name = 'created_by' AND table_schema = 'public') THEN
      CREATE INDEX IF NOT EXISTS idx_workflows_created_by ON public.workflows(created_by);
      RAISE NOTICE 'Created idx_workflows_created_by index';
    END IF;

  END IF;
END $$;

-- ============================================
-- 3. SAFE UPLOADED_DOCUMENTS TABLE UPDATE
-- ============================================

-- Add organization columns to uploaded_documents table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'uploaded_documents' AND table_schema = 'public') THEN
    
    -- Add organization_id column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'uploaded_documents' AND column_name = 'organization_id' AND table_schema = 'public'
    ) THEN
      ALTER TABLE public.uploaded_documents ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
      RAISE NOTICE 'Added organization_id column to uploaded_documents table';
    END IF;

    -- Add visibility column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'uploaded_documents' AND column_name = 'visibility' AND table_schema = 'public'
    ) THEN
      ALTER TABLE public.uploaded_documents ADD COLUMN visibility text DEFAULT 'organization' CHECK (visibility IN ('private', 'organization', 'team', 'public'));
      RAISE NOTICE 'Added visibility column to uploaded_documents table';
    END IF;

    -- Add shared_with column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'uploaded_documents' AND column_name = 'shared_with' AND table_schema = 'public'
    ) THEN
      ALTER TABLE public.uploaded_documents ADD COLUMN shared_with jsonb DEFAULT '[]'::jsonb;
      RAISE NOTICE 'Added shared_with column to uploaded_documents table';
    END IF;

    -- Add user_id column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'uploaded_documents' AND column_name = 'user_id' AND table_schema = 'public'
    ) THEN
      ALTER TABLE public.uploaded_documents ADD COLUMN user_id uuid REFERENCES auth.users(id);
      RAISE NOTICE 'Added user_id column to uploaded_documents table';
    END IF;

  ELSE
    RAISE NOTICE 'uploaded_documents table does not exist, skipping';
  END IF;
END $$;

-- ============================================
-- 4. SAFE CONVERSATIONS TABLE UPDATE
-- ============================================

-- Add organization_id to conversations table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations' AND table_schema = 'public') THEN
    
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'conversations' AND column_name = 'organization_id' AND table_schema = 'public'
    ) THEN
      ALTER TABLE public.conversations ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
      RAISE NOTICE 'Added organization_id column to conversations table';
    ELSE
      RAISE NOTICE 'organization_id column already exists in conversations table';
    END IF;

  ELSE
    RAISE NOTICE 'conversations table does not exist, skipping';
  END IF;
END $$;

-- ============================================
-- 5. SAFE DOCUMENTS TABLE UPDATE
-- ============================================

-- Add organization columns to documents table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents' AND table_schema = 'public') THEN
    
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'documents' AND column_name = 'organization_id' AND table_schema = 'public'
    ) THEN
      ALTER TABLE public.documents ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
      RAISE NOTICE 'Added organization_id column to documents table';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'documents' AND column_name = 'visibility' AND table_schema = 'public'
    ) THEN
      ALTER TABLE public.documents ADD COLUMN visibility text DEFAULT 'organization' CHECK (visibility IN ('private', 'organization', 'team', 'public'));
      RAISE NOTICE 'Added visibility column to documents table';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'documents' AND column_name = 'shared_with' AND table_schema = 'public'
    ) THEN
      ALTER TABLE public.documents ADD COLUMN shared_with jsonb DEFAULT '[]'::jsonb;
      RAISE NOTICE 'Added shared_with column to documents table';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'documents' AND column_name = 'user_id' AND table_schema = 'public'
    ) THEN
      ALTER TABLE public.documents ADD COLUMN user_id uuid REFERENCES auth.users(id);
      RAISE NOTICE 'Added user_id column to documents table';
    END IF;

  ELSE
    RAISE NOTICE 'documents table does not exist, skipping';
  END IF;
END $$;

-- ============================================
-- 6. SAFE AGENT_PERSONALITY_TRAITS TABLE UPDATE
-- ============================================

-- Add organization_id to agent_personality_traits table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agent_personality_traits' AND table_schema = 'public') THEN
    
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'agent_personality_traits' AND column_name = 'organization_id' AND table_schema = 'public'
    ) THEN
      ALTER TABLE public.agent_personality_traits ADD COLUMN organization_id uuid;
      RAISE NOTICE 'Added organization_id column to agent_personality_traits table';
    ELSE
      RAISE NOTICE 'organization_id column already exists in agent_personality_traits table';
    END IF;

  ELSE
    RAISE NOTICE 'agent_personality_traits table does not exist, skipping';
  END IF;
END $$;

-- ============================================
-- 7. SAFE AGENT_SKILLS TABLE UPDATE
-- ============================================

-- Add organization_id to agent_skills table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agent_skills' AND table_schema = 'public') THEN
    
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'agent_skills' AND column_name = 'organization_id' AND table_schema = 'public'
    ) THEN
      ALTER TABLE public.agent_skills ADD COLUMN organization_id uuid;
      RAISE NOTICE 'Added organization_id column to agent_skills table';
    ELSE
      RAISE NOTICE 'organization_id column already exists in agent_skills table';
    END IF;

  ELSE
    RAISE NOTICE 'agent_skills table does not exist, skipping';
  END IF;
END $$;

-- ============================================
-- 8. ADD COMMENTS
-- ============================================

-- Add comments to explain the new columns
DO $$ 
BEGIN
  -- Add comments to agents table columns
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agents' AND table_schema = 'public') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'organization_id' AND table_schema = 'public') THEN
      COMMENT ON COLUMN public.agents.organization_id IS 'Organization this agent belongs to (NULL for personal agents)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'visibility' AND table_schema = 'public') THEN
      COMMENT ON COLUMN public.agents.visibility IS 'Agent visibility: private (owner only), organization (all org members), team (specific teams), public (everyone)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'shared_with' AND table_schema = 'public') THEN
      COMMENT ON COLUMN public.agents.shared_with IS 'Array of user IDs this agent is explicitly shared with';
    END IF;
  END IF;
END $$;

-- ============================================
-- 9. SUMMARY
-- ============================================

-- Log what was done
DO $$ 
BEGIN
  RAISE NOTICE 'Multi-tenancy migration completed successfully!';
  RAISE NOTICE 'All existing tables have been safely updated with organization support.';
  RAISE NOTICE 'New columns added: organization_id, visibility, shared_with (where applicable)';
  RAISE NOTICE 'Indexes created for performance optimization';
  RAISE NOTICE 'Comments added to document the new schema';
END $$;
