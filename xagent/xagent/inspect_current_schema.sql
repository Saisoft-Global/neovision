-- ============================================
-- INSPECT CURRENT SUPABASE SCHEMA
-- ============================================
-- Run this in your Supabase SQL editor to see what exists

-- 1. List all tables
SELECT 
    'TABLE' as object_type,
    table_name as object_name,
    'N/A' as column_name,
    'N/A' as data_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 2. List all columns for key tables
SELECT 
    'COLUMN' as object_type,
    table_name as object_name,
    column_name,
    data_type || 
    CASE 
        WHEN character_maximum_length IS NOT NULL THEN '(' || character_maximum_length || ')'
        ELSE ''
    END as data_type
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
        'organization_members',
        'organization_llm_settings'
    )
ORDER BY table_name, ordinal_position;

-- 3. Check if organization tables exist
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations' AND table_schema = 'public')
        THEN '✅ organizations table EXISTS'
        ELSE '❌ organizations table MISSING'
    END as organizations_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organization_members' AND table_schema = 'public')
        THEN '✅ organization_members table EXISTS'
        ELSE '❌ organization_members table MISSING'
    END as organization_members_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organization_llm_settings' AND table_schema = 'public')
        THEN '✅ organization_llm_settings table EXISTS'
        ELSE '❌ organization_llm_settings table MISSING'
    END as organization_llm_settings_status;

-- 4. Check if agents table has user_id column
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'user_id' AND table_schema = 'public')
        THEN '✅ agents.user_id column EXISTS'
        ELSE '❌ agents.user_id column MISSING'
    END as agents_user_id_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'organization_id' AND table_schema = 'public')
        THEN '✅ agents.organization_id column EXISTS'
        ELSE '❌ agents.organization_id column MISSING'
    END as agents_organization_id_status;
