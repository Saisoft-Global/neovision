-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Triggers viewable by workflow owners" ON workflow_triggers;
DROP POLICY IF EXISTS "Integrations viewable by workflow owners" ON workflow_integrations;

-- Create or update policies
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

-- Add additional policies for insert/update/delete
CREATE POLICY "Triggers can be created by workflow owners"
  ON workflow_triggers FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM workflows w 
    WHERE w.id = workflow_id 
    AND (w.created_by = auth.uid() OR auth.jwt() ->> 'role' = 'admin')
  ));

CREATE POLICY "Integrations can be created by workflow owners"
  ON workflow_integrations FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM workflows w 
    WHERE w.id = workflow_id 
    AND (w.created_by = auth.uid() OR auth.jwt() ->> 'role' = 'admin')
  ));

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_workflow_triggers_workflow_id 
  ON workflow_triggers(workflow_id);

CREATE INDEX IF NOT EXISTS idx_workflow_integrations_workflow_id 
  ON workflow_integrations(workflow_id);

CREATE INDEX IF NOT EXISTS idx_workflow_triggers_type 
  ON workflow_triggers(type);

CREATE INDEX IF NOT EXISTS idx_workflow_integrations_service 
  ON workflow_integrations(service);