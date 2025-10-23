-- ============================================
-- CREATE HR EMPLOYEE ONBOARDING WORKFLOW
-- This matches the EXACT workflows table schema
-- ============================================

-- Step 1: Create Employee Onboarding Workflow
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
      "description": "Extract employee details from the onboarding request",
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
      "description": "Create company email account for new employee",
      "config": {
        "email_format": "{firstName}.{lastName}@company.com",
        "auto_generate": true,
        "send_credentials": true
      }
    },
    {
      "id": "node-3",
      "type": "action",
      "label": "Create HR Profile",
      "action": "create_hr_profile",
      "integration": "supabase",
      "position": { "x": 500, "y": 100 },
      "description": "Create employee profile in HR system",
      "config": {
        "table": "employees",
        "auto_id": true,
        "id_format": "EMP-{5digits}"
      }
    },
    {
      "id": "node-4",
      "type": "action",
      "label": "Setup Payroll",
      "action": "setup_payroll",
      "integration": "hr_system",
      "position": { "x": 700, "y": 100 },
      "description": "Configure payroll for new employee",
      "config": {
        "system": "default",
        "payment_method": "direct_deposit",
        "tax_forms_required": true
      }
    },
    {
      "id": "node-5",
      "type": "action",
      "label": "Send Welcome Email",
      "action": "send_welcome_email",
      "integration": "email",
      "position": { "x": 900, "y": 100 },
      "description": "Send welcome email with login credentials and first day info",
      "config": {
        "template": "employee_welcome",
        "include_credentials": true,
        "cc_manager": true,
        "attach_handbook": true
      }
    },
    {
      "id": "node-6",
      "type": "action",
      "label": "Schedule Orientation",
      "action": "schedule_orientation",
      "integration": "calendar",
      "position": { "x": 1100, "y": 100 },
      "description": "Schedule orientation and first day meetings",
      "config": {
        "duration_minutes": 60,
        "attendees": ["hr_team", "manager", "new_employee"],
        "meeting_type": "orientation"
      }
    },
    {
      "id": "node-7",
      "type": "condition",
      "label": "Is Executive Level?",
      "condition": "position_level",
      "position": { "x": 1300, "y": 100 },
      "description": "Check if executive-level onboarding is needed",
      "config": {
        "check_field": "position",
        "executive_titles": ["CEO", "CTO", "CFO", "COO", "VP", "Director"]
      }
    },
    {
      "id": "node-8",
      "type": "action",
      "label": "Executive Onboarding Package",
      "action": "executive_onboarding",
      "position": { "x": 1500, "y": 50 },
      "description": "Additional onboarding for executive roles",
      "config": {
        "include_board_intro": true,
        "equity_package": true,
        "executive_assistant_assignment": true
      }
    },
    {
      "id": "node-9",
      "type": "notification",
      "label": "Notify Team",
      "action": "send_announcement",
      "position": { "x": 1500, "y": 150 },
      "description": "Send new employee announcement to team",
      "config": {
        "channels": ["email", "slack"],
        "audience": "all_company"
      }
    }
  ]'::jsonb,
  '[
    {"from": "node-1", "to": "node-2"},
    {"from": "node-2", "to": "node-3"},
    {"from": "node-3", "to": "node-4"},
    {"from": "node-4", "to": "node-5"},
    {"from": "node-5", "to": "node-6"},
    {"from": "node-6", "to": "node-7"},
    {"from": "node-7", "to": "node-8", "condition": "true"},
    {"from": "node-7", "to": "node-9", "condition": "false"},
    {"from": "node-8", "to": "node-9"},
    {"from": "node-9", "to": "end"}
  ]'::jsonb
)
RETURNING id, name, jsonb_array_length(nodes) as node_count;

-- ============================================
-- Step 2: Link to HR Agent
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
RETURNING 
  agent_id,
  workflow_id,
  'Workflow linked successfully!' as status;

-- ============================================
-- Step 3: Verify Everything
-- ============================================

SELECT 
  a.name as "Agent Name",
  a.type as "Agent Type",
  w.name as "Workflow Name",
  jsonb_array_length(w.nodes) as "Total Nodes",
  jsonb_array_length(w.connections) as "Total Connections",
  'SUCCESS!' as "Status"
FROM agent_workflows aw
JOIN agents a ON aw.agent_id = a.id
JOIN workflows w ON aw.workflow_id = w.id
WHERE a.type = 'hr'
  AND w.name = 'Employee Onboarding';

-- ============================================
-- EXPECTED OUTPUT:
-- ============================================
-- Agent Name | Agent Type | Workflow Name       | Total Nodes | Status
-- HR Agent   | hr         | Employee Onboarding | 9           | SUCCESS!

-- ============================================
-- NEXT STEPS:
-- ============================================
-- 1. Refresh your browser: Ctrl + Shift + R
-- 2. Go to HR Agent chat
-- 3. Test: "Onboard Kishor Namburu as CEO starting tomorrow"
-- 4. Watch the workflow execute!

-- ============================================
-- TROUBLESHOOTING
-- ============================================

-- If no HR agent found:
SELECT COUNT(*) FROM agents WHERE type = 'hr';
-- If returns 0, you need to create an HR agent first

-- If workflow not triggering in chat:
-- The system will still execute the workflow, but you won't see
-- "Triggering workflow" message because we removed the triggers column.
-- The workflow will be matched by the agent's intelligent routing.

-- To check workflow is linked:
SELECT 
  COUNT(*) as workflow_links
FROM agent_workflows aw
JOIN agents a ON aw.agent_id = a.id
WHERE a.type = 'hr';
-- Should return 1 or more

