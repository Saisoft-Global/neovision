-- Drop existing table and policies
DROP TABLE IF EXISTS health_check CASCADE;

-- Create health check table
CREATE TABLE health_check (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  count integer DEFAULT 0,
  last_check timestamptz DEFAULT now()
);

-- Create unique index to ensure single row
CREATE UNIQUE INDEX ON health_check ((true));

-- Enable RLS
ALTER TABLE health_check ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Allow authenticated read access"
  ON health_check
  FOR SELECT
  TO authenticated
  USING (true);

-- Insert initial record
INSERT INTO health_check (count)
SELECT 0
WHERE NOT EXISTS (SELECT 1 FROM health_check)
ON CONFLICT DO NOTHING;