-- Drop existing policies
DROP POLICY IF EXISTS "System metrics viewable by admins" ON system_metrics;
DROP POLICY IF EXISTS "System metrics modifiable by admins" ON system_metrics;

-- Recreate policies with fixed permissions
CREATE POLICY "System metrics viewable by admins"
  ON system_metrics FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "System metrics modifiable by admins"
  ON system_metrics FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Ensure initial data exists
INSERT INTO system_metrics (active_users, storage_used, api_calls)
SELECT 0, 0, 0
WHERE NOT EXISTS (SELECT 1 FROM system_metrics)
ON CONFLICT DO NOTHING;