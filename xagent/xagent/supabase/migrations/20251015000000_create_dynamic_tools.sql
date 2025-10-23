-- Create table for dynamic tools
CREATE TABLE IF NOT EXISTS dynamic_tools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('integration', 'communication', 'data', 'automation', 'custom')),
  provider TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0.0',
  configuration JSONB NOT NULL, -- Full tool configuration
  is_active BOOLEAN DEFAULT true,
  
  -- Multi-tenancy
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(id, organization_id)
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_dynamic_tools_org ON dynamic_tools(organization_id);
CREATE INDEX IF NOT EXISTS idx_dynamic_tools_active ON dynamic_tools(is_active);
CREATE INDEX IF NOT EXISTS idx_dynamic_tools_category ON dynamic_tools(category);

-- RLS Policies
ALTER TABLE dynamic_tools ENABLE ROW LEVEL SECURITY;

-- Users can view tools in their organization
CREATE POLICY "Users can view organization tools"
  ON dynamic_tools
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Users can create tools in their organization (Admin+)
CREATE POLICY "Admins can create tools"
  ON dynamic_tools
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
        AND role IN ('owner', 'admin', 'manager')
    )
  );

-- Users can update tools they created or are admin
CREATE POLICY "Admins can update tools"
  ON dynamic_tools
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
        AND role IN ('owner', 'admin', 'manager')
    )
  );

-- Users can delete tools they created or are admin
CREATE POLICY "Admins can delete tools"
  ON dynamic_tools
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
        AND role IN ('owner', 'admin')
    )
  );

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_dynamic_tools_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER update_dynamic_tools_timestamp
  BEFORE UPDATE ON dynamic_tools
  FOR EACH ROW
  EXECUTE FUNCTION update_dynamic_tools_updated_at();

-- Add comments
COMMENT ON TABLE dynamic_tools IS 'User-defined tools loaded from JSON configurations';
COMMENT ON COLUMN dynamic_tools.configuration IS 'Full JSON configuration for the tool including skills, auth, and API details';


