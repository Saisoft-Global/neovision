-- ============================================
-- CHECK CURRENT DATABASE SCHEMA
-- ============================================
-- This script will help us understand what tables and columns exist
-- before making any changes to the multi-tenancy migration

-- 1. List all tables in public schema
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 2. Check specific tables we're interested in
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name IN (
        'agents', 
        'workflows', 
        'uploaded_documents', 
        'conversations', 
        'documents',
        'agent_personality_traits',
        'agent_skills',
        'user_llm_settings',
        'organizations',
        'organization_members'
    )
ORDER BY table_name, ordinal_position;

-- 3. Check if organization-related tables already exist
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('organizations', 'organization_members', 'organization_llm_settings', 'organization_usage', 'organization_invitations', 'organization_audit_logs') 
        THEN 'EXISTS' 
        ELSE 'MISSING' 
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN ('organizations', 'organization_members', 'organization_llm_settings', 'organization_usage', 'organization_invitations', 'organization_audit_logs')
ORDER BY table_name;

-- 4. Check existing indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND tablename IN ('agents', 'workflows', 'uploaded_documents', 'conversations', 'documents')
ORDER BY tablename, indexname;

-- 5. Check existing RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
    AND tablename IN ('agents', 'workflows', 'uploaded_documents', 'conversations', 'documents')
ORDER BY tablename, policyname;
