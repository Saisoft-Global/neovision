-- Simple RLS Policy Fix - Only Essential Tables
-- Run this in Supabase SQL Editor

-- 1. Fix agent_personality_traits table policies
DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow authenticated read access" ON public.agent_personality_traits;
    DROP POLICY IF EXISTS "Allow authenticated insert access" ON public.agent_personality_traits;
    DROP POLICY IF EXISTS "Allow authenticated update access" ON public.agent_personality_traits;
    DROP POLICY IF EXISTS "Allow authenticated delete access" ON public.agent_personality_traits;
EXCEPTION
    WHEN undefined_object THEN
        NULL;
END $$;

-- Create policy for agent_personality_traits
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

-- 3. Fix main agents table policies
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

-- Verify the fix
SELECT 'Essential RLS policies fixed successfully!' as status;
