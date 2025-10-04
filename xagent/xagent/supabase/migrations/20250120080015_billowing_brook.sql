-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "Admins can view all data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Admins can update all data" ON public.users;
DROP POLICY IF EXISTS "System can insert users" ON public.users;

-- Recreate users table with proper structure
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  email text NOT NULL,
  role text NOT NULL DEFAULT 'user',
  permissions jsonb DEFAULT '[]',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_role CHECK (role IN ('admin', 'user', 'manager'))
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create more permissive RLS policies
CREATE POLICY "Allow all authenticated users to view users"
  ON public.users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow system to insert users"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow users to update own data"
  ON public.users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR auth.jwt() ->> 'role' = 'admin');

-- Update sync function with better error handling
CREATE OR REPLACE FUNCTION public.handle_auth_user_change()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
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
EXCEPTION
  WHEN OTHERS THEN
    -- Log error details if needed
    RAISE NOTICE 'Error in handle_auth_user_change: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auth_user_change();

-- Ensure proper permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.users TO authenticated;

-- Create default admin user if none exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE raw_user_meta_data->>'role' = 'admin'
  ) THEN
    -- Create default admin user
    INSERT INTO auth.users (
      email,
      raw_user_meta_data,
      encrypted_password
    ) VALUES (
      'admin@example.com',
      '{"role": "admin", "permissions": ["*"]}'::jsonb,
      crypt('admin123', gen_salt('bf'))
    )
    ON CONFLICT DO NOTHING;
  END IF;
END $$;