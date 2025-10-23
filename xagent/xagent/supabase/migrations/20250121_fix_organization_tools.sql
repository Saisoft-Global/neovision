-- =====================================================
-- FIX: Create organization_tools table if missing
-- Purpose: Track which tools are enabled for which organizations
-- =====================================================

-- Create organization_tools table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.organization_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tool_id TEXT NOT NULL, -- Can be UUID or text depending on tools table
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, tool_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_org_tools_org ON public.organization_tools(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_tools_tool ON public.organization_tools(tool_id);
CREATE INDEX IF NOT EXISTS idx_org_tools_enabled ON public.organization_tools(is_enabled) WHERE is_enabled = true;

-- Enable RLS
ALTER TABLE public.organization_tools ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view tools enabled for their organization
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'organization_tools' 
    AND policyname = 'Users can view their org''s enabled tools'
  ) THEN
    CREATE POLICY "Users can view their org's enabled tools"
      ON public.organization_tools
      FOR SELECT
      USING (
        organization_id IN (
          SELECT organization_id 
          FROM public.organization_members 
          WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- RLS Policy: Users can enable tools for their organization
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'organization_tools' 
    AND policyname = 'Users can enable tools for their org'
  ) THEN
    CREATE POLICY "Users can enable tools for their org"
      ON public.organization_tools
      FOR INSERT
      WITH CHECK (
        organization_id IN (
          SELECT organization_id 
          FROM public.organization_members 
          WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- RLS Policy: Users can update tool enablement
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'organization_tools' 
    AND policyname = 'Users can update their org''s tool enablement'
  ) THEN
    CREATE POLICY "Users can update their org's tool enablement"
      ON public.organization_tools
      FOR UPDATE
      USING (
        organization_id IN (
          SELECT organization_id 
          FROM public.organization_members 
          WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- RLS Policy: Users can delete tool enablement
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'organization_tools' 
    AND policyname = 'Users can delete their org''s tool enablement'
  ) THEN
    CREATE POLICY "Users can delete their org's tool enablement"
      ON public.organization_tools
      FOR DELETE
      USING (
        organization_id IN (
          SELECT organization_id 
          FROM public.organization_members 
          WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Comment
COMMENT ON TABLE public.organization_tools IS 'Tracks which tools are enabled for which organizations';



