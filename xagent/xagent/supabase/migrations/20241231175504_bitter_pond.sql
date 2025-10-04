/*
  # RLS Policies Migration

  1. Add created_by column to documents
  2. Enable RLS on all tables
  3. Set up role-based access policies
*/

-- Add created_by column to documents if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE documents ADD COLUMN created_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_versions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public agents are viewable by everyone" ON agents;
DROP POLICY IF EXISTS "Agents can be created by managers and admins" ON agents;
DROP POLICY IF EXISTS "Agents can be updated by managers and admins" ON agents;
DROP POLICY IF EXISTS "Agents can be deleted by admins only" ON agents;
DROP POLICY IF EXISTS "Documents are viewable by authenticated users" ON documents;
DROP POLICY IF EXISTS "Documents can be created by authenticated users" ON documents;
DROP POLICY IF EXISTS "Documents can be updated by owners and admins" ON documents;
DROP POLICY IF EXISTS "Documents can be deleted by owners and admins" ON documents;
DROP POLICY IF EXISTS "Knowledge versions are viewable by authenticated users" ON knowledge_versions;
DROP POLICY IF EXISTS "Knowledge versions can be created by managers and admins" ON knowledge_versions;
DROP POLICY IF EXISTS "Knowledge versions can be updated by admins only" ON knowledge_versions;

-- Create policies for agents table
CREATE POLICY "Public agents are viewable by everyone"
  ON agents FOR SELECT
  USING (true);

CREATE POLICY "Agents can be created by managers and admins"
  ON agents FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt() ->> 'role' IN ('admin', 'manager')
  );

CREATE POLICY "Agents can be updated by managers and admins"
  ON agents FOR UPDATE
  TO authenticated
  USING (
    auth.jwt() ->> 'role' IN ('admin', 'manager')
  );

CREATE POLICY "Agents can be deleted by admins only"
  ON agents FOR DELETE
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Create policies for documents table
CREATE POLICY "Documents are viewable by authenticated users"
  ON documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Documents can be created by authenticated users"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Documents can be updated by owners and admins"
  ON documents FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by OR
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Documents can be deleted by owners and admins"
  ON documents FOR DELETE
  TO authenticated
  USING (
    auth.uid() = created_by OR
    auth.jwt() ->> 'role' = 'admin'
  );

-- Create policies for knowledge versions table
CREATE POLICY "Knowledge versions are viewable by authenticated users"
  ON knowledge_versions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Knowledge versions can be created by managers and admins"
  ON knowledge_versions FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt() ->> 'role' IN ('admin', 'manager')
  );

CREATE POLICY "Knowledge versions can be updated by admins only"
  ON knowledge_versions FOR UPDATE
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'admin'
  );