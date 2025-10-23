-- ============================================
-- PRODUCT-LEVEL TOOL ARCHITECTURE
-- 3-Tier System: Product → Organization → Agent
-- ============================================

-- ============================================
-- TIER 1: PRODUCT-LEVEL TOOLS (Global Registry)
-- ============================================

-- Update existing tools table to be product-level (remove organization_id constraint)
-- Tools are registered at PRODUCT LEVEL and available to all organizations

ALTER TABLE IF EXISTS public.tools 
  DROP CONSTRAINT IF EXISTS tools_organization_id_fkey;

-- Add is_system_tool flag to distinguish built-in vs custom tools
ALTER TABLE IF EXISTS public.tools 
  ADD COLUMN IF NOT EXISTS is_system_tool BOOLEAN DEFAULT false;

-- Add is_public flag to control which tools are available globally
ALTER TABLE IF EXISTS public.tools 
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

COMMENT ON TABLE public.tools IS 'Product-level global tool registry. Tools registered here are available for organizations to enable.';
COMMENT ON COLUMN public.tools.is_system_tool IS 'Built-in tools (Email, CRM, etc.) vs custom user-created tools';
COMMENT ON COLUMN public.tools.is_public IS 'If true, tool is available to all organizations. If false, only specific orgs can enable it.';
COMMENT ON COLUMN public.tools.organization_id IS 'If null, tool is product-level. If set, tool is organization-specific (custom integration).';

-- ============================================
-- TIER 2: ORGANIZATION-ENABLED TOOLS
-- ============================================

-- Create organization_tools table for organization-level enablement
CREATE TABLE IF NOT EXISTS public.organization_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES public.tools(id) ON DELETE CASCADE,
  
  -- Configuration
  is_enabled BOOLEAN DEFAULT true,
  config_overrides JSONB DEFAULT '{}'::jsonb, -- Organization-specific config (e.g., API keys, endpoints)
  
  -- Settings
  max_usage_per_day INTEGER, -- Usage limits per org
  cost_allocation TEXT, -- Which department/team pays for this tool
  
  -- Permissions
  allowed_roles TEXT[] DEFAULT ARRAY['owner', 'admin', 'manager', 'member']::TEXT[], -- Which roles can use this tool
  restricted_skills TEXT[] DEFAULT ARRAY[]::TEXT[], -- Skills that are disabled for this org
  
  -- Metadata
  enabled_by UUID REFERENCES auth.users(id), -- Who enabled this tool
  enabled_at TIMESTAMPTZ DEFAULT NOW(),
  disabled_at TIMESTAMPTZ,
  disabled_by UUID REFERENCES auth.users(id),
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(organization_id, tool_id)
);

COMMENT ON TABLE public.organization_tools IS 'Organization-level tool enablement. Controls which product-level tools are available to an organization.';

-- ============================================
-- TIER 3: AGENT-ATTACHED TOOLS (Per Agent)
-- ============================================

-- agent_tools table already exists, update it to reference organization_tools
-- This ensures agents can only attach tools that are enabled for their organization

COMMENT ON TABLE public.agent_tools IS 'Agent-level tool attachments. Agents can only attach tools that are enabled for their organization.';

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_organization_tools_org_id ON public.organization_tools(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_tools_tool_id ON public.organization_tools(tool_id);
CREATE INDEX IF NOT EXISTS idx_organization_tools_enabled ON public.organization_tools(is_enabled) WHERE is_enabled = true;

CREATE INDEX IF NOT EXISTS idx_tools_public ON public.tools(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_tools_system ON public.tools(is_system_tool) WHERE is_system_tool = true;
CREATE INDEX IF NOT EXISTS idx_tools_active ON public.tools(is_active) WHERE is_active = true;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE public.organization_tools ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "organization_tools_select_policy" ON public.organization_tools;
DROP POLICY IF EXISTS "organization_tools_insert_policy" ON public.organization_tools;
DROP POLICY IF EXISTS "organization_tools_update_policy" ON public.organization_tools;
DROP POLICY IF EXISTS "organization_tools_delete_policy" ON public.organization_tools;

-- SELECT: Members can view their organization's enabled tools
CREATE POLICY "organization_tools_select_policy" ON public.organization_tools
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- INSERT: Only owners/admins can enable tools for organization
CREATE POLICY "organization_tools_insert_policy" ON public.organization_tools
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- UPDATE: Only owners/admins can update tool configuration
CREATE POLICY "organization_tools_update_policy" ON public.organization_tools
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- DELETE: Only owners can disable/remove tools
CREATE POLICY "organization_tools_delete_policy" ON public.organization_tools
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid()
      AND role = 'owner'
    )
  );

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Check if organization has enabled a tool
CREATE OR REPLACE FUNCTION public.organization_has_tool(
  org_id UUID,
  tool_id_param UUID
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.organization_tools 
    WHERE organization_id = org_id 
    AND tool_id = tool_id_param 
    AND is_enabled = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get all enabled tools for an organization
CREATE OR REPLACE FUNCTION public.get_organization_enabled_tools(org_id UUID)
RETURNS TABLE (
  tool_id UUID,
  tool_name TEXT,
  tool_description TEXT,
  tool_category TEXT,
  skill_count INTEGER,
  config_overrides JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.description,
    t.type,
    (SELECT COUNT(*) FROM public.tool_skills WHERE tool_id = t.id)::INTEGER,
    ot.config_overrides
  FROM public.tools t
  INNER JOIN public.organization_tools ot ON t.id = ot.tool_id
  WHERE ot.organization_id = org_id
  AND ot.is_enabled = true
  AND t.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SEED DATA: Register Built-in Tools as Product-Level
-- ============================================

-- Insert built-in tools as product-level (system tools)
INSERT INTO public.tools (id, name, description, type, is_active, is_system_tool, is_public, created_at)
VALUES
  (gen_random_uuid(), 'Email Tool', 'Process, parse, and manage emails with AI', 'email', true, true, true, NOW()),
  (gen_random_uuid(), 'CRM Tool', 'Salesforce integration for lead and opportunity management', 'crm', true, true, true, NOW()),
  (gen_random_uuid(), 'Zoho Tool', 'Zoho Books integration for invoice and customer management', 'custom', true, true, true, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- VALIDATION
-- ============================================

-- Verify tables exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organization_tools') THEN
    RAISE EXCEPTION 'organization_tools table not created!';
  END IF;
  
  RAISE NOTICE '✅ Organization tools table created successfully';
  RAISE NOTICE '✅ Product-level tool architecture implemented';
  RAISE NOTICE '✅ 3-tier system: Product → Organization → Agent';
END $$;


