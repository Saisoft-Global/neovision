-- ============================================
-- FIX HR AGENT - ADD ONBOARDING WORKFLOW
-- Run this SQL in Supabase SQL Editor
-- ============================================

-- STEP 1: Create Employee Onboarding Workflow
-- ============================================

INSERT INTO workflow (
  id,
  name,
  description,
  nodes,
  connections,
  created_at,
  updated_at
)
VALUES (
  'f7b3c4a0-8912-4d5e-b6f1-234567890abc'::uuid,
  'Employee Onboarding',
  'Complete employee onboarding process including email creation, HR profile setup, payroll configuration, and welcome communications',
  '[
    {
      "id": "node-1",
      "type": "action",
      "action": "create_email",
      "integration": "google_workspace",
      "name": "Create Email Account",
      "config": {
        "email_template": "{firstName}.{lastName}@company.com",
        "email_format": "lowercase"
      }
    },
    {
      "id": "node-2",
      "type": "action",
      "action": "create_hr_profile",
      "integration": "hr_system",
      "name": "Create HR Profile",
      "config": {
        "system": "workday",
        "auto_generate_id": true,
        "id_format": "EMP-{5digits}"
      }
    },
    {
      "id": "node-3",
      "type": "action",
      "action": "setup_payroll",
      "integration": "payroll",
      "name": "Setup Payroll",
      "config": {
        "system": "adp",
        "auto_enroll": true,
        "payment_method": "direct_deposit"
      }
    },
    {
      "id": "node-4",
      "type": "action",
      "action": "send_welcome_email",
      "integration": "email",
      "name": "Send Welcome Email",
      "config": {
        "template": "welcome_new_employee",
        "include_login_instructions": true,
        "cc_hr_team": true
      }
    }
  ]'::jsonb,
  '[
    {"from": "node-1", "to": "node-2"},
    {"from": "node-2", "to": "node-3"},
    {"from": "node-3", "to": "node-4"}
  ]'::jsonb,
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  nodes = EXCLUDED.nodes,
  connections = EXCLUDED.connections,
  updated_at = now();

-- Verify workflow created
SELECT id, name, description FROM workflow WHERE name = 'Employee Onboarding';


-- STEP 2: Link Workflow to HR Agent
-- ============================================

-- First, let's find your HR agent
DO $$
DECLARE
  v_agent_id uuid;
  v_workflow_id uuid;
BEGIN
  -- Get HR agent ID
  SELECT id INTO v_agent_id 
  FROM agents 
  WHERE name ILIKE '%HR%' OR type = 'hr'
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Get workflow ID
  SELECT id INTO v_workflow_id
  FROM workflow
  WHERE name = 'Employee Onboarding';
  
  -- Link them
  IF v_agent_id IS NOT NULL AND v_workflow_id IS NOT NULL THEN
    INSERT INTO agent_workflows (agent_id, workflow_id, created_at)
    VALUES (v_agent_id, v_workflow_id, now())
    ON CONFLICT (agent_id, workflow_id) DO NOTHING;
    
    RAISE NOTICE 'SUCCESS! Linked workflow to agent: % -> %', v_agent_id, v_workflow_id;
  ELSE
    RAISE NOTICE 'ERROR: Could not find HR agent or workflow';
  END IF;
END $$;

-- Verify the link
SELECT 
  a.id as agent_id,
  a.name as agent_name,
  w.id as workflow_id,
  w.name as workflow_name,
  aw.created_at
FROM agent_workflows aw
JOIN agents a ON a.id = aw.agent_id
JOIN workflow w ON w.id = aw.workflow_id
WHERE a.name ILIKE '%HR%' OR a.type = 'hr';


-- STEP 3: Add More HR Workflows (Optional)
-- ============================================

-- Leave Request Workflow
INSERT INTO workflow (
  id,
  name,
  description,
  nodes,
  connections,
  created_at,
  updated_at
)
VALUES (
  'e5c8d2b1-7823-4f6a-a5e2-123456789def'::uuid,
  'Process Leave Request',
  'Handle employee leave requests including approval, calendar updates, and notifications',
  '[
    {
      "id": "node-1",
      "type": "action",
      "action": "check_leave_balance",
      "integration": "hr_system",
      "name": "Check Leave Balance"
    },
    {
      "id": "node-2",
      "type": "condition",
      "condition": "balance_sufficient",
      "name": "Sufficient Balance?"
    },
    {
      "id": "node-3",
      "type": "action",
      "action": "update_calendar",
      "integration": "google_workspace",
      "name": "Update Calendar"
    },
    {
      "id": "node-4",
      "type": "action",
      "action": "send_approval",
      "integration": "email",
      "name": "Send Approval Email"
    }
  ]'::jsonb,
  '[
    {"from": "node-1", "to": "node-2"},
    {"from": "node-2", "to": "node-3", "condition": "true"},
    {"from": "node-3", "to": "node-4"}
  ]'::jsonb,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

-- Link leave request workflow to HR agent
DO $$
DECLARE
  v_agent_id uuid;
  v_workflow_id uuid;
BEGIN
  SELECT id INTO v_agent_id 
  FROM agents 
  WHERE name ILIKE '%HR%' OR type = 'hr'
  ORDER BY created_at DESC
  LIMIT 1;
  
  SELECT id INTO v_workflow_id
  FROM workflow
  WHERE name = 'Process Leave Request';
  
  IF v_agent_id IS NOT NULL AND v_workflow_id IS NOT NULL THEN
    INSERT INTO agent_workflows (agent_id, workflow_id, created_at)
    VALUES (v_agent_id, v_workflow_id, now())
    ON CONFLICT (agent_id, workflow_id) DO NOTHING;
    
    RAISE NOTICE 'SUCCESS! Linked leave workflow to agent';
  END IF;
END $$;


-- STEP 4: Final Verification
-- ============================================

-- Show all workflows linked to HR agent
SELECT 
  a.name as agent_name,
  COUNT(aw.workflow_id) as workflow_count,
  ARRAY_AGG(w.name) as workflows
FROM agents a
LEFT JOIN agent_workflows aw ON a.id = aw.agent_id
LEFT JOIN workflow w ON w.id = aw.workflow_id
WHERE a.name ILIKE '%HR%' OR a.type = 'hr'
GROUP BY a.id, a.name;

-- ============================================
-- EXPECTED OUTPUT:
-- ============================================
-- agent_name       | workflow_count | workflows
-- HR Assistant     | 2              | {Employee Onboarding, Process Leave Request}
-- ============================================

-- ============================================
-- AFTER RUNNING THIS:
-- ============================================
-- 1. Refresh your browser
-- 2. Go to HR Assistant chat
-- 3. Say: "Onboard Kishor Namburu as CTO"
-- 4. Agent will execute workflow and create accounts!
-- ============================================

-- ============================================
-- TROUBLESHOOTING:
-- ============================================

-- If you get "relation does not exist" errors, check table names:
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%workflow%';

-- If agent_workflows doesn't exist, create it:
-- CREATE TABLE IF NOT EXISTS agent_workflows (
--   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--   agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
--   workflow_id uuid NOT NULL REFERENCES workflow(id) ON DELETE CASCADE,
--   created_at timestamptz DEFAULT now(),
--   UNIQUE(agent_id, workflow_id)
-- );

