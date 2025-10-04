-- Create knowledge versions table
CREATE TABLE IF NOT EXISTS public.knowledge_versions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  version integer NOT NULL,
  nodes jsonb NOT NULL,
  relations jsonb NOT NULL,
  metadata jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'inactive',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_knowledge_versions_version'
  ) THEN
    CREATE INDEX idx_knowledge_versions_version ON public.knowledge_versions(version);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_knowledge_versions_status'
  ) THEN
    CREATE INDEX idx_knowledge_versions_status ON public.knowledge_versions(status);
  END IF;
END $$;

-- Enable row level security
ALTER TABLE public.knowledge_versions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated read access" ON public.knowledge_versions;
DROP POLICY IF EXISTS "Allow authenticated write access" ON public.knowledge_versions;

-- Create policies
CREATE POLICY "Allow authenticated read access"
  ON public.knowledge_versions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated write access"
  ON public.knowledge_versions
  FOR ALL
  TO authenticated
  USING (true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.knowledge_versions TO authenticated;