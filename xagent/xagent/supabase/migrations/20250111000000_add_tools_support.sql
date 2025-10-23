-- Add tools support to agent system
-- This migration adds tables for tools, tool attachments, and updates agents table

-- Add tools column to agents table (stores array of attached tool IDs)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'agents' AND column_name = 'tools'
  ) THEN
    ALTER TABLE public.agents ADD COLUMN tools jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Create tools registry table
CREATE TABLE IF NOT EXISTS public.tools (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  type text NOT NULL, -- 'email', 'crm', 'calendar', 'database', 'custom', etc.
  config jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create tool skills table (stores individual skills within tools)
CREATE TABLE IF NOT EXISTS public.tool_skills (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tool_id text REFERENCES public.tools(id) ON DELETE CASCADE,
  skill_name text NOT NULL,
  description text,
  parameters jsonb DEFAULT '[]', -- Array of parameter definitions
  required_auth jsonb DEFAULT '[]', -- Array of required permissions
  created_at timestamptz DEFAULT now(),
  UNIQUE(tool_id, skill_name)
);

-- Create tool attachments table (tracks which agents have which tools)
CREATE TABLE IF NOT EXISTS public.agent_tool_attachments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id uuid REFERENCES public.agents(id) ON DELETE CASCADE,
  tool_id text REFERENCES public.tools(id) ON DELETE CASCADE,
  attached_at timestamptz DEFAULT now(),
  permissions jsonb DEFAULT '[]',
  UNIQUE(agent_id, tool_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tools_type ON public.tools(type);
CREATE INDEX IF NOT EXISTS idx_tools_is_active ON public.tools(is_active);
CREATE INDEX IF NOT EXISTS idx_tool_skills_tool_id ON public.tool_skills(tool_id);
CREATE INDEX IF NOT EXISTS idx_tool_skills_skill_name ON public.tool_skills(skill_name);
CREATE INDEX IF NOT EXISTS idx_agent_tool_attachments_agent_id ON public.agent_tool_attachments(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_tool_attachments_tool_id ON public.agent_tool_attachments(tool_id);

-- Enable RLS for new tables
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_tool_attachments ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for tools (read-only for authenticated users)
CREATE POLICY "Allow authenticated read access to tools" ON public.tools
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Allow authenticated read access to tool_skills" ON public.tool_skills
FOR SELECT TO authenticated
USING (true);

-- Create RLS Policies for agent_tool_attachments
CREATE POLICY "Allow authenticated read access to agent_tool_attachments" ON public.agent_tool_attachments
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Allow authenticated insert access to agent_tool_attachments" ON public.agent_tool_attachments
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated delete access to agent_tool_attachments" ON public.agent_tool_attachments
FOR DELETE TO authenticated
USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for tools table
DROP TRIGGER IF EXISTS update_tools_updated_at ON public.tools;
CREATE TRIGGER update_tools_updated_at
  BEFORE UPDATE ON public.tools
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default tools (Email and CRM)
INSERT INTO public.tools (id, name, description, type, config, is_active)
VALUES 
  ('email-tool', 'Email Tool', 'Comprehensive email management and analysis capabilities', 'email', '{"authType": "none"}'::jsonb, true),
  ('crm-tool', 'CRM Tool (Salesforce)', 'Salesforce-compatible CRM integration for leads, opportunities, and pipeline management', 'crm', '{"authType": "oauth", "endpoint": "https://your-instance.salesforce.com"}'::jsonb, true)
ON CONFLICT (id) DO UPDATE
SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  type = EXCLUDED.type,
  config = EXCLUDED.config,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Insert skills for Email Tool
INSERT INTO public.tool_skills (tool_id, skill_name, description, parameters)
VALUES 
  ('email-tool', 'parse_email', 'Extract structured information from an email (sender, subject, body, date, etc.)', '[{"name":"emailContent","type":"string","description":"Raw email content or email object","required":true}]'::jsonb),
  ('email-tool', 'summarize_email', 'Create a concise summary of email content with key points', '[{"name":"emailContent","type":"string","description":"Email content to summarize","required":true},{"name":"maxLength","type":"number","description":"Maximum summary length in words","required":false,"default":100}]'::jsonb),
  ('email-tool', 'identify_critical_email', 'Analyze email to determine if it requires urgent attention', '[{"name":"emailContent","type":"string","description":"Email content to analyze","required":true},{"name":"userContext","type":"object","description":"User context (role, priorities, etc.)","required":false}]'::jsonb),
  ('email-tool', 'draft_reply', 'Generate a professional email reply based on the original email', '[{"name":"emailContent","type":"string","description":"Original email to reply to","required":true},{"name":"replyIntent","type":"string","description":"What you want to convey","required":true},{"name":"tone","type":"string","description":"Tone of reply (formal/casual/friendly)","required":false,"default":"professional"}]'::jsonb),
  ('email-tool', 'classify_email', 'Categorize email into predefined categories', '[{"name":"emailContent","type":"string","description":"Email content to classify","required":true},{"name":"categories","type":"array","description":"Custom categories to classify into","required":false}]'::jsonb)
ON CONFLICT (tool_id, skill_name) DO UPDATE
SET 
  description = EXCLUDED.description,
  parameters = EXCLUDED.parameters;

-- Insert skills for CRM Tool
INSERT INTO public.tool_skills (tool_id, skill_name, description, parameters)
VALUES 
  ('crm-tool', 'query_leads', 'Search and retrieve leads from CRM based on criteria', '[{"name":"criteria","type":"object","description":"Search criteria","required":true},{"name":"limit","type":"number","description":"Maximum number of results","required":false,"default":10}]'::jsonb),
  ('crm-tool', 'create_lead', 'Create a new lead in the CRM system', '[{"name":"leadData","type":"object","description":"Lead information (firstName, lastName, company, email, etc.)","required":true}]'::jsonb),
  ('crm-tool', 'update_opportunity', 'Update an existing opportunity in the CRM', '[{"name":"opportunityId","type":"string","description":"CRM Opportunity ID","required":true},{"name":"updates","type":"object","description":"Fields to update","required":true}]'::jsonb),
  ('crm-tool', 'analyze_pipeline', 'Analyze sales pipeline and generate insights', '[{"name":"timeframe","type":"string","description":"Timeframe for analysis","required":false,"default":"this_quarter"},{"name":"includeForecasting","type":"boolean","description":"Include revenue forecasting","required":false,"default":true}]'::jsonb),
  ('crm-tool', 'find_contacts', 'Search for contacts in the CRM', '[{"name":"query","type":"string","description":"Search query","required":true},{"name":"limit","type":"number","description":"Maximum number of results","required":false,"default":10}]'::jsonb)
ON CONFLICT (tool_id, skill_name) DO UPDATE
SET 
  description = EXCLUDED.description,
  parameters = EXCLUDED.parameters;

-- Add comment to document the migration
COMMENT ON TABLE public.tools IS 'Registry of available tools for agents';
COMMENT ON TABLE public.tool_skills IS 'Individual skills provided by each tool';
COMMENT ON TABLE public.agent_tool_attachments IS 'Tracks which tools are attached to which agents';

