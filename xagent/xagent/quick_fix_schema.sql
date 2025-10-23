-- Quick fix for agent_workflows schema issue
-- This will create a proper linking table

-- Create the proper linking table
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

SELECT 'Agent workflow links table created successfully!' as status;
