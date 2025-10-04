-- Enable vector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create document_chunks table for RAG
CREATE TABLE IF NOT EXISTS document_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  content text NOT NULL,
  embeddings vector(1536), -- OpenAI embeddings are 1536 dimensions
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create index on document_id
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks(document_id);

-- Create vector similarity search function
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  content text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    document_chunks.id,
    document_chunks.content,
    1 - (document_chunks.embeddings <=> query_embedding) as similarity
  FROM document_chunks
  WHERE 1 - (document_chunks.embeddings <=> query_embedding) > match_threshold
  ORDER BY document_chunks.embeddings <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Enable RLS
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow authenticated read access"
  ON document_chunks
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert access"
  ON document_chunks
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update access"
  ON document_chunks
  FOR UPDATE
  TO authenticated
  USING (true);