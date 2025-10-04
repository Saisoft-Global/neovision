-- Drop existing policies if they exist
DROP POLICY IF EXISTS "System metrics viewable by admins" ON system_metrics;
DROP POLICY IF EXISTS "System metrics modifiable by admins" ON system_metrics;

-- Drop and recreate system_metrics table
DROP TABLE IF EXISTS system_metrics;
CREATE TABLE system_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  active_users integer DEFAULT 0,
  storage_used numeric DEFAULT 0,
  api_calls bigint DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- Create unique constraint to ensure single row
CREATE UNIQUE INDEX system_metrics_singleton ON system_metrics ((true));

-- Insert initial row if none exists
INSERT INTO system_metrics (active_users, storage_used, api_calls)
SELECT 0, 0, 0
WHERE NOT EXISTS (SELECT 1 FROM system_metrics)
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;

-- Create new policies
CREATE POLICY "System metrics viewable by admins"
  ON system_metrics FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "System metrics modifiable by admins"
  ON system_metrics FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_system_metrics_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_system_metrics_timestamp
  BEFORE UPDATE ON system_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_system_metrics_timestamp();