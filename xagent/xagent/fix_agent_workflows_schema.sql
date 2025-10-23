-- Fix agent_workflows table schema
-- The table exists but has wrong column names

-- Check current schema
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'agent_workflows' 
ORDER BY ordinal_position;

-- If the table has wrong columns, we need to fix it
-- Let's check what columns actually exist
DO $$
BEGIN
    -- Check if workflow_id column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agent_workflows' AND column_name = 'workflow_id'
    ) THEN
        -- Check what columns do exist
        RAISE NOTICE 'workflow_id column does not exist in agent_workflows table';
        
        -- If it's a template table, we might need to rename columns
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'agent_workflows' AND column_name = 'id'
        ) THEN
            -- This might be a template table, let's add the missing columns
            ALTER TABLE public.agent_workflows 
            ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES public.agents(id),
            ADD COLUMN IF NOT EXISTS workflow_id UUID REFERENCES public.workflows(id);
            
            RAISE NOTICE 'Added agent_id and workflow_id columns to agent_workflows table';
        END IF;
    END IF;
END $$;

-- Create a proper linking table if needed
CREATE TABLE IF NOT EXISTS public.agent_workflow_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(agent_id, workflow_id)
);

-- Enable RLS on the new table
ALTER TABLE public.agent_workflow_links ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for the linking table
CREATE POLICY "Users can manage agent workflow links"
  ON public.agent_workflow_links FOR ALL
  TO authenticated
  USING (
    agent_id IN (
      SELECT id FROM public.agents 
      WHERE created_by = auth.uid()
    )
  );

SELECT 'Agent workflows schema fixed successfully!' as status;
