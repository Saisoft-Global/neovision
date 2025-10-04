-- Create workflow triggers table
CREATE TABLE workflow_triggers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid REFERENCES workflows(id) ON DELETE CASCADE,
  type text NOT NULL, -- webhook, schedule, event
  config jsonb NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create workflow integrations table
CREATE TABLE workflow_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid REFERENCES workflows(id) ON DELETE CASCADE,
  service text NOT NULL, -- e.g., 'salesforce', 'sap', 'http'
  config jsonb NOT NULL,
  credentials jsonb,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE workflow_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_integrations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Triggers viewable by workflow owners"
  ON workflow_triggers FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM workflows w 
    WHERE w.id = workflow_id 
    AND (w.created_by = auth.uid() OR auth.jwt() ->> 'role' = 'admin')
  ));

CREATE POLICY "Integrations viewable by workflow owners"
  ON workflow_integrations FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM workflows w 
    WHERE w.id = workflow_id 
    AND (w.created_by = auth.uid() OR auth.jwt() ->> 'role' = 'admin')
  ));