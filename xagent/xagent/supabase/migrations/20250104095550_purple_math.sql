-- Create health check table
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

-- Insert initial record
INSERT INTO health_check (count)
VALUES (0)
ON CONFLICT DO NOTHING;