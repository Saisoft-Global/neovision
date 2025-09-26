-- IMPROVED IDP Extension for Supabase Project
-- Addresses Supabase best practices and RLS policy improvements

-- 1. Check and install UUID extension (Supabase usually has this already)
-- Note: Supabase typically provides uuid generation functions by default
-- This is a safety check
DO $$ 
BEGIN
    -- Check if uuid_generate_v4 function exists
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'uuid_generate_v4') THEN
        -- Try to create extension if function doesn't exist
        BEGIN
            CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;
            RAISE NOTICE 'UUID extension installed in extensions schema';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'UUID extension already available or cannot be installed: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'UUID generation function already available';
    END IF;
END $$;

-- 2. Organizations table (for multi-tenant support)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organizations') THEN
        CREATE TABLE public.organizations (
            id uuid NOT NULL DEFAULT gen_random_uuid(), -- Use Supabase's built-in function
            name text NOT NULL,
            slug text UNIQUE NOT NULL,
            settings jsonb DEFAULT '{}'::jsonb,
            created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
            updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
            CONSTRAINT organizations_pkey PRIMARY KEY (id)
        );
        RAISE NOTICE 'Created organizations table';
    ELSE
        RAISE NOTICE 'Organizations table already exists, skipping';
    END IF;
END $$;

-- 3. Safely update profiles table to include organization fields
DO $$ 
BEGIN
    -- Add organization_id column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'organization_id') THEN
        ALTER TABLE public.profiles ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
        RAISE NOTICE 'Added organization_id column to profiles table';
    END IF;
    
    -- Add role column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role') THEN
        ALTER TABLE public.profiles ADD COLUMN role text DEFAULT 'user'::text;
        RAISE NOTICE 'Added role column to profiles table';
    END IF;
    
    -- Add status column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'status') THEN
        ALTER TABLE public.profiles ADD COLUMN status text DEFAULT 'active'::text;
        RAISE NOTICE 'Added status column to profiles table';
    END IF;
END $$;

-- 4. API Keys table (for API authentication)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'api_keys') THEN
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
        RAISE NOTICE 'Created api_keys table';
    ELSE
        RAISE NOTICE 'API keys table already exists, skipping';
    END IF;
END $$;

-- 5. Safely extend documents table for IDP features
DO $$ 
BEGIN
    -- Add organization_id column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'organization_id') THEN
        ALTER TABLE public.documents ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
        RAISE NOTICE 'Added organization_id column to documents table';
    END IF;
    
    -- Add file_path column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'file_path') THEN
        ALTER TABLE public.documents ADD COLUMN file_path text;
        RAISE NOTICE 'Added file_path column to documents table';
    END IF;
    
    -- Add file_type column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'file_type') THEN
        ALTER TABLE public.documents ADD COLUMN file_type text;
        RAISE NOTICE 'Added file_type column to documents table';
    END IF;
    
    -- Add file_size column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'file_size') THEN
        ALTER TABLE public.documents ADD COLUMN file_size bigint;
        RAISE NOTICE 'Added file_size column to documents table';
    END IF;
    
    -- Add status column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'status') THEN
        ALTER TABLE public.documents ADD COLUMN status text DEFAULT 'processing'::text;
        RAISE NOTICE 'Added status column to documents table';
    END IF;
    
    -- Add extracted_fields column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'extracted_fields') THEN
        ALTER TABLE public.documents ADD COLUMN extracted_fields jsonb DEFAULT '{}'::jsonb;
        RAISE NOTICE 'Added extracted_fields column to documents table';
    END IF;
    
    -- Add confidence_score column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'confidence_score') THEN
        ALTER TABLE public.documents ADD COLUMN confidence_score decimal(3,2);
        RAISE NOTICE 'Added confidence_score column to documents table';
    END IF;
    
    -- Add processing_method column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'processing_method') THEN
        ALTER TABLE public.documents ADD COLUMN processing_method text;
        RAISE NOTICE 'Added processing_method column to documents table';
    END IF;
    
    -- Add ocr_text column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'ocr_text') THEN
        ALTER TABLE public.documents ADD COLUMN ocr_text text;
        RAISE NOTICE 'Added ocr_text column to documents table';
    END IF;
    
    -- Add bounding_boxes column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'bounding_boxes') THEN
        ALTER TABLE public.documents ADD COLUMN bounding_boxes jsonb DEFAULT '[]'::jsonb;
        RAISE NOTICE 'Added bounding_boxes column to documents table';
    END IF;
    
    -- Add tables column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'tables') THEN
        ALTER TABLE public.documents ADD COLUMN tables jsonb DEFAULT '[]'::jsonb;
        RAISE NOTICE 'Added tables column to documents table';
    END IF;
    
    -- Add headers column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'headers') THEN
        ALTER TABLE public.documents ADD COLUMN headers jsonb DEFAULT '[]'::jsonb;
        RAISE NOTICE 'Added headers column to documents table';
    END IF;
    
    -- Add footers column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'footers') THEN
        ALTER TABLE public.documents ADD COLUMN footers jsonb DEFAULT '[]'::jsonb;
        RAISE NOTICE 'Added footers column to documents table';
    END IF;
END $$;

-- 6. Processing Jobs table (for background processing)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'processing_jobs') THEN
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
        RAISE NOTICE 'Created processing_jobs table';
    ELSE
        RAISE NOTICE 'Processing jobs table already exists, skipping';
    END IF;
END $$;

-- 7. Document Processing History (for audit trail)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'document_processing_history') THEN
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
        RAISE NOTICE 'Created document_processing_history table';
    ELSE
        RAISE NOTICE 'Document processing history table already exists, skipping';
    END IF;
END $$;

-- 8. Field Extraction Templates (for custom field extraction)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'extraction_templates') THEN
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
        RAISE NOTICE 'Created extraction_templates table';
    ELSE
        RAISE NOTICE 'Extraction templates table already exists, skipping';
    END IF;
END $$;

-- 9. User Feedback (for human-in-the-loop)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_feedback') THEN
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
        RAISE NOTICE 'Created user_feedback table';
    ELSE
        RAISE NOTICE 'User feedback table already exists, skipping';
    END IF;
END $$;

-- 10. Create indexes for performance (including FK indexes)
DO $$ 
BEGIN
    -- Profiles organization_id index
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE tablename = 'profiles' AND indexname = 'idx_profiles_organization_id') THEN
        CREATE INDEX idx_profiles_organization_id ON public.profiles(organization_id);
        RAISE NOTICE 'Created profiles organization_id index';
    END IF;
    
    -- Documents organization_id index
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE tablename = 'documents' AND indexname = 'idx_documents_organization_id') THEN
        CREATE INDEX idx_documents_organization_id ON public.documents(organization_id);
        RAISE NOTICE 'Created documents organization_id index';
    END IF;
    
    -- Documents user_id index (for FK performance)
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE tablename = 'documents' AND indexname = 'idx_documents_user_id') THEN
        CREATE INDEX idx_documents_user_id ON public.documents(user_id);
        RAISE NOTICE 'Created documents user_id index';
    END IF;
    
    -- Documents status index
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE tablename = 'documents' AND indexname = 'idx_documents_status') THEN
        CREATE INDEX idx_documents_status ON public.documents(status);
        RAISE NOTICE 'Created documents status index';
    END IF;
    
    -- API keys organization_id index
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE tablename = 'api_keys' AND indexname = 'idx_api_keys_organization_id') THEN
        CREATE INDEX idx_api_keys_organization_id ON public.api_keys(organization_id);
        RAISE NOTICE 'Created API keys organization_id index';
    END IF;
    
    -- Processing jobs organization_id index
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE tablename = 'processing_jobs' AND indexname = 'idx_processing_jobs_organization_id') THEN
        CREATE INDEX idx_processing_jobs_organization_id ON public.processing_jobs(organization_id);
        RAISE NOTICE 'Created processing jobs organization_id index';
    END IF;
    
    -- Processing jobs document_id index
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE tablename = 'processing_jobs' AND indexname = 'idx_processing_jobs_document_id') THEN
        CREATE INDEX idx_processing_jobs_document_id ON public.processing_jobs(document_id);
        RAISE NOTICE 'Created processing jobs document_id index';
    END IF;
    
    -- Processing jobs status index
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE tablename = 'processing_jobs' AND indexname = 'idx_processing_jobs_status') THEN
        CREATE INDEX idx_processing_jobs_status ON public.processing_jobs(status);
        RAISE NOTICE 'Created processing jobs status index';
    END IF;
    
    -- User feedback document_id index
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE tablename = 'user_feedback' AND indexname = 'idx_user_feedback_document_id') THEN
        CREATE INDEX idx_user_feedback_document_id ON public.user_feedback(document_id);
        RAISE NOTICE 'Created user feedback document_id index';
    END IF;
    
    -- User feedback user_id index
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE tablename = 'user_feedback' AND indexname = 'idx_user_feedback_user_id') THEN
        CREATE INDEX idx_user_feedback_user_id ON public.user_feedback(user_id);
        RAISE NOTICE 'Created user feedback user_id index';
    END IF;
    
    -- Extraction templates organization_id index
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE tablename = 'extraction_templates' AND indexname = 'idx_extraction_templates_organization_id') THEN
        CREATE INDEX idx_extraction_templates_organization_id ON public.extraction_templates(organization_id);
        RAISE NOTICE 'Created extraction templates organization_id index';
    END IF;
END $$;

-- 11. Enable Row Level Security (RLS) on new tables
DO $$ 
BEGIN
    -- Enable RLS on new tables
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organizations') THEN
        ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on organizations table';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'api_keys') THEN
        ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on api_keys table';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'processing_jobs') THEN
        ALTER TABLE public.processing_jobs ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on processing_jobs table';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'document_processing_history') THEN
        ALTER TABLE public.document_processing_history ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on document_processing_history table';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'extraction_templates') THEN
        ALTER TABLE public.extraction_templates ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on extraction_templates table';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_feedback') THEN
        ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on user_feedback table';
    END IF;
END $$;

-- 12. Create IMPROVED RLS Policies with proper syntax
DO $$ 
BEGIN
    -- Organizations policies
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'organizations' AND policyname = 'Users can view their organization') THEN
        CREATE POLICY "Users can view their organization" ON public.organizations
            FOR SELECT TO authenticated USING (
                id IN (
                    SELECT organization_id FROM public.profiles 
                    WHERE id = (SELECT auth.uid())
                )
            );
        RAISE NOTICE 'Created organizations view policy';
    END IF;
    
    -- API keys policies
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'api_keys' AND policyname = 'Users can view organization API keys') THEN
        CREATE POLICY "Users can view organization API keys" ON public.api_keys
            FOR SELECT TO authenticated USING (
                organization_id IN (
                    SELECT organization_id FROM public.profiles 
                    WHERE id = (SELECT auth.uid())
                )
            );
        RAISE NOTICE 'Created API keys view policy';
    END IF;
    
    -- Processing jobs policies
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'processing_jobs' AND policyname = 'Users can view organization processing jobs') THEN
        CREATE POLICY "Users can view organization processing jobs" ON public.processing_jobs
            FOR SELECT TO authenticated USING (
                organization_id IN (
                    SELECT organization_id FROM public.profiles 
                    WHERE id = (SELECT auth.uid())
                )
            );
        RAISE NOTICE 'Created processing jobs view policy';
    END IF;
    
    -- Extraction templates policies
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'extraction_templates' AND policyname = 'Users can view organization templates') THEN
        CREATE POLICY "Users can view organization templates" ON public.extraction_templates
            FOR SELECT TO authenticated USING (
                organization_id IN (
                    SELECT organization_id FROM public.profiles 
                    WHERE id = (SELECT auth.uid())
                )
            );
        RAISE NOTICE 'Created extraction templates view policy';
    END IF;
    
    -- User feedback policies
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'user_feedback' AND policyname = 'Users can view their feedback') THEN
        CREATE POLICY "Users can view their feedback" ON public.user_feedback
            FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
        RAISE NOTICE 'Created user feedback view policy';
    END IF;
END $$;

-- 13. Update existing documents policies with improved syntax
DO $$ 
BEGIN
    -- Drop existing policy if it exists
    IF EXISTS (SELECT FROM pg_policies WHERE tablename = 'documents' AND policyname = 'Users can view their documents') THEN
        DROP POLICY "Users can view their documents" ON public.documents;
        RAISE NOTICE 'Dropped old documents policy';
    END IF;
    
    -- Create comprehensive documents policies
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'documents' AND policyname = 'Users can view organization documents') THEN
        CREATE POLICY "Users can view organization documents" ON public.documents
            FOR SELECT TO authenticated USING (
                organization_id IN (
                    SELECT organization_id FROM public.profiles 
                    WHERE id = (SELECT auth.uid())
                ) OR user_id = (SELECT auth.uid())
            );
        RAISE NOTICE 'Created documents view policy';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'documents' AND policyname = 'Users can insert documents') THEN
        CREATE POLICY "Users can insert documents" ON public.documents
            FOR INSERT TO authenticated WITH CHECK (
                organization_id = (
                    SELECT organization_id FROM public.profiles 
                    WHERE id = (SELECT auth.uid())
                ) OR user_id = (SELECT auth.uid())
            );
        RAISE NOTICE 'Created documents insert policy';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'documents' AND policyname = 'Users can update their documents') THEN
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
        RAISE NOTICE 'Created documents update policy';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'documents' AND policyname = 'Users can delete their documents') THEN
        CREATE POLICY "Users can delete their documents" ON public.documents
            FOR DELETE TO authenticated USING (
                organization_id IN (
                    SELECT organization_id FROM public.profiles 
                    WHERE id = (SELECT auth.uid())
                ) OR user_id = (SELECT auth.uid())
            );
        RAISE NOTICE 'Created documents delete policy';
    END IF;
END $$;

-- Final success message
DO $$ 
BEGIN
    RAISE NOTICE '✅ IMPROVED IDP Extension completed successfully!';
    RAISE NOTICE '📋 Added tables: organizations, api_keys, processing_jobs, document_processing_history, extraction_templates, user_feedback';
    RAISE NOTICE '🔧 Extended tables: profiles, documents';
    RAISE NOTICE '🛡️ Enabled RLS policies with proper syntax (TO authenticated, wrapped auth.uid())';
    RAISE NOTICE '⚡ Created comprehensive performance indexes including FK indexes';
    RAISE NOTICE '🎉 Your Supabase project is now ready for IDP features!';
END $$;
