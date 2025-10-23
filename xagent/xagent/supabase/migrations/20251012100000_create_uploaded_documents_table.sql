-- ============================================
-- Create uploaded_documents table for document-driven onboarding
-- ============================================

-- Create uploaded_documents table
CREATE TABLE IF NOT EXISTS uploaded_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  document_type text NOT NULL CHECK (document_type IN (
    'resume',
    'government_id',
    'tax_form',
    'i9_form',
    'direct_deposit',
    'certificate',
    'employment_letter',
    'other'
  )),
  processing_status text NOT NULL DEFAULT 'pending' CHECK (processing_status IN (
    'pending',
    'processing',
    'completed',
    'failed'
  )),
  extracted_data jsonb,
  error_message text,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_uploaded_documents_user_id 
ON uploaded_documents(user_id);

-- Create index on processing_status for filtering
CREATE INDEX IF NOT EXISTS idx_uploaded_documents_status 
ON uploaded_documents(processing_status);

-- Create index on document_type
CREATE INDEX IF NOT EXISTS idx_uploaded_documents_type 
ON uploaded_documents(document_type);

-- Enable Row Level Security
ALTER TABLE uploaded_documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own documents" ON uploaded_documents;
DROP POLICY IF EXISTS "Users can upload their own documents" ON uploaded_documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON uploaded_documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON uploaded_documents;

-- Create RLS policies
CREATE POLICY "Users can view their own documents"
  ON uploaded_documents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upload their own documents"
  ON uploaded_documents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
  ON uploaded_documents FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
  ON uploaded_documents FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON uploaded_documents TO authenticated;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_uploaded_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_uploaded_documents_updated_at ON uploaded_documents;
CREATE TRIGGER update_uploaded_documents_updated_at
  BEFORE UPDATE ON uploaded_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_uploaded_documents_updated_at();

-- ============================================
-- Create storage bucket for onboarding documents
-- ============================================

-- Insert storage bucket (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('onboarding-documents', 'onboarding-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for onboarding-documents bucket
DROP POLICY IF EXISTS "Users can upload their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own documents" ON storage.objects;

CREATE POLICY "Users can upload their own documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'onboarding-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view their own documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'onboarding-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'onboarding-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================
-- Add helpful functions
-- ============================================

-- Function to get document processing stats
CREATE OR REPLACE FUNCTION get_document_processing_stats(p_user_id uuid)
RETURNS TABLE (
  total_documents bigint,
  pending bigint,
  processing bigint,
  completed bigint,
  failed bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint as total_documents,
    COUNT(*) FILTER (WHERE processing_status = 'pending')::bigint as pending,
    COUNT(*) FILTER (WHERE processing_status = 'processing')::bigint as processing,
    COUNT(*) FILTER (WHERE processing_status = 'completed')::bigint as completed,
    COUNT(*) FILTER (WHERE processing_status = 'failed')::bigint as failed
  FROM uploaded_documents
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Verification
-- ============================================

-- Verify table creation
SELECT 'Table created successfully' as status
WHERE EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'uploaded_documents'
);

-- Show table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'uploaded_documents'
ORDER BY ordinal_position;

