-- ============================================
-- CREATE TOOLS TABLE
-- ============================================
-- This migration creates the tools table for the dynamic tools & skills framework

-- Create tools table
CREATE TABLE IF NOT EXISTS public.tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  type text NOT NULL CHECK (type IN ('email', 'crm', 'calendar', 'database', 'file_storage', 'analytics', 'custom')),
  config jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  is_system_tool boolean DEFAULT false, -- System tools vs user-created tools
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  visibility text DEFAULT 'organization' CHECK (visibility IN ('private', 'organization', 'team', 'public')),
  shared_with jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tools_type ON public.tools(type);
CREATE INDEX IF NOT EXISTS idx_tools_is_active ON public.tools(is_active);
CREATE INDEX IF NOT EXISTS idx_tools_is_system_tool ON public.tools(is_system_tool);
CREATE INDEX IF NOT EXISTS idx_tools_created_by ON public.tools(created_by);
CREATE INDEX IF NOT EXISTS idx_tools_organization_id ON public.tools(organization_id);
CREATE INDEX IF NOT EXISTS idx_tools_visibility ON public.tools(visibility);
CREATE INDEX IF NOT EXISTS idx_tools_created_by_org ON public.tools(created_by, organization_id);

-- Create tool_skills table to store skills for each tool
CREATE TABLE IF NOT EXISTS public.tool_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id uuid NOT NULL REFERENCES public.tools(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  parameters jsonb DEFAULT '[]'::jsonb,
  required_auth jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(tool_id, name)
);

-- Create indexes for tool_skills
CREATE INDEX IF NOT EXISTS idx_tool_skills_tool_id ON public.tool_skills(tool_id);
CREATE INDEX IF NOT EXISTS idx_tool_skills_name ON public.tool_skills(name);
CREATE INDEX IF NOT EXISTS idx_tool_skills_is_active ON public.tool_skills(is_active);

-- Create agent_tools table to link agents with tools
CREATE TABLE IF NOT EXISTS public.agent_tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  tool_id uuid NOT NULL REFERENCES public.tools(id) ON DELETE CASCADE,
  permissions jsonb DEFAULT '[]'::jsonb, -- Which skills the agent can use
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(agent_id, tool_id)
);

-- Create indexes for agent_tools
CREATE INDEX IF NOT EXISTS idx_agent_tools_agent_id ON public.agent_tools(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_tools_tool_id ON public.agent_tools(tool_id);
CREATE INDEX IF NOT EXISTS idx_agent_tools_is_active ON public.agent_tools(is_active);

-- ============================================
-- RLS POLICIES FOR TOOLS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_tools ENABLE ROW LEVEL SECURITY;

-- Tools RLS policies
CREATE POLICY "Users can view accessible tools"
  ON public.tools FOR SELECT
  TO authenticated
  USING (
    -- System tools (accessible to all)
    is_system_tool = true
    OR
    -- Own private tools
    (created_by = auth.uid() AND visibility = 'private')
    OR
    -- Organization tools
    (organization_id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid() AND status = 'active'
    ) AND visibility IN ('organization', 'team', 'public'))
    OR
    -- Explicitly shared tools
    (auth.uid()::text = ANY(SELECT jsonb_array_elements_text(shared_with)))
    OR
    -- Public tools
    (visibility = 'public')
  );

CREATE POLICY "Users can create tools"
  ON public.tools FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      organization_id IS NULL 
      OR organization_id IN (
        SELECT organization_id FROM public.organization_members 
        WHERE user_id = auth.uid() AND status = 'active'
        AND (permissions->'tools'->>'create')::boolean = true
      )
    )
  );

CREATE POLICY "Users can update their accessible tools"
  ON public.tools FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR (organization_id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid() AND status = 'active'
      AND (permissions->'tools'->>'update')::boolean = true
    ))
  );

CREATE POLICY "Users can delete their tools"
  ON public.tools FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR (organization_id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid() AND status = 'active'
      AND role IN ('owner', 'admin')
    ))
  );

-- Tool skills RLS policies (inherit from parent tool)
CREATE POLICY "Users can view tool skills for accessible tools"
  ON public.tool_skills FOR SELECT
  TO authenticated
  USING (
    tool_id IN (
      SELECT id FROM public.tools WHERE (
        is_system_tool = true
        OR (created_by = auth.uid() AND visibility = 'private')
        OR (organization_id IN (
          SELECT organization_id FROM public.organization_members 
          WHERE user_id = auth.uid() AND status = 'active'
        ) AND visibility IN ('organization', 'team', 'public'))
        OR (auth.uid()::text = ANY(SELECT jsonb_array_elements_text(shared_with)))
        OR (visibility = 'public')
      )
    )
  );

CREATE POLICY "Users can manage tool skills for their tools"
  ON public.tool_skills FOR ALL
  TO authenticated
  USING (
    tool_id IN (
      SELECT id FROM public.tools WHERE created_by = auth.uid()
    )
  );

-- Agent tools RLS policies (inherit from both agent and tool)
CREATE POLICY "Users can view agent tools for accessible agents and tools"
  ON public.agent_tools FOR SELECT
  TO authenticated
  USING (
    agent_id IN (
      SELECT id FROM public.agents WHERE (
        created_by = auth.uid()
        OR (organization_id IN (
          SELECT organization_id FROM public.organization_members 
          WHERE user_id = auth.uid() AND status = 'active'
        ))
        OR (visibility = 'public')
      )
    )
    AND tool_id IN (
      SELECT id FROM public.tools WHERE (
        is_system_tool = true
        OR (created_by = auth.uid())
        OR (organization_id IN (
          SELECT organization_id FROM public.organization_members 
          WHERE user_id = auth.uid() AND status = 'active'
        ))
        OR (visibility = 'public')
      )
    )
  );

CREATE POLICY "Users can manage agent tools for their agents"
  ON public.agent_tools FOR ALL
  TO authenticated
  USING (
    agent_id IN (
      SELECT id FROM public.agents WHERE created_by = auth.uid()
    )
  );

-- ============================================
-- INSERT DEFAULT SYSTEM TOOLS
-- ============================================

-- Insert Email Tool
INSERT INTO public.tools (id, name, description, type, is_system_tool, is_active, visibility) 
VALUES (
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  'Email Tool',
  'Email management and processing capabilities',
  'email',
  true,
  true,
  'public'
) ON CONFLICT (id) DO NOTHING;

-- Insert Email Tool Skills
INSERT INTO public.tool_skills (tool_id, name, description, parameters, required_auth) VALUES
('550e8400-e29b-41d4-a716-446655440001'::uuid, 'parse_email', 'Extract structured information from an email', 
 '[{"name": "email_content", "type": "string", "description": "Raw email content", "required": true}]'::jsonb,
 '["email_read"]'::jsonb),
('550e8400-e29b-41d4-a716-446655440001'::uuid, 'summarize_email', 'Create a concise summary of email content', 
 '[{"name": "email_content", "type": "string", "description": "Email content to summarize", "required": true}]'::jsonb,
 '["email_read"]'::jsonb),
('550e8400-e29b-41d4-a716-446655440001'::uuid, 'identify_critical_email', 'Analyze email to determine if it requires urgent attention', 
 '[{"name": "email_content", "type": "string", "description": "Email content to analyze", "required": true}]'::jsonb,
 '["email_read"]'::jsonb),
('550e8400-e29b-41d4-a716-446655440001'::uuid, 'draft_reply', 'Generate a professional email reply', 
 '[{"name": "original_email", "type": "string", "description": "Original email content", "required": true}, {"name": "reply_context", "type": "string", "description": "Context for the reply", "required": false}]'::jsonb,
 '["email_write"]'::jsonb),
('550e8400-e29b-41d4-a716-446655440001'::uuid, 'classify_email', 'Categorize email into predefined categories', 
 '[{"name": "email_content", "type": "string", "description": "Email content to classify", "required": true}]'::jsonb,
 '["email_read"]'::jsonb)
ON CONFLICT (tool_id, name) DO NOTHING;

-- Insert CRM Tool
INSERT INTO public.tools (id, name, description, type, is_system_tool, is_active, visibility) 
VALUES (
  '550e8400-e29b-41d4-a716-446655440002'::uuid,
  'CRM Tool (Salesforce)',
  'Customer relationship management capabilities',
  'crm',
  true,
  true,
  'public'
) ON CONFLICT (id) DO NOTHING;

-- Insert CRM Tool Skills
INSERT INTO public.tool_skills (tool_id, name, description, parameters, required_auth) VALUES
('550e8400-e29b-41d4-a716-446655440002'::uuid, 'query_leads', 'Search and retrieve leads from CRM', 
 '[{"name": "search_criteria", "type": "object", "description": "Search criteria for leads", "required": false}]'::jsonb,
 '["crm_read"]'::jsonb),
('550e8400-e29b-41d4-a716-446655440002'::uuid, 'create_lead', 'Create a new lead in the CRM system', 
 '[{"name": "lead_data", "type": "object", "description": "Lead information", "required": true}]'::jsonb,
 '["crm_write"]'::jsonb),
('550e8400-e29b-41d4-a716-446655440002'::uuid, 'update_opportunity', 'Update an existing opportunity', 
 '[{"name": "opportunity_id", "type": "string", "description": "Opportunity ID", "required": true}, {"name": "update_data", "type": "object", "description": "Data to update", "required": true}]'::jsonb,
 '["crm_write"]'::jsonb),
('550e8400-e29b-41d4-a716-446655440002'::uuid, 'analyze_pipeline', 'Analyze sales pipeline and generate insights', 
 '[{"name": "pipeline_filters", "type": "object", "description": "Filters for pipeline analysis", "required": false}]'::jsonb,
 '["crm_read"]'::jsonb),
('550e8400-e29b-41d4-a716-446655440002'::uuid, 'find_contacts', 'Search for contacts in the CRM', 
 '[{"name": "search_criteria", "type": "object", "description": "Search criteria for contacts", "required": false}]'::jsonb,
 '["crm_read"]'::jsonb)
ON CONFLICT (tool_id, name) DO NOTHING;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.tools IS 'Tools available in the system for agent capabilities';
COMMENT ON TABLE public.tool_skills IS 'Skills/capabilities available within each tool';
COMMENT ON TABLE public.agent_tools IS 'Association between agents and tools they can use';

COMMENT ON COLUMN public.tools.is_system_tool IS 'Whether this is a system-provided tool (true) or user-created tool (false)';
COMMENT ON COLUMN public.tools.visibility IS 'Tool visibility: private (owner only), organization (all org members), team (specific teams), public (everyone)';
COMMENT ON COLUMN public.tool_skills.parameters IS 'JSON schema defining the parameters this skill accepts';
COMMENT ON COLUMN public.tool_skills.required_auth IS 'Array of required authentication scopes for this skill';
COMMENT ON COLUMN public.agent_tools.permissions IS 'Array of skill names this agent is allowed to use from this tool';

-- ============================================
-- SUMMARY
-- ============================================

DO $$ 
BEGIN
  RAISE NOTICE 'Tools table migration completed successfully!';
  RAISE NOTICE 'Created tables: tools, tool_skills, agent_tools';
  RAISE NOTICE 'Added RLS policies for multi-tenancy';
  RAISE NOTICE 'Inserted default system tools: Email Tool, CRM Tool';
  RAISE NOTICE 'Tools framework is now database-backed and multi-tenant ready';
END $$;
