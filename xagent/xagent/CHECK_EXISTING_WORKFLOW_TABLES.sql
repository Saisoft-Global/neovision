-- Check structure of existing workflow tables

-- Check workflow table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'workflow'
ORDER BY ordinal_position;

-- Check workflow_triggers table structure  
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'workflow_triggers'
ORDER BY ordinal_position;

-- Check workflow_integrations table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'workflow_integrations'
ORDER BY ordinal_position;

-- Check if agent_workflows exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'agent_workflows'
ORDER BY ordinal_position;

-- Sample data from workflow table
SELECT * FROM workflow LIMIT 5;

-- Sample data from workflow_triggers
SELECT * FROM workflow_triggers LIMIT 5;

-- Sample data from workflow_integrations
SELECT * FROM workflow_integrations LIMIT 5;

-- Check if we need agent_workflows junction table
SELECT * FROM agent_workflows LIMIT 5;

