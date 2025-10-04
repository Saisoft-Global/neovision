-- Create admin settings table
CREATE TABLE IF NOT EXISTS admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create system metrics table
CREATE TABLE IF NOT EXISTS system_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  active_users integer DEFAULT 0,
  storage_used numeric DEFAULT 0,
  api_calls integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admin settings are viewable by admins only"
  ON admin_settings FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin settings can be modified by admins only"
  ON admin_settings FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "System metrics are viewable by admins only"
  ON system_metrics FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "System metrics can be modified by admins only"
  ON system_metrics FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Create indexes
CREATE INDEX idx_admin_settings_key ON admin_settings(key);
CREATE INDEX idx_system_metrics_created_at ON system_metrics(created_at);

-- Insert default settings
INSERT INTO admin_settings (key, value) VALUES
  ('enableUserRegistration', 'true'),
  ('maxFileSize', '10'),
  ('debugMode', 'false'),
  ('maintenanceMode', 'false')
ON CONFLICT (key) DO NOTHING;

-- Insert initial metrics
INSERT INTO system_metrics (active_users, storage_used, api_calls)
VALUES (0, 0, 0)
ON CONFLICT DO NOTHING;