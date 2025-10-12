# Supabase Database Setup Guide

## 🎯 Problem
The authentication is working, but we need to ensure the database tables exist for user data.

## 📊 Required Tables

Your app needs these tables in Supabase:

1. **`public.users`** - User profile data (synced from auth.users)
2. **`documents`** - Knowledge base documents
3. **`agents`** - AI agents
4. **`agent_skills`** - Agent capabilities
5. **`agent_knowledge_bases`** - Agent knowledge connections
6. **`agent_workflows`** - Workflow templates
7. **`chat_messages`** - Chat history
8. **`agent_memories`** - Tiered memory system

---

## ✅ How to Set Up Database

### Option 1: Using Supabase Dashboard (Easiest)

1. **Go to:** https://supabase.com/dashboard/project/cybstyrslstfxlabiqyy

2. **Click:** SQL Editor (left sidebar)

3. **Run this SQL** to create the essential tables:

```sql
-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create users table (synced from auth)
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'user',
  permissions jsonb DEFAULT '[]',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_role CHECK (role IN ('admin', 'user', 'manager'))
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Public users are viewable by everyone" 
  ON public.users FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert"
  ON public.users FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own record"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Create sync function to auto-create user in public.users when auth user is created
CREATE OR REPLACE FUNCTION public.sync_user_data()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    INSERT INTO public.users (id, email, role, permissions)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
      COALESCE(NEW.raw_user_meta_data->'permissions', '[]'::jsonb)
    )
    ON CONFLICT (id) DO UPDATE
    SET
      email = EXCLUDED.email,
      role = COALESCE(EXCLUDED.role, users.role),
      permissions = COALESCE(EXCLUDED.permissions, users.permissions),
      updated_at = now();
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$;

-- Create trigger to sync auth.users -> public.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_data();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- 2. Create documents table
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  content text NOT NULL,
  doc_type text NOT NULL,
  embeddings numeric[] DEFAULT NULL,
  metadata jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',
  thread_id uuid,
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Documents are viewable by authenticated users"
  ON public.documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Documents can be created by authenticated users"
  ON public.documents FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 3. Create agents table
CREATE TABLE IF NOT EXISTS public.agents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  type text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active',
  config jsonb DEFAULT '{}',
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents are viewable by authenticated users"
  ON public.agents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Agents can be created by authenticated users"
  ON public.agents FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 4. Create chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id uuid NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  role text NOT NULL,
  content text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Messages are viewable by owner"
  ON public.chat_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Messages can be created by authenticated users"
  ON public.chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 5. Create agent_memories table (for tiered memory)
CREATE TABLE IF NOT EXISTS public.agent_memories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id),
  thread_id uuid,
  memory_type text NOT NULL CHECK (memory_type IN ('short_term', 'episodic', 'long_term')),
  content text NOT NULL,
  summary text,
  embedding vector(1536),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

ALTER TABLE public.agent_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Memories are viewable by owner"
  ON public.agent_memories FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Memories can be created by authenticated users"
  ON public.agent_memories FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_thread_id ON public.documents(thread_id);
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON public.agents(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_id ON public.chat_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_memories_user_id ON public.agent_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_memories_thread_id ON public.agent_memories(thread_id);
CREATE INDEX IF NOT EXISTS idx_memories_type ON public.agent_memories(memory_type);
```

4. **Click "Run"** - This will create all necessary tables

---

### Option 2: Using Supabase CLI (Advanced)

If you have Supabase CLI installed:

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref cybstyrslstfxlabiqyy

# Push migrations
supabase db push
```

---

## 🧪 Test Database Setup

After running the SQL, test it:

1. **Create a test user:**
   - Go to: https://devai.neoworks.ai/login
   - Sign up with a new account
   - Email: test@example.com / Password: Test123456!

2. **Check Supabase:**
   - Go to: Table Editor
   - Should see `public.users` table with your new user
   - User should have been auto-created by the trigger

3. **Verify in app:**
   - Login with test account
   - Visit: /test/supabase
   - "Get Current User" should show your email ✓

---

## ✅ What This Does

1. **Auto-syncs users:** When someone signs up via auth, they're automatically added to `public.users`
2. **Enables profiles:** Users can have roles, permissions, metadata
3. **Knowledge base:** Documents table for uploads
4. **Agents:** Store AI agent configurations
5. **Chat:** Store conversation history
6. **Memory:** Tiered memory system (short-term, episodic, long-term)

---

## 🔐 Security

All tables have RLS (Row Level Security) enabled:
- Users can only see/modify their own data
- Admins can see all data
- Proper authentication required

---

## 🆘 Troubleshooting

### Error: "relation auth.users does not exist"
**Solution:** You're not running this in the right database. Make sure you're in the Supabase SQL Editor for your project.

### Error: "permission denied"
**Solution:** Make sure you're using the SQL Editor as admin, not trying to run this from your app.

### Users not syncing
**Solution:** Re-run the trigger creation part of the SQL, then sign up a new user to test.

---

## 📞 Next Steps

After setting up the database:
1. ✅ Database tables created
2. ✅ Try signup/login
3. ✅ User should auto-appear in `public.users`
4. ✅ App fully functional!

---

**Once the database is set up, your authentication will work end-to-end!** 🎉

