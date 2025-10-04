-- Drop existing policies and triggers
DROP POLICY IF EXISTS "Allow all authenticated users to view users" ON public.users;
DROP POLICY IF EXISTS "Allow system to insert users" ON public.users;
DROP POLICY IF EXISTS "Allow users to update own data" ON public.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_auth_user_change();

-- Recreate users table with proper structure
DROP TABLE IF EXISTS public.users CASCADE;
CREATE TABLE public.users (
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

-- Create simplified RLS policies
CREATE POLICY "Public users are viewable by everyone" 
  ON public.users FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert"
  ON public.users FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own record"
  ON public.users FOR UPDATE
  USING (auth.uid() = id OR auth.role() = 'authenticated');

-- Create improved sync function
CREATE OR REPLACE FUNCTION public.sync_user_data()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
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
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail
    RAISE WARNING 'Error in sync_user_data: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create new trigger
CREATE TRIGGER sync_user_data
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_data();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.users TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Ensure default admin exists
DO $$
DECLARE
  admin_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE raw_user_meta_data->>'role' = 'admin'
  ) INTO admin_exists;

  IF NOT admin_exists THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      uuid_generate_v4(),
      'authenticated',
      'authenticated',
      'admin@example.com',
      crypt('admin123', gen_salt('bf')),
      now(),
      '{"role": "admin", "permissions": ["*"]}'::jsonb,
      now(),
      now()
    );
  END IF;
END $$;