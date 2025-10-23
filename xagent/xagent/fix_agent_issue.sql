-- FIX: Create HR Assistant Agent in Database
-- Run this in your Supabase SQL Editor

-- 1. Check if agent 1 exists
SELECT * FROM agents WHERE id = 1;

-- 2. If not, create it
INSERT INTO agents (
  id,
  name,
  type,
  description,
  personality,
  skills,
  created_at,
  updated_at,
  user_id
) VALUES (
  1,
  'HR Assistant',
  'hr',
  'Helpful HR assistant for employee queries',
  jsonb_build_object(
    'friendliness', 0.8,
    'formality', 0.6,
    'proactiveness', 0.7,
    'detail_orientation', 0.8
  ),
  jsonb_build_array(
    jsonb_build_object(
      'name', 'hr_policies',
      'level', 5,
      'config', jsonb_build_object(
        'description', 'Knowledge of HR policies and procedures'
      )
    ),
    jsonb_build_object(
      'name', 'employee_support',
      'level', 5,
      'config', jsonb_build_object(
        'description', 'Supporting employees with queries and concerns'
      )
    )
  ),
  NOW(),
  NOW(),
  (SELECT id FROM auth.users LIMIT 1)  -- Use your user ID
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  description = EXCLUDED.description,
  personality = EXCLUDED.personality,
  skills = EXCLUDED.skills,
  updated_at = NOW();

-- 3. Verify agent was created
SELECT id, name, type, description FROM agents WHERE id = 1;

