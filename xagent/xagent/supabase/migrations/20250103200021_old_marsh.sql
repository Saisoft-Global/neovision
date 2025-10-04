-- Drop and recreate system_metrics table
DROP TABLE IF EXISTS system_metrics;
CREATE TABLE system_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  active_users integer DEFAULT 0,
  storage_used numeric DEFAULT 0,
  api_calls bigint DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- Ensure single row constraint
CREATE UNIQUE INDEX system_metrics_singleton ON system_metrics ((true));

-- Insert initial metrics
INSERT INTO system_metrics (active_users, storage_used, api_calls)
VALUES (0, 0, 0)
ON CONFLICT DO NOTHING;

-- Drop and recreate users table
DROP TABLE IF EXISTS users;
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  email text NOT NULL,
  first_name text,
  last_name text,
  role text NOT NULL DEFAULT 'user',
  permissions jsonb DEFAULT '[]',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "System metrics viewable by admins"
  ON system_metrics FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Users viewable by admins"
  ON users FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Create function to sync auth users
CREATE OR REPLACE FUNCTION sync_auth_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO users (id, email, role, permissions)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    COALESCE(NEW.raw_user_meta_data->'permissions', '[]'::jsonb)
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    permissions = EXCLUDED.permissions,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS sync_auth_user_trigger ON auth.users;
CREATE TRIGGER sync_auth_user_trigger
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_auth_user();

-- Sync existing users
INSERT INTO users (id, email, role, permissions)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'role', 'user'),
  COALESCE(raw_user_meta_data->'permissions', '[]'::jsonb)
FROM auth.users
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  updated_at = now();