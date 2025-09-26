-- Complete Fresh Supabase Project Setup for NeoCaptured IDP
-- Creates all tables from scratch for a new project

-- 1. Organizations table (for multi-tenant support)
CREATE TABLE public.organizations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text UNIQUE NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT organizations_pkey PRIMARY KEY (id)
);

-- 2. Create profiles table (extends auth.users)
CREATE TABLE public.profiles (
    id uuid NOT NULL,
    username text UNIQUE,
    avatar_url text,
    organization_id uuid REFERENCES public.organizations(id),
    role text DEFAULT 'user'::text,
    status text DEFAULT 'active'::text,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT profiles_pkey PRIMARY KEY (id),
    CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

-- 3. Create documents table (complete with IDP fields)
CREATE TABLE public.documents (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    title text NOT NULL,
    content text,
    source text,
    tags text[] DEFAULT '{}'::text[],
    is_public boolean DEFAULT false,
    organization_id uuid REFERENCES public.organizations(id),
    file_path text,
    file_type text,
    file_size bigint,
    status text DEFAULT 'processing'::text,
    extracted_fields jsonb DEFAULT '{}'::jsonb,
    confidence_score decimal(3,2),
    processing_method text,
    ocr_text text,
    bounding_boxes jsonb DEFAULT '[]'::jsonb,
    tables jsonb DEFAULT '[]'::jsonb,
    headers jsonb DEFAULT '[]'::jsonb,
    footers jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT documents_pkey PRIMARY KEY (id),
    CONSTRAINT documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- 4. Create document_shares table
CREATE TABLE public.document_shares (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    document_id uuid NOT NULL,
    shared_by uuid NOT NULL,
    shared_with uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT document_shares_pkey PRIMARY KEY (id),
    CONSTRAINT document_shares_shared_with_fkey FOREIGN KEY (shared_with) REFERENCES auth.users(id),
    CONSTRAINT document_shares_shared_by_fkey FOREIGN KEY (shared_by) REFERENCES auth.users(id),
    CONSTRAINT document_shares_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id)
);

-- 5. Create knowledge_base table
CREATE TABLE public.knowledge_base (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    content text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    source text,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    tags text[] DEFAULT '{}'::text[],
    embedding vector(1536), -- Assuming OpenAI embeddings
    owner_id uuid NOT NULL,
    shared_with uuid[] DEFAULT '{}'::uuid[],
    is_public boolean DEFAULT false,
    CONSTRAINT knowledge_base_pkey PRIMARY KEY (id),
    CONSTRAINT knowledge_base_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id)
);

-- 6. Create model_cache table
CREATE TABLE public.model_cache (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    prompt text NOT NULL,
    response text NOT NULL,
    model_name text NOT NULL,
    score double precision DEFAULT 0.0,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    expires_at timestamp with time zone NOT NULL,
    CONSTRAINT model_cache_pkey PRIMARY KEY (id)
);

-- 7. Create tasks table
CREATE TABLE public.tasks (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    title text NOT NULL,
    due_date date,
    link text,
    priority text DEFAULT 'medium'::text,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    user_id uuid NOT NULL,
    CONSTRAINT tasks_pkey PRIMARY KEY (id),
    CONSTRAINT tasks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- 8. Create chat_history table
CREATE TABLE public.chat_history (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    chat_id text NOT NULL,
    message text NOT NULL,
    response jsonb NOT NULL,
    mode text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    user_id uuid NOT NULL,
    CONSTRAINT chat_history_pkey PRIMARY KEY (id),
    CONSTRAINT chat_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- 9. API Keys table (for API authentication)
CREATE TABLE public.api_keys (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL,
    name text NOT NULL,
    key_hash text UNIQUE NOT NULL,
    permissions jsonb DEFAULT '{}'::jsonb,
    expires_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT api_keys_pkey PRIMARY KEY (id),
    CONSTRAINT api_keys_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);

-- 10. Processing Jobs table (for background processing)
CREATE TABLE public.processing_jobs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
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

-- 11. Document Processing History (for audit trail)
CREATE TABLE public.document_processing_history (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
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

-- 12. Field Extraction Templates (for custom field extraction)
CREATE TABLE public.extraction_templates (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
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

-- 13. User Feedback (for human-in-the-loop)
CREATE TABLE public.user_feedback (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
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

-- 14. Create indexes for performance
CREATE INDEX idx_profiles_organization_id ON public.profiles(organization_id);
CREATE INDEX idx_documents_organization_id ON public.documents(organization_id);
CREATE INDEX idx_documents_user_id ON public.documents(user_id);
CREATE INDEX idx_documents_status ON public.documents(status);
CREATE INDEX idx_api_keys_organization_id ON public.api_keys(organization_id);
CREATE INDEX idx_processing_jobs_organization_id ON public.processing_jobs(organization_id);
CREATE INDEX idx_processing_jobs_document_id ON public.processing_jobs(document_id);
CREATE INDEX idx_processing_jobs_status ON public.processing_jobs(status);
CREATE INDEX idx_user_feedback_document_id ON public.user_feedback(document_id);
CREATE INDEX idx_user_feedback_user_id ON public.user_feedback(user_id);
CREATE INDEX idx_extraction_templates_organization_id ON public.extraction_templates(organization_id);

-- 15. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_processing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extraction_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- 16. Create RLS Policies with proper syntax
-- Organizations policies
CREATE POLICY "Users can view their organization" ON public.organizations
    FOR SELECT TO authenticated USING (
        id IN (
            SELECT organization_id FROM public.profiles 
            WHERE id = (SELECT auth.uid())
        )
    );

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT TO authenticated USING (id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE TO authenticated USING (id = (SELECT auth.uid()));

-- Documents policies (comprehensive CRUD)
CREATE POLICY "Users can view organization documents" ON public.documents
    FOR SELECT TO authenticated USING (
        organization_id IN (
            SELECT organization_id FROM public.profiles 
            WHERE id = (SELECT auth.uid())
        ) OR user_id = (SELECT auth.uid())
    );

CREATE POLICY "Users can insert documents" ON public.documents
    FOR INSERT TO authenticated WITH CHECK (
        organization_id = (
            SELECT organization_id FROM public.profiles 
            WHERE id = (SELECT auth.uid())
        ) OR user_id = (SELECT auth.uid())
    );

CREATE POLICY "Users can update their documents" ON public.documents
    FOR UPDATE TO authenticated USING (
        organization_id IN (
            SELECT organization_id FROM public.profiles 
            WHERE id = (SELECT auth.uid())
        ) OR user_id = (SELECT auth.uid())
    ) WITH CHECK (
        organization_id = (
            SELECT organization_id FROM public.profiles 
            WHERE id = (SELECT auth.uid())
        ) OR user_id = (SELECT auth.uid())
    );

CREATE POLICY "Users can delete their documents" ON public.documents
    FOR DELETE TO authenticated USING (
        organization_id IN (
            SELECT organization_id FROM public.profiles 
            WHERE id = (SELECT auth.uid())
        ) OR user_id = (SELECT auth.uid())
    );

-- API keys policies
CREATE POLICY "Users can view organization API keys" ON public.api_keys
    FOR SELECT TO authenticated USING (
        organization_id IN (
            SELECT organization_id FROM public.profiles 
            WHERE id = (SELECT auth.uid())
        )
    );

-- Processing jobs policies
CREATE POLICY "Users can view organization processing jobs" ON public.processing_jobs
    FOR SELECT TO authenticated USING (
        organization_id IN (
            SELECT organization_id FROM public.profiles 
            WHERE id = (SELECT auth.uid())
        )
    );

-- Extraction templates policies
CREATE POLICY "Users can view organization templates" ON public.extraction_templates
    FOR SELECT TO authenticated USING (
        organization_id IN (
            SELECT organization_id FROM public.profiles 
            WHERE id = (SELECT auth.uid())
        )
    );

-- User feedback policies
CREATE POLICY "Users can view their feedback" ON public.user_feedback
    FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert their feedback" ON public.user_feedback
    FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
