-- Create agent_workflows junction table
-- Links agents to workflows for intelligent workflow triggering

-- Create agent_workflows table (if not exists)
CREATE TABLE IF NOT EXISTS public.agent_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  workflow_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(agent_id, workflow_id)
);

-- Add foreign key to agents table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agents') THEN
    ALTER TABLE public.agent_workflows 
    ADD CONSTRAINT fk_agent_workflows_agent 
    FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key to workflows table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workflows') THEN
    ALTER TABLE public.agent_workflows 
    ADD CONSTRAINT fk_agent_workflows_workflow 
    FOREIGN KEY (workflow_id) REFERENCES public.workflows(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_workflows_agent_id ON public.agent_workflows(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_workflows_workflow_id ON public.agent_workflows(workflow_id);
CREATE INDEX IF NOT EXISTS idx_agent_workflows_created_at ON public.agent_workflows(created_at);

-- Enable Row Level Security
ALTER TABLE public.agent_workflows ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view agent workflows"
  ON public.agent_workflows FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create agent workflows"
  ON public.agent_workflows FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by OR
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Users can delete own agent workflows"
  ON public.agent_workflows FOR DELETE
  TO authenticated
  USING (
    auth.uid() = created_by OR
    auth.jwt() ->> 'role' = 'admin'
  );

-- Grant permissions
GRANT SELECT, INSERT, DELETE ON public.agent_workflows TO authenticated;

-- Add comments
COMMENT ON TABLE public.agent_workflows IS 'Junction table linking agents to their associated workflows';
COMMENT ON COLUMN public.agent_workflows.agent_id IS 'Reference to the agent';
COMMENT ON COLUMN public.agent_workflows.workflow_id IS 'Reference to the workflow';

