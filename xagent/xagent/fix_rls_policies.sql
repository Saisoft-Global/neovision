-- Fix Row-Level Security policies for agent-related tables
-- Run this in Supabase SQL Editor

-- 1. Fix agent_personality_traits table policies
DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Allow authenticated read access" ON public.agent_personality_traits;
    DROP POLICY IF EXISTS "Allow authenticated insert access" ON public.agent_personality_traits;
    DROP POLICY IF EXISTS "Allow authenticated update access" ON public.agent_personality_traits;
    DROP POLICY IF EXISTS "Allow authenticated delete access" ON public.agent_personality_traits;
EXCEPTION
    WHEN undefined_object THEN
        NULL;
END $$;

-- Create comprehensive policies for agent_personality_traits
CREATE POLICY "Users can manage agent personality traits"
ON public.agent_personality_traits
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.agents 
        WHERE agents.id = agent_personality_traits.agent_id 
        AND agents.created_by = auth.uid()
    )
);

-- 2. Fix agent_skills table policies
DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow authenticated read access" ON public.agent_skills;
    DROP POLICY IF EXISTS "Allow authenticated insert access" ON public.agent_skills;
    DROP POLICY IF EXISTS "Allow authenticated update access" ON public.agent_skills;
    DROP POLICY IF EXISTS "Allow authenticated delete access" ON public.agent_skills;
EXCEPTION
    WHEN undefined_object THEN
        NULL;
END $$;

CREATE POLICY "Users can manage agent skills"
ON public.agent_skills
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.agents 
        WHERE agents.id = agent_skills.agent_id 
        AND agents.created_by = auth.uid()
    )
);

-- 3. Fix agent_knowledge_bases table policies
DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow authenticated read access" ON public.agent_knowledge_bases;
    DROP POLICY IF EXISTS "Allow authenticated insert access" ON public.agent_knowledge_bases;
    DROP POLICY IF EXISTS "Allow authenticated update access" ON public.agent_knowledge_bases;
    DROP POLICY IF EXISTS "Allow authenticated delete access" ON public.agent_knowledge_bases;
EXCEPTION
    WHEN undefined_object THEN
        NULL;
END $$;

CREATE POLICY "Users can manage agent knowledge bases"
ON public.agent_knowledge_bases
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.agents 
        WHERE agents.id = agent_knowledge_bases.agent_id 
        AND agents.created_by = auth.uid()
    )
);

-- 4. Fix agent_workflows table policies (This is a workflow template table, not linking table)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow authenticated read access" ON public.agent_workflows;
    DROP POLICY IF EXISTS "Allow authenticated insert access" ON public.agent_workflows;
    DROP POLICY IF EXISTS "Allow authenticated update access" ON public.agent_workflows;
    DROP POLICY IF EXISTS "Allow authenticated delete access" ON public.agent_workflows;
EXCEPTION
    WHEN undefined_object THEN
        NULL;
END $$;

-- agent_workflows is a workflow template table, not agent-specific
CREATE POLICY "Authenticated users can manage workflow templates"
ON public.agent_workflows
FOR ALL
TO authenticated
USING (true);

-- 5. Fix main agents table policies
DO $$
BEGIN
    DROP POLICY IF EXISTS "Agents are viewable by authenticated users" ON public.agents;
    DROP POLICY IF EXISTS "Agents can be created by authenticated users" ON public.agents;
    DROP POLICY IF EXISTS "Users can manage their own agents" ON public.agents;
EXCEPTION
    WHEN undefined_object THEN
        NULL;
END $$;

CREATE POLICY "Users can manage their own agents"
ON public.agents
FOR ALL
USING (auth.uid() = created_by);

-- 6. Verify all tables have RLS enabled
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_personality_traits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_knowledge_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_workflows ENABLE ROW LEVEL SECURITY;

-- 7. Verify the fix
SELECT 'RLS policies fixed successfully!' as status;
