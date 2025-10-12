# 🔧 **DATABASE SCHEMA FIX - STEP BY STEP**

## 🚨 **PROBLEM IDENTIFIED:**

```
❌ Error: Could not find the 'personality' column of 'agents' in the schema cache
```

**Your Supabase `agents` table is missing required columns!**

---

## 🚀 **QUICK FIX (2 MINUTES):**

### **Step 1: Open Supabase SQL Editor**

1. Go to your Supabase dashboard
2. Click **"SQL Editor"** in the left sidebar
3. Click **"New query"**

### **Step 2: Run This SQL**

Copy and paste this entire script:

```sql
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
```

### **Step 3: Click "Run"**

You should see output like:
```
Added personality column
Added skills column
Added config column
Added status column
Added tools column
Added user_id column
Added created_at column
Added updated_at column
Schema fix completed successfully!
```

---

## ✅ **AFTER RUNNING THE SQL:**

### **Step 4: Try Creating Agent Again**

1. Go back to: `http://localhost:5174/agent-builder`
2. Select agent type (e.g., HR Agent)
3. Click "Save Agent"

### **You should now see:**

**Success:**
```
✅ Agent created successfully!

Agent ID: abc-123-def-456

You can now use this agent in the Chat page.
```

**Console:**
```
💾 Storing agent in database: { id: 'abc-123', name: 'New Agent', type: 'hr', skillsCount: 4 }
✅ Agent stored successfully in database
✅ Agent created successfully: { id: 'abc-123', ... }
```

---

## 🐛 **IF SQL FAILS:**

### **Alternative: Create Table From Scratch**

If the table is completely broken, run this instead:

```sql
-- Drop and recreate agents table
DROP TABLE IF EXISTS agents CASCADE;

CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  personality JSONB DEFAULT '{}'::jsonb,
  skills JSONB DEFAULT '[]'::jsonb,
  config JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'active',
  tools JSONB DEFAULT '[]'::jsonb,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can manage their own agents"
ON agents
FOR ALL
USING (auth.uid() = user_id);

-- Verify
SELECT 'Agents table created successfully!' as status;
```

---

## 🔍 **VERIFY THE FIX:**

### **Check Table Structure:**

Run this query to verify:
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'agents' 
ORDER BY ordinal_position;
```

**Should show:**
```
id           | uuid     | NO  | uuid_generate_v4()
name         | text     | NO  | 
type         | text     | NO  | 
description  | text     | YES | 
personality  | jsonb    | YES | '{}'::jsonb
skills       | jsonb    | YES | '[]'::jsonb
config       | jsonb    | YES | '{}'::jsonb
status       | text     | YES | 'active'
tools        | jsonb    | YES | '[]'::jsonb
user_id      | uuid     | YES | 
created_at   | timestamptz | YES | now()
updated_at   | timestamptz | YES | now()
```

---

## 🎯 **WHAT TO DO NEXT:**

### **1. Run the SQL Fix**
- Copy the SQL script above
- Run it in Supabase SQL Editor

### **2. Try Creating Agent Again**
- Go to Agent Builder
- Create a new agent
- Check for success message

### **3. Tell Me the Result**
- Did the SQL run successfully?
- Did agent creation work?
- Any new error messages?

---

## 💡 **WHY THIS HAPPENED:**

The `agents` table was created with an old schema that didn't include all the columns needed for the new agent configuration system. The code expects these columns:

- ✅ `personality` (JSONB) - Agent personality settings
- ✅ `skills` (JSONB) - Array of agent skills  
- ✅ `config` (JSONB) - Full agent configuration
- ✅ `status` (TEXT) - Agent status (active/inactive)
- ✅ `tools` (JSONB) - Attached tools
- ✅ `user_id` (UUID) - Owner of the agent
- ✅ `created_at` (TIMESTAMPTZ) - Creation timestamp
- ✅ `updated_at` (TIMESTAMPTZ) - Last update timestamp

**After running the SQL fix, all these columns will exist and agent creation will work!**

---

**Run the SQL script and try creating an agent again!** 🚀
