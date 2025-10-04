-- Drop existing table and policies if they exist
DROP TABLE IF EXISTS documents CASCADE;

-- Create documents table
CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  doc_type text NOT NULL, -- Changed from 'type' to avoid reserved word
  embeddings numeric[] DEFAULT NULL,
  metadata jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Create indexes
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_doc_type ON documents(doc_type);
CREATE INDEX idx_documents_embeddings ON documents USING gin(embeddings);

-- Enable row level security
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
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