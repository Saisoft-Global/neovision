-- ============================================
-- CLEANUP DUPLICATE POLICIES
-- ============================================
-- This migration cleans up duplicate RLS policies that may exist
-- from previous migration attempts

-- ============================================
-- 1. CLEANUP WORKFLOWS TABLE POLICIES
-- ============================================

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workflows' AND table_schema = 'public') THEN
    
    -- Drop ALL existing policies to start fresh
    DROP POLICY IF EXISTS "Users can view workflows" ON public.workflows;
    DROP POLICY IF EXISTS "Users can create workflows" ON public.workflows;
    DROP POLICY IF EXISTS "Users can update workflows" ON public.workflows;
    DROP POLICY IF EXISTS "Users can delete workflows" ON public.workflows;
    DROP POLICY IF EXISTS "Workflows are viewable by authenticated users" ON public.workflows;
    DROP POLICY IF EXISTS "Workflows can be created by authenticated users" ON public.workflows;
    DROP POLICY IF EXISTS "Workflows can be updated by owners and admins" ON public.workflows;
    DROP POLICY IF EXISTS "Workflows can be deleted by owners and admins" ON public.workflows;
    DROP POLICY IF EXISTS "Users can view accessible workflows" ON public.workflows;
    DROP POLICY IF EXISTS "Users can create workflows" ON public.workflows;
    DROP POLICY IF EXISTS "Users can update workflows" ON public.workflows;
    DROP POLICY IF EXISTS "Users can delete workflows" ON public.workflows;
    
    RAISE NOTICE 'Dropped all existing workflows policies';
    
    -- Create clean multi-tenant policies
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
      
    RAISE NOTICE 'Created clean multi-tenant workflows policies';
    
  ELSE
    RAISE NOTICE 'workflows table does not exist, skipping';
  END IF;
END $$;

-- ============================================
-- 2. CLEANUP AGENTS TABLE POLICIES
-- ============================================

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agents' AND table_schema = 'public') THEN
    
    -- Drop ALL existing policies to start fresh
    DROP POLICY IF EXISTS "Agents are viewable by authenticated users" ON public.agents;
    DROP POLICY IF EXISTS "Agents can be created by authenticated users" ON public.agents;
    DROP POLICY IF EXISTS "Agents can be updated by owners and admins" ON public.agents;
    DROP POLICY IF EXISTS "Agents can be deleted by admins" ON public.agents;
    DROP POLICY IF EXISTS "Users can view their own agents" ON public.agents;
    DROP POLICY IF EXISTS "Users can create their own agents" ON public.agents;
    DROP POLICY IF EXISTS "Users can update their own agents" ON public.agents;
    DROP POLICY IF EXISTS "Users can delete their own agents" ON public.agents;
    DROP POLICY IF EXISTS "Users can view accessible agents" ON public.agents;
    DROP POLICY IF EXISTS "Users can create agents" ON public.agents;
    DROP POLICY IF EXISTS "Users can update their accessible agents" ON public.agents;
    DROP POLICY IF EXISTS "Users can delete their agents" ON public.agents;
    
    RAISE NOTICE 'Dropped all existing agents policies';
    
    -- Create clean multi-tenant policies
    CREATE POLICY "Users can view accessible agents"
      ON public.agents FOR SELECT
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

    CREATE POLICY "Users can create agents"
      ON public.agents FOR INSERT
      TO authenticated
      WITH CHECK (
        created_by = auth.uid()
        AND (
          organization_id IS NULL 
          OR organization_id IN (
            SELECT organization_id FROM public.organization_members 
            WHERE user_id = auth.uid() AND status = 'active'
            AND (permissions->'agents'->>'create')::boolean = true
          )
        )
      );

    CREATE POLICY "Users can update their accessible agents"
      ON public.agents FOR UPDATE
      TO authenticated
      USING (
        created_by = auth.uid()
        OR (organization_id IN (
          SELECT organization_id FROM public.organization_members 
          WHERE user_id = auth.uid() AND status = 'active'
          AND (permissions->'agents'->>'update')::boolean = true
        ))
      );

    CREATE POLICY "Users can delete their agents"
      ON public.agents FOR DELETE
      TO authenticated
      USING (
        created_by = auth.uid()
        OR (organization_id IN (
          SELECT organization_id FROM public.organization_members 
          WHERE user_id = auth.uid() AND status = 'active'
          AND role IN ('owner', 'admin')
        ))
      );
      
    RAISE NOTICE 'Created clean multi-tenant agents policies';
    
  ELSE
    RAISE NOTICE 'agents table does not exist, skipping';
  END IF;
END $$;

-- ============================================
-- 3. CLEANUP DOCUMENTS TABLE POLICIES
-- ============================================

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents' AND table_schema = 'public') THEN
    
    -- Drop ALL existing policies to start fresh
    DROP POLICY IF EXISTS "Allow authenticated read access" ON public.documents;
    DROP POLICY IF EXISTS "Allow authenticated write access" ON public.documents;
    DROP POLICY IF EXISTS "Documents are viewable by authenticated users" ON public.documents;
    DROP POLICY IF EXISTS "Documents can be created by authenticated users" ON public.documents;
    DROP POLICY IF EXISTS "Documents can be updated by owners and admins" ON public.documents;
    DROP POLICY IF EXISTS "Documents can be deleted by owners and admins" ON public.documents;
    
    RAISE NOTICE 'Dropped all existing documents policies';
    
    -- Create clean multi-tenant policies (documents table uses user_id)
    CREATE POLICY "Users can view accessible documents"
      ON public.documents FOR SELECT
      TO authenticated
      USING (
        (user_id = auth.uid() AND visibility = 'private')
        OR (organization_id IN (
          SELECT organization_id FROM public.organization_members 
          WHERE user_id = auth.uid() AND status = 'active'
        ) AND visibility IN ('organization', 'team', 'public'))
        OR (auth.uid()::text = ANY(SELECT jsonb_array_elements_text(shared_with)))
        OR (visibility = 'public')
      );

    CREATE POLICY "Users can create documents"
      ON public.documents FOR INSERT
      TO authenticated
      WITH CHECK (
        user_id = auth.uid()
        AND (
          organization_id IS NULL 
          OR organization_id IN (
            SELECT organization_id FROM public.organization_members 
            WHERE user_id = auth.uid() AND status = 'active'
            AND (permissions->'documents'->>'create')::boolean = true
          )
        )
      );

    CREATE POLICY "Users can update their accessible documents"
      ON public.documents FOR UPDATE
      TO authenticated
      USING (
        user_id = auth.uid()
        OR (organization_id IN (
          SELECT organization_id FROM public.organization_members 
          WHERE user_id = auth.uid() AND status = 'active'
          AND (permissions->'documents'->>'update')::boolean = true
        ))
      );

    CREATE POLICY "Users can delete their documents"
      ON public.documents FOR DELETE
      TO authenticated
      USING (
        user_id = auth.uid()
        OR (organization_id IN (
          SELECT organization_id FROM public.organization_members 
          WHERE user_id = auth.uid() AND status = 'active'
          AND role IN ('owner', 'admin')
        ))
      );
      
    RAISE NOTICE 'Created clean multi-tenant documents policies';
    
  ELSE
    RAISE NOTICE 'documents table does not exist, skipping';
  END IF;
END $$;

-- ============================================
-- 4. SUMMARY
-- ============================================

DO $$ 
BEGIN
  RAISE NOTICE 'Policy cleanup completed successfully!';
  RAISE NOTICE 'All duplicate policies have been removed and replaced with clean multi-tenant policies';
  RAISE NOTICE 'Agents table uses created_by column';
  RAISE NOTICE 'Workflows table uses created_by column';
  RAISE NOTICE 'Documents table uses user_id column';
END $$;
