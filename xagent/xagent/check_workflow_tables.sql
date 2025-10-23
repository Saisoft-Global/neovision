-- Check if workflows table exists and its structure
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name IN ('workflow', 'workflows')
ORDER BY table_name, ordinal_position;

-- Check existing workflows
SELECT id, name, description, status, created_at
FROM workflows
LIMIT 10;

-- Check agent_workflows links
SELECT 
  aw.id,
  a.name as agent_name,
  a.type as agent_type,
  w.name as workflow_name
FROM agent_workflows aw
LEFT JOIN agents a ON aw.agent_id = a.id
LEFT JOIN workflows w ON aw.workflow_id = w.id
LIMIT 10;

