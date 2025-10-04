-- Drop existing table and policies
DROP TABLE IF EXISTS health_check CASCADE;

-- Create health check table
CREATE TABLE health_check (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  count integer DEFAULT 0,
  last_check timestamptz DEFAULT now()
);

-- Create unique index to ensure only one row exists
CREATE UNIQUE INDEX idx_health_check_single_row ON health_check ((true));

-- Enable RLS
ALTER TABLE health_check ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow authenticated read access"
  ON health_check
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated write access"
  ON health_check
  FOR ALL
  TO authenticated
  USING (true);

-- Create function to update last_check timestamp
CREATE OR REPLACE FUNCTION update_health_check_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_check = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for last_check updates
CREATE TRIGGER update_health_check_timestamp
  BEFORE UPDATE ON health_check
  FOR EACH ROW
  EXECUTE FUNCTION update_health_check_timestamp();

-- Insert initial record
INSERT INTO health_check (count)
VALUES (0)
ON CONFLICT DO NOTHING;

-- Ensure users table exists
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  email text NOT NULL,
  role text NOT NULL DEFAULT 'user',
  permissions jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy for users table
CREATE POLICY "Users can view own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR auth.jwt() ->> 'role' = 'admin');

-- Create function to sync auth users
CREATE OR REPLACE FUNCTION sync_auth_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, role, permissions)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    COALESCE(NEW.raw_user_meta_data->'permissions', '[]'::jsonb)
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    role = COALESCE(EXCLUDED.role, users.role),
    permissions = COALESCE(EXCLUDED.permissions, users.permissions),
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auth user sync
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
  role = COALESCE(EXCLUDED.role, users.role),
  permissions = COALESCE(EXCLUDED.permissions, users.permissions),
  updated_at = now();