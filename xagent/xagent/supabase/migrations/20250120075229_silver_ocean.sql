-- Create schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS public;

-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing policies to avoid conflicts
DO $$ 
BEGIN
  -- Drop policies for agents table
  DROP POLICY IF EXISTS "Allow authenticated read access" ON public.agents;
  
  -- Drop policies for agent_skills table
  DROP POLICY IF EXISTS "Allow authenticated read access" ON public.agent_skills;
  
  -- Drop policies for agent_knowledge_bases table
  DROP POLICY IF EXISTS "Allow authenticated read access" ON public.agent_knowledge_bases;
  
  -- Drop policies for agent_workflows table
  DROP POLICY IF EXISTS "Allow authenticated read access" ON public.agent_workflows;
  
  -- Drop policies for agent_personality_traits table
  DROP POLICY IF EXISTS "Allow authenticated read access" ON public.agent_personality_traits;
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END $$;

-- Agents table
CREATE TABLE IF NOT EXISTS public.agents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  type text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active',
  config jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Agent skills/capabilities
CREATE TABLE IF NOT EXISTS public.agent_skills (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id uuid REFERENCES public.agents(id) ON DELETE CASCADE,
  skill_name text NOT NULL,
  skill_level integer CHECK (skill_level BETWEEN 1 AND 5),
  config jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Knowledge bases
CREATE TABLE IF NOT EXISTS public.agent_knowledge_bases (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id uuid REFERENCES public.agents(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL,
  connection_config jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Workflow templates
CREATE TABLE IF NOT EXISTS public.agent_workflows (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  steps jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Personality traits
CREATE TABLE IF NOT EXISTS public.agent_personality_traits (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id uuid REFERENCES public.agents(id) ON DELETE CASCADE,
  trait_name text NOT NULL,
  trait_value numeric CHECK (trait_value BETWEEN 0 AND 1),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_knowledge_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_personality_traits ENABLE ROW LEVEL SECURITY;

-- Create new RLS Policies
CREATE POLICY "Allow authenticated read access" ON public.agents
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON public.agent_skills
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON public.agent_knowledge_bases
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON public.agent_workflows
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON public.agent_personality_traits
  FOR SELECT TO authenticated USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agents_type ON public.agents(type);
CREATE INDEX IF NOT EXISTS idx_agent_skills_agent_id ON public.agent_skills(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_bases_agent_id ON public.agent_knowledge_bases(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_personality_traits_agent_id ON public.agent_personality_traits(agent_id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;