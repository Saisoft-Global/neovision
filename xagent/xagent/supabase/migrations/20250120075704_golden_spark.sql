/*
  # Complete Database Setup Fix

  1. Changes
    - Add missing policies for users table
    - Add system-level policies for auth sync
    - Fix permissions for all tables
    - Add missing indexes
  
  2. Security
    - Proper RLS policies
    - Secure function permissions
    - Proper role-based access
*/

-- Create extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "Admins can view all data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Admins can update all data" ON public.users;
DROP POLICY IF EXISTS "System can insert users" ON public.users;

-- Create or replace users table
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  email text NOT NULL,
  role text NOT NULL DEFAULT 'user',
  permissions jsonb DEFAULT '[]',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create comprehensive RLS policies
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

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
    metadata = COALESCE(EXCLUDED.metadata, users.metadata),
    updated_at = now();
  RETURN NEW;
END;
$$;

-- Create or replace trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auth_user_change();

-- Grant proper permissions
REVOKE ALL ON public.users FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;

-- Ensure first user is admin
DO $$
BEGIN
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_build_object(
    'role', 'admin',
    'permissions', ARRAY['*']
  )
  WHERE id = (
    SELECT id 
    FROM auth.users 
    ORDER BY created_at ASC 
    LIMIT 1
  )
  AND (raw_user_meta_data->>'role') IS NULL;
END $$;