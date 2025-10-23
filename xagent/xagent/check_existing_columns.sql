-- ============================================
-- CHECK EXISTING COLUMNS IN KEY TABLES
-- ============================================
-- This will show us exactly what columns exist in each table

-- 1. Check agents table columns
SELECT 
    'agents' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'agents'
ORDER BY ordinal_position;

-- 2. Check workflows table columns  
SELECT 
    'workflows' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'workflows'
ORDER BY ordinal_position;

-- 3. Check documents table columns
SELECT 
    'documents' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'documents'
ORDER BY ordinal_position;

-- 4. Check if organization tables exist
SELECT 
    table_name,
    'EXISTS' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN (
        'organizations', 
        'organization_members', 
        'organization_llm_settings',
        'organization_usage',
        'organization_invitations',
        'organization_audit_logs'
    )
ORDER BY table_name;

-- 5. Check other key tables
SELECT 
    table_name,
    'EXISTS' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN (
        'agent_personality_traits',
        'agent_skills', 
        'uploaded_documents',
        'conversations',
        'user_llm_settings'
    )
ORDER BY table_name;
