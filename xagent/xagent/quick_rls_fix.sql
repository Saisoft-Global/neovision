-- Quick fix for infinite recursion - handles existing policies
-- This script will drop and recreate the problematic policies

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view organization members" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view accessible organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON public.organizations;

-- Create simplified policies without circular dependencies
CREATE POLICY "Users can view their own memberships"
  ON public.organization_members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

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

-- Also fix the agents and workflows policies to prevent similar issues
DROP POLICY IF EXISTS "Users can view accessible agents" ON public.agents;
DROP POLICY IF EXISTS "Users can view accessible workflows" ON public.workflows;

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
    -- Public agents
    (visibility = 'public')
  );

CREATE POLICY "Users can view accessible workflows"
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
      WHERE user_id = auth.uid() 
        AND status = 'active'
    ) AND visibility IN ('organization', 'team', 'public'))
    OR
    -- Public workflows
    (visibility = 'public')
  );

-- Success message
SELECT 'RLS policies fixed successfully! Infinite recursion should be resolved.' as status;
