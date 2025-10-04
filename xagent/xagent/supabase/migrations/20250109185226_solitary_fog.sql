-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow authenticated read access" ON health_check;

-- Create health check table if it doesn't exist
CREATE TABLE IF NOT EXISTS health_check (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  count integer DEFAULT 0,
  last_check timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE health_check ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Allow authenticated read access"
  ON health_check
  FOR SELECT
  TO authenticated
  USING (true);

-- Insert initial record if none exists
INSERT INTO health_check (count)
SELECT 0
WHERE NOT EXISTS (SELECT 1 FROM health_check)
ON CONFLICT DO NOTHING;