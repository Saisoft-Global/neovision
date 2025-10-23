-- ============================================
-- RUN THIS FIRST - Check Current Database State
-- ============================================
-- This will tell us what exists before we create anything

-- 1. Check if workflows table exists
SELECT 
  'workflows table exists' as status,
  COUNT(*) as total_workflows
FROM workflows;

-- 2. Check existing workflows
SELECT 
  id,
  name,
  description,
  status,
  jsonb_array_length(nodes) as node_count,
  jsonb_array_length(triggers) as trigger_count
FROM workflows
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check your HR agent
SELECT 
  id,
  name,
  type,
  status,
  config->'personality' as personality
FROM agents
WHERE type = 'hr' OR name ILIKE '%hr%'
ORDER BY created_at DESC
LIMIT 5;

-- 4. Check existing agent-workflow links
SELECT 
  aw.id as link_id,
  a.id as agent_id,
  a.name as agent_name,
  a.type as agent_type,
  w.id as workflow_id,
  w.name as workflow_name,
  w.status as workflow_status
FROM agent_workflows aw
JOIN agents a ON aw.agent_id = a.id
JOIN workflows w ON aw.workflow_id = w.id
ORDER BY aw.created_at DESC
LIMIT 10;

-- 5. Check if HR agent has any workflows
SELECT 
  a.name as agent_name,
  COUNT(aw.workflow_id) as workflow_count
FROM agents a
LEFT JOIN agent_workflows aw ON a.id = aw.agent_id
WHERE a.type = 'hr'
GROUP BY a.id, a.name;

-- ============================================
-- RESULTS INTERPRETATION:
-- ============================================
-- 
-- If total_workflows > 0: You have workflows, maybe missing links
-- If HR agent workflow_count = 0: Need to create and link workflow
-- If HR agent doesn't exist: Need to create HR agent first

