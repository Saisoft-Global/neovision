/*
  # Add Workflows Table

  1. New Tables
    - `workflows`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `nodes` (jsonb)
      - `connections` (jsonb)
      - `created_by` (uuid, references auth.users)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create workflows table
CREATE TABLE IF NOT EXISTS workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  nodes jsonb NOT NULL DEFAULT '[]',
  connections jsonb NOT NULL DEFAULT '[]',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_workflows_created_by ON workflows(created_by);
CREATE INDEX idx_workflows_created_at ON workflows(created_at);

-- Enable row level security
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Workflows are viewable by authenticated users"
  ON workflows FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Workflows can be created by authenticated users"
  ON workflows FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Workflows can be updated by owners and admins"
  ON workflows FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by OR
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Workflows can be deleted by owners and admins"
  ON workflows FOR DELETE
  TO authenticated
  USING (
    auth.uid() = created_by OR
    auth.jwt() ->> 'role' = 'admin'
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_workflows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_workflows_updated_at
  BEFORE UPDATE ON workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_workflows_updated_at();