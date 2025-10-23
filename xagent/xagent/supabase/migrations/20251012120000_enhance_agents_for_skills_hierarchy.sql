-- ============================================
-- Enhance agents table for Skills → Capabilities → Tools → Functions hierarchy
-- ============================================

-- Add new columns to agents table for enhanced configuration
DO $$ 
BEGIN
  -- Add llm_overrides column (for task-specific LLM configs)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'agents' AND column_name = 'llm_overrides'
  ) THEN
    ALTER TABLE agents ADD COLUMN llm_overrides jsonb DEFAULT '{}'::jsonb;
  END IF;

  -- Add fallback_llm column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'agents' AND column_name = 'fallback_llm'
  ) THEN
    ALTER TABLE agents ADD COLUMN fallback_llm jsonb;
  END IF;

  -- Add tools column (attached tools)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'agents' AND column_name = 'tools'
  ) THEN
    ALTER TABLE agents ADD COLUMN tools jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- ============================================
-- Create tools registry table
-- ============================================

CREATE TABLE IF NOT EXISTS agent_tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  type text NOT NULL CHECK (type IN ('mcp', 'integration', 'local', 'workflow')),
  provider text,
  functions jsonb NOT NULL DEFAULT '[]'::jsonb,
  config jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(name)
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_agent_tools_type ON agent_tools(type);
CREATE INDEX IF NOT EXISTS idx_agent_tools_active ON agent_tools(is_active);

-- ============================================
-- Create agent_tool_mappings junction table
-- ============================================

CREATE TABLE IF NOT EXISTS agent_tool_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  tool_id uuid NOT NULL REFERENCES agent_tools(id) ON DELETE CASCADE,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(agent_id, tool_id)
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_agent_tool_mappings_agent ON agent_tool_mappings(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_tool_mappings_tool ON agent_tool_mappings(tool_id);

-- ============================================
-- Insert default tools
-- ============================================

INSERT INTO agent_tools (name, description, type, provider, functions) VALUES
  (
    'Email Tool',
    'Email processing and automation',
    'local',
    'internal',
    '[
      {"id": "parse_email", "name": "parse_email", "description": "Extract structured information from email", "type": "local"},
      {"id": "send_email", "name": "send_email", "description": "Send email", "type": "local"},
      {"id": "summarize_email", "name": "summarize_email", "description": "Summarize email content", "type": "local"}
    ]'::jsonb
  ),
  (
    'CRM Tool',
    'Salesforce CRM integration',
    'integration',
    'salesforce',
    '[
      {"id": "create_lead", "name": "create_lead", "description": "Create new lead in Salesforce", "type": "api"},
      {"id": "update_opportunity", "name": "update_opportunity", "description": "Update opportunity", "type": "api"},
      {"id": "query_leads", "name": "query_leads", "description": "Query leads from CRM", "type": "api"}
    ]'::jsonb
  ),
  (
    'OCR Tool',
    'Document OCR and text extraction',
    'local',
    'internal',
    '[
      {"id": "extract_text", "name": "extract_text", "description": "Extract text from image/PDF", "type": "local"},
      {"id": "process_document", "name": "process_document", "description": "Process and analyze document", "type": "local"}
    ]'::jsonb
  )
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- Enable RLS
-- ============================================

ALTER TABLE agent_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tool_mappings ENABLE ROW LEVEL SECURITY;

-- Policies for agent_tools
DROP POLICY IF EXISTS "Users can view tools" ON agent_tools;
CREATE POLICY "Users can view tools"
  ON agent_tools FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can manage their tools" ON agent_tools;
CREATE POLICY "Users can manage their tools"
  ON agent_tools FOR ALL
  TO authenticated
  USING (created_by = auth.uid() OR created_by IS NULL)
  WITH CHECK (created_by = auth.uid() OR created_by IS NULL);

-- Policies for agent_tool_mappings
DROP POLICY IF EXISTS "Users can view tool mappings" ON agent_tool_mappings;
CREATE POLICY "Users can view tool mappings"
  ON agent_tool_mappings FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can manage tool mappings" ON agent_tool_mappings;
CREATE POLICY "Users can manage tool mappings"
  ON agent_tool_mappings FOR ALL
  TO authenticated
  USING (true);

-- Grant permissions
GRANT ALL ON agent_tools TO authenticated;
GRANT ALL ON agent_tool_mappings TO authenticated;

-- ============================================
-- Update agents table config structure
-- ============================================

-- Add helpful comment
COMMENT ON COLUMN agents.llm_overrides IS 'Task-specific LLM configurations (research, writing, code, etc.)';
COMMENT ON COLUMN agents.fallback_llm IS 'Fallback LLM if primary fails';
COMMENT ON COLUMN agents.tools IS 'Array of attached tool IDs';

-- ============================================
-- Create helper function to get agent tools
-- ============================================

CREATE OR REPLACE FUNCTION get_agent_tools(p_agent_id uuid)
RETURNS TABLE (
  tool_id uuid,
  tool_name text,
  tool_type text,
  tool_provider text,
  functions jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id as tool_id,
    t.name as tool_name,
    t.type as tool_type,
    t.provider as tool_provider,
    t.functions
  FROM agent_tools t
  INNER JOIN agent_tool_mappings m ON t.id = m.tool_id
  WHERE m.agent_id = p_agent_id
    AND t.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Verification
-- ============================================

SELECT 'Enhanced agents table successfully' as status
WHERE EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_name = 'agents' AND column_name = 'llm_overrides'
);

SELECT 'Tools tables created successfully' as status
WHERE EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'agent_tools'
);

