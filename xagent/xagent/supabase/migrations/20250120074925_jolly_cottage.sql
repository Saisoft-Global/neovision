-- Create documents table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  content text NOT NULL,
  embeddings numeric[] DEFAULT NULL,
  metadata jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_documents_status'
  ) THEN
    CREATE INDEX idx_documents_status ON public.documents(status);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_documents_embeddings'
  ) THEN
    CREATE INDEX idx_documents_embeddings ON public.documents USING gin(embeddings);
  END IF;
END $$;

-- Enable row level security (if not already enabled)
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated read access" ON public.documents;
DROP POLICY IF EXISTS "Allow authenticated write access" ON public.documents;

-- Create new policies
CREATE POLICY "Allow authenticated read access"
  ON public.documents
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated write access"
  ON public.documents
  FOR ALL
  TO authenticated
  USING (true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.documents TO authenticated;