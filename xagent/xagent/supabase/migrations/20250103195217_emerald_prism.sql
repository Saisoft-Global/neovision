-- Create admin role if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE raw_user_meta_data->>'role' = 'admin'
  ) THEN
    -- Update the first user to be an admin with all permissions in a single update
    UPDATE auth.users
    SET raw_user_meta_data = jsonb_build_object(
      'role', 'admin',
      'permissions', ARRAY['*']
    )
    WHERE id = (SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1);
  END IF;
END $$;

-- Create function to ensure admin permissions
CREATE OR REPLACE FUNCTION ensure_admin_permissions()
RETURNS trigger AS $$
BEGIN
  IF NEW.raw_user_meta_data->>'role' = 'admin' THEN
    NEW.raw_user_meta_data = jsonb_set(
      NEW.raw_user_meta_data,
      '{permissions}',
      '["*"]'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set admin permissions
DROP TRIGGER IF EXISTS ensure_admin_permissions_trigger ON auth.users;
CREATE TRIGGER ensure_admin_permissions_trigger
  BEFORE INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION ensure_admin_permissions();