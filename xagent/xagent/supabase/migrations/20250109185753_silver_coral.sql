-- Drop existing tables
DROP TABLE IF EXISTS health_check CASCADE;

-- Create health check table
CREATE TABLE health_check (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  count integer DEFAULT 0,
  last_check timestamptz DEFAULT now()
);

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
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Insert initial record
INSERT INTO health_check (count)
VALUES (0)
ON CONFLICT DO NOTHING;

-- Ensure auth schema exists
CREATE SCHEMA IF NOT EXISTS auth;

-- Create auth user trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user() 
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
    role = EXCLUDED.role,
    permissions = EXCLUDED.permissions,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();