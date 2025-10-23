-- ============================================
-- SIMPLE HR ONBOARDING WORKFLOW SETUP
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Check if workflows table exists and show its structure
-- ============================================
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'workflows'
ORDER BY ordinal_position;

-- Step 2: Create minimal workflow (only required columns)
-- ============================================

INSERT INTO workflows (
  name,
  description,
  nodes,
  connections
)
VALUES (
  'Employee Onboarding',
  'Complete employee onboarding process - creates email, HR profile, payroll setup, and sends welcome communications',
  '[
    {
      "id": "node-1",
      "type": "action",
      "label": "Extract Employee Information",
      "action": "extract_employee_data",
      "position": { "x": 100, "y": 100 },
      "config": {
        "extract_fields": ["full_name", "position", "start_date", "department"]
      }
    },
    {
      "id": "node-2",
      "type": "action",
      "label": "Create Email Account",
      "action": "create_email_account",
      "position": { "x": 300, "y": 100 },
      "config": {
        "email_format": "{firstName}.{lastName}@company.com"
      }
    },
    {
      "id": "node-3",
      "type": "action",
      "label": "Create HR Profile",
      "action": "create_hr_profile",
      "position": { "x": 500, "y": 100 },
      "config": {
        "table": "employees"
      }
    },
    {
      "id": "node-4",
      "type": "action",
      "label": "Send Welcome Email",
      "action": "send_welcome_email",
      "position": { "x": 700, "y": 100 },
      "config": {
        "template": "employee_welcome"
      }
    }
  ]'::jsonb,
  '[
    {"from": "node-1", "to": "node-2"},
    {"from": "node-2", "to": "node-3"},
    {"from": "node-3", "to": "node-4"}
  ]'::jsonb
)
RETURNING id, name;

-- ⚠️ SAVE THE WORKFLOW ID FROM ABOVE!

-- Step 3: Get your HR Agent ID
-- ============================================

SELECT 
  id, 
  name, 
  type
FROM agents 
WHERE type = 'hr' OR name ILIKE '%hr%'
ORDER BY created_at DESC
LIMIT 5;

-- ⚠️ COPY YOUR HR AGENT ID!

-- Step 4: Link Workflow to HR Agent
-- ============================================

INSERT INTO agent_workflows (
  agent_id, 
  workflow_id
)
SELECT 
  a.id,
  w.id
FROM agents a, workflows w
WHERE a.type = 'hr'
  AND w.name = 'Employee Onboarding'
ON CONFLICT (agent_id, workflow_id) DO NOTHING
RETURNING *;

-- Step 5: Verify It Worked
-- ============================================

SELECT 
  a.name as agent_name,
  a.type as agent_type,
  w.name as workflow_name,
  w.description,
  jsonb_array_length(w.nodes) as node_count
FROM agent_workflows aw
JOIN agents a ON aw.agent_id = a.id
JOIN workflows w ON aw.workflow_id = w.id
WHERE a.type = 'hr';

-- Expected output:
-- agent_name | agent_type | workflow_name       | node_count
-- HR Agent   | hr         | Employee Onboarding | 4

-- ============================================
-- SUCCESS! 
-- ============================================
-- If you see the above output, the workflow is linked.
-- Now:
-- 1. Refresh your browser (Ctrl + Shift + R)
-- 2. Chat with HR agent: "Onboard John Doe as Manager"
-- 3. Watch it trigger the workflow!

