/*
  # Fix Users Table RLS and Permissions

  1. Changes
    - Add policy for inserting new users
    - Modify sync function permissions
    - Add policy for system processes
  
  2. Security
    - Maintain existing RLS policies
    - Add system-level access for sync function
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "Admins can view all data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Admins can update all data" ON public.users;
DROP POLICY IF EXISTS "System can insert users" ON public.users;

-- Create RLS policies
CREATE POLICY "Users can view own data"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all data"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Users can update own data"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can update all data"
  ON public.users
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "System can insert users"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Revoke and regrant permissions
REVOKE ALL ON public.users FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;

-- Update sync function with proper permissions
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
END;
$$;