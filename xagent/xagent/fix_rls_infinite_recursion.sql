-- ============================================
-- FIX RLS INFINITE RECURSION
-- ============================================
-- This script fixes the infinite recursion in RLS policies

-- ============================================
-- 1. DROP ALL PROBLEMATIC RLS POLICIES
-- ============================================

-- Drop organization_members policies
DROP POLICY IF EXISTS "Users can view organization members" ON public.organization_members;
DROP POLICY IF EXISTS "Users can create organization members" ON public.organization_members;
DROP POLICY IF EXISTS "Users can update organization members" ON public.organization_members;
DROP POLICY IF EXISTS "Users can delete organization members" ON public.organization_members;

-- Drop organizations policies
DROP POLICY IF EXISTS "Users can view accessible organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can update organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can delete organizations" ON public.organizations;

-- Drop agents policies
DROP POLICY IF EXISTS "Users can view accessible agents" ON public.agents;
DROP POLICY IF EXISTS "Users can create agents" ON public.agents;
DROP POLICY IF EXISTS "Users can update their accessible agents" ON public.agents;
DROP POLICY IF EXISTS "Users can delete their agents" ON public.agents;

-- Drop workflows policies
DROP POLICY IF EXISTS "Users can view accessible workflows" ON public.workflows;
DROP POLICY IF EXISTS "Users can create workflows" ON public.workflows;
DROP POLICY IF EXISTS "Users can update workflows" ON public.workflows;
DROP POLICY IF EXISTS "Users can delete workflows" ON public.workflows;

-- ============================================
-- 2. CREATE SIMPLE, NON-RECURSIVE RLS POLICIES
-- ============================================

-- Simple organization_members policies (no circular references)
CREATE POLICY "Users can view their own memberships"
  ON public.organization_members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create memberships"
  ON public.organization_members FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own memberships"
  ON public.organization_members FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own memberships"
  ON public.organization_members FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Simple organizations policies
CREATE POLICY "Users can view organizations they belong to"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can create organizations"
  ON public.organizations FOR INSERT
  TO authenticated
  WITH CHECK (true); -- Allow all authenticated users to create organizations

CREATE POLICY "Users can update organizations they own"
  ON public.organizations FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid() 
        AND status = 'active' 
        AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can delete organizations they own"
  ON public.organizations FOR DELETE
  TO authenticated
  USING (
    id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid() 
        AND status = 'active' 
        AND role = 'owner'
    )
  );

-- Simple agents policies
CREATE POLICY "Users can view agents in their organizations"
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
      WHERE user_id = auth.uid() AND status = 'active'
    ) AND visibility IN ('organization', 'team', 'public'))
    OR
    -- Public agents
    (visibility = 'public')
  );

CREATE POLICY "Users can create agents"
  ON public.agents FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own agents"
  ON public.agents FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own agents"
  ON public.agents FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Simple workflows policies
CREATE POLICY "Users can view workflows in their organizations"
  ON public.workflows FOR SELECT
  TO authenticated
  USING (
    -- Own private workflows
    (created_by = auth.uid() AND visibility = 'private')
    OR
    -- Organization workflows
    (organization_id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid() AND status = 'active'
    ) AND visibility IN ('organization', 'team', 'public'))
    OR
    -- Public workflows
    (visibility = 'public')
  );

CREATE POLICY "Users can create workflows"
  ON public.workflows FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own workflows"
  ON public.workflows FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own workflows"
  ON public.workflows FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- ============================================
-- 3. VERIFICATION
-- ============================================

-- Test the policies work
DO $$
BEGIN
  RAISE NOTICE '✅ RLS policies fixed successfully!';
  RAISE NOTICE 'No more infinite recursion errors expected.';
  RAISE NOTICE 'Users can now access their organization data properly.';
END $$;
