-- IDP Extension for Existing Supabase Project
-- Add these tables to your existing schema

-- Organizations table (for multi-tenant support)
CREATE TABLE public.organizations (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    slug text UNIQUE NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT organizations_pkey PRIMARY KEY (id)
);

-- Update profiles table to include organization
ALTER TABLE public.profiles 
ADD COLUMN organization_id uuid REFERENCES public.organizations(id),
ADD COLUMN role text DEFAULT 'user'::text,
ADD COLUMN status text DEFAULT 'active'::text;

-- API Keys table (for API authentication)
CREATE TABLE public.api_keys (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    organization_id uuid NOT NULL,
    name text NOT NULL,
    key_hash text UNIQUE NOT NULL,
    permissions jsonb DEFAULT '{}'::jsonb,
    expires_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT api_keys_pkey PRIMARY KEY (id),
    CONSTRAINT api_keys_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);

-- Extend documents table for IDP features
ALTER TABLE public.documents 
ADD COLUMN organization_id uuid REFERENCES public.organizations(id),
ADD COLUMN file_path text,
ADD COLUMN file_type text,
ADD COLUMN file_size bigint,
ADD COLUMN status text DEFAULT 'processing'::text,
ADD COLUMN extracted_fields jsonb DEFAULT '{}'::jsonb,
ADD COLUMN confidence_score decimal(3,2),
ADD COLUMN processing_method text,
ADD COLUMN ocr_text text,
ADD COLUMN bounding_boxes jsonb DEFAULT '[]'::jsonb,
ADD COLUMN tables jsonb DEFAULT '[]'::jsonb,
ADD COLUMN headers jsonb DEFAULT '[]'::jsonb,
ADD COLUMN footers jsonb DEFAULT '[]'::jsonb;

-- Processing Jobs table (for background processing)
CREATE TABLE public.processing_jobs (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    organization_id uuid NOT NULL,
    document_id uuid NOT NULL,
    status text DEFAULT 'pending'::text,
    priority integer DEFAULT 0,
    retry_count integer DEFAULT 0,
    error_message text,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    CONSTRAINT processing_jobs_pkey PRIMARY KEY (id),
    CONSTRAINT processing_jobs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
    CONSTRAINT processing_jobs_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id)
);

-- Document Processing History (for audit trail)
CREATE TABLE public.document_processing_history (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    document_id uuid NOT NULL,
    processing_method text NOT NULL,
    input_data jsonb DEFAULT '{}'::jsonb,
    output_data jsonb DEFAULT '{}'::jsonb,
    processing_time_ms integer,
    confidence_score decimal(3,2),
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT document_processing_history_pkey PRIMARY KEY (id),
    CONSTRAINT document_processing_history_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id)
);

-- Field Extraction Templates (for custom field extraction)
CREATE TABLE public.extraction_templates (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    organization_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    document_type text NOT NULL,
    field_definitions jsonb NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT extraction_templates_pkey PRIMARY KEY (id),
    CONSTRAINT extraction_templates_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);

-- User Feedback (for human-in-the-loop)
CREATE TABLE public.user_feedback (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    document_id uuid NOT NULL,
    user_id uuid NOT NULL,
    field_name text NOT NULL,
    extracted_value text,
    corrected_value text,
    feedback_type text NOT NULL, -- 'correction', 'validation', 'annotation'
    confidence_score decimal(3,2),
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT user_feedback_pkey PRIMARY KEY (id),
    CONSTRAINT user_feedback_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id),
    CONSTRAINT user_feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Row Level Security (RLS) Policies
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_processing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extraction_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- Policies for organizations
CREATE POLICY "Users can view their organization" ON public.organizations
    FOR SELECT USING (
        id IN (
            SELECT organization_id FROM public.profiles 
            WHERE id = auth.uid()
        )
    );

-- Policies for API keys
CREATE POLICY "Users can view organization API keys" ON public.api_keys
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM public.profiles 
            WHERE id = auth.uid()
        )
    );

-- Policies for processing jobs
CREATE POLICY "Users can view organization processing jobs" ON public.processing_jobs
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM public.profiles 
            WHERE id = auth.uid()
        )
    );

-- Policies for extraction templates
CREATE POLICY "Users can view organization templates" ON public.extraction_templates
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM public.profiles 
            WHERE id = auth.uid()
        )
    );

-- Policies for user feedback
CREATE POLICY "Users can view their feedback" ON public.user_feedback
    FOR SELECT USING (user_id = auth.uid());

-- Update existing documents policies
DROP POLICY IF EXISTS "Users can view their documents" ON public.documents;
CREATE POLICY "Users can view organization documents" ON public.documents
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM public.profiles 
            WHERE id = auth.uid()
        ) OR user_id = auth.uid()
    );

-- Indexes for performance
CREATE INDEX idx_profiles_organization_id ON public.profiles(organization_id);
CREATE INDEX idx_documents_organization_id ON public.documents(organization_id);
CREATE INDEX idx_documents_status ON public.documents(status);
CREATE INDEX idx_processing_jobs_status ON public.processing_jobs(status);
CREATE INDEX idx_processing_jobs_organization_id ON public.processing_jobs(organization_id);
CREATE INDEX idx_user_feedback_document_id ON public.user_feedback(document_id);
CREATE INDEX idx_extraction_templates_organization_id ON public.extraction_templates(organization_id);
