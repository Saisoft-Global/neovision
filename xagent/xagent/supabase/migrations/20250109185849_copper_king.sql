-- Drop existing table and policies
DROP TABLE IF EXISTS health_check CASCADE;

-- Create health check table
CREATE TABLE health_check (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  count integer DEFAULT 0,
  last_check timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE health_check ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow authenticated read access"
  ON health_check
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated write access"
  ON health_check
  FOR ALL
  TO authenticated
  USING (true);

-- Insert initial record
INSERT INTO health_check (count)
VALUES (0)
ON CONFLICT DO NOTHING;

-- Create function to update last_check timestamp
CREATE OR REPLACE FUNCTION update_health_check_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_check = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for last_check updates
CREATE TRIGGER update_health_check_timestamp
  BEFORE UPDATE ON health_check
  FOR EACH ROW
  EXECUTE FUNCTION update_health_check_timestamp();