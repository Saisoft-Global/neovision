-- Fix agents table schema to include missing columns
-- Run this in Supabase SQL Editor

-- First, check current table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'agents' 
ORDER BY ordinal_position;

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add personality column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agents' AND column_name = 'personality'
    ) THEN
        ALTER TABLE agents ADD COLUMN personality JSONB DEFAULT '{}'::jsonb;
        RAISE NOTICE 'Added personality column';
    END IF;

    -- Add skills column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agents' AND column_name = 'skills'
    ) THEN
        ALTER TABLE agents ADD COLUMN skills JSONB DEFAULT '[]'::jsonb;
        RAISE NOTICE 'Added skills column';
    END IF;

    -- Add config column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agents' AND column_name = 'config'
    ) THEN
        ALTER TABLE agents ADD COLUMN config JSONB DEFAULT '{}'::jsonb;
        RAISE NOTICE 'Added config column';
    END IF;

    -- Add status column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agents' AND column_name = 'status'
    ) THEN
        ALTER TABLE agents ADD COLUMN status TEXT DEFAULT 'active';
        RAISE NOTICE 'Added status column';
    END IF;

    -- Add tools column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agents' AND column_name = 'tools'
    ) THEN
        ALTER TABLE agents ADD COLUMN tools JSONB DEFAULT '[]'::jsonb;
        RAISE NOTICE 'Added tools column';
    END IF;

    -- Add user_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agents' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE agents ADD COLUMN user_id UUID REFERENCES auth.users(id);
        RAISE NOTICE 'Added user_id column';
    END IF;

    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agents' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE agents ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Added created_at column';
    END IF;

    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agents' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE agents ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column';
    END IF;

END $$;

-- Check final table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'agents' 
ORDER BY ordinal_position;

-- Enable RLS if not already enabled
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- Create policy if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'agents' 
        AND policyname = 'Users can manage their own agents'
    ) THEN
        CREATE POLICY "Users can manage their own agents"
        ON agents
        FOR ALL
        USING (auth.uid() = user_id);
        RAISE NOTICE 'Created RLS policy';
    END IF;
END $$;

-- Verify the fix
SELECT 'Schema fix completed successfully!' as status;
