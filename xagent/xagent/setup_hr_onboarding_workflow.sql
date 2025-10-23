-- ============================================
-- SETUP HR AGENT WITH EMPLOYEE ONBOARDING WORKFLOW
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Create Employee Onboarding Workflow
-- ============================================

INSERT INTO workflows (
  id,
  name,
  description,
  nodes,
  connections,
  triggers,
  status,
  created_at,
  updated_at
)
VALUES (
  gen_random_uuid(),
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
        "extract_fields": ["full_name", "position", "start_date", "department", "email", "salary"]
      }
    },
    {
      "id": "node-2",
      "type": "action",
      "label": "Create Email Account",
      "action": "create_email_account",
      "integration": "email",
      "position": { "x": 300, "y": 100 },
      "config": {
        "email_format": "{firstName}.{lastName}@company.com",
        "auto_generate": true
      }
    },
    {
      "id": "node-3",
      "type": "action",
      "label": "Create HR Profile",
      "action": "create_hr_profile",
      "integration": "supabase",
      "position": { "x": 500, "y": 100 },
      "config": {
        "table": "employees",
        "auto_id": true
      }
    },
    {
      "id": "node-4",
      "type": "action",
      "label": "Setup Payroll",
      "action": "setup_payroll",
      "integration": "hr_system",
      "position": { "x": 700, "y": 100 },
      "config": {
        "system": "default",
        "payment_method": "direct_deposit"
      }
    },
    {
      "id": "node-5",
      "type": "action",
      "label": "Send Welcome Email",
      "action": "send_welcome_email",
      "integration": "email",
      "position": { "x": 900, "y": 100 },
      "config": {
        "template": "employee_welcome",
        "include_credentials": true,
        "cc_manager": true
      }
    },
    {
      "id": "node-6",
      "type": "action",
      "label": "Schedule Orientation",
      "action": "schedule_orientation",
      "integration": "calendar",
      "position": { "x": 1100, "y": 100 },
      "config": {
        "duration_minutes": 60,
        "attendees": ["hr_team", "manager", "new_employee"]
      }
    }
  ]'::jsonb,
  '[
    {"from": "node-1", "to": "node-2"},
    {"from": "node-2", "to": "node-3"},
    {"from": "node-3", "to": "node-4"},
    {"from": "node-4", "to": "node-5"},
    {"from": "node-5", "to": "node-6"}
  ]'::jsonb,
  '[
    {
      "type": "keyword",
      "keywords": ["onboard", "hire", "new employee", "join", "joining", "start", "starting"],
      "confidence_threshold": 0.7
    },
    {
      "type": "pattern",
      "pattern": "onboard .* as .*",
      "confidence_threshold": 0.8
    },
    {
      "type": "intent",
      "intents": ["employee_onboarding", "new_hire", "staff_addition"],
      "confidence_threshold": 0.75
    }
  ]'::jsonb,
  'active',
  now(),
  now()
)
RETURNING id, name;

-- ⚠️ SAVE THE WORKFLOW ID FROM ABOVE!
-- You'll need it for the next step

-- Step 2: Find your HR Agent ID
-- ============================================

SELECT 
  id, 
  name, 
  type,
  config->>'personality' as personality
FROM agents 
WHERE type = 'hr' OR name ILIKE '%hr%'
ORDER BY created_at DESC
LIMIT 5;

-- ⚠️ COPY YOUR HR AGENT ID FROM ABOVE!

-- Step 3: Link Workflow to HR Agent
-- ============================================
-- Replace 'YOUR_HR_AGENT_ID' with the ID from Step 2
-- Replace 'YOUR_WORKFLOW_ID' with the ID from Step 1

INSERT INTO agent_workflows (
  agent_id, 
  workflow_id,
  created_at
)
SELECT 
  a.id,
  w.id,
  now()
FROM agents a, workflows w
WHERE a.type = 'hr'  -- Or use: a.id = 'YOUR_HR_AGENT_ID'
  AND w.name = 'Employee Onboarding'
ON CONFLICT (agent_id, workflow_id) DO NOTHING;

-- Step 4: Verify the Link
-- ============================================

SELECT 
  a.name as agent_name,
  a.type as agent_type,
  w.name as workflow_name,
  w.description,
  jsonb_array_length(w.triggers) as trigger_count,
  jsonb_array_length(w.nodes) as node_count
FROM agent_workflows aw
JOIN agents a ON aw.agent_id = a.id
JOIN workflows w ON aw.workflow_id = w.id
WHERE a.type = 'hr';

-- Expected output:
-- agent_name | agent_type | workflow_name | node_count
-- HR Agent   | hr         | Employee Onboarding | 6

-- Step 5: Test Workflow Triggers
-- ============================================

SELECT 
  name,
  description,
  triggers
FROM workflows
WHERE name = 'Employee Onboarding';

-- Should show triggers like:
-- - Keywords: "onboard", "hire", "new employee"
-- - Pattern: "onboard .* as .*"

-- ============================================
-- DONE! Now test in the chat interface
-- ============================================

-- Test message:
-- "Onboard Kishor Namburu as CEO starting tomorrow"

-- Expected result:
-- ✅ Workflow matched: Employee Onboarding (confidence: 0.92)
-- ✅ Executing workflow nodes...
-- ✅ Employee onboarding completed

-- ============================================
-- TROUBLESHOOTING
-- ============================================

-- If workflow not triggering, check:

-- 1. Workflow exists and is active
SELECT id, name, status FROM workflows WHERE name = 'Employee Onboarding';

-- 2. Agent has workflow linked
SELECT COUNT(*) as link_count 
FROM agent_workflows 
WHERE agent_id = (SELECT id FROM agents WHERE type = 'hr' LIMIT 1);

-- 3. Triggers are properly configured
SELECT 
  name,
  triggers->0->>'keywords' as keywords,
  triggers->0->>'confidence_threshold' as threshold
FROM workflows
WHERE name = 'Employee Onboarding';

