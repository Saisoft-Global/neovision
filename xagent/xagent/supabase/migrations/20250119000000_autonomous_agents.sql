-- Autonomous Agents Database Schema
-- Tables for autonomous operation, event-driven behavior, and goal persistence

-- ============================================
-- 1. AGENT_SCHEDULES TABLE
-- Stores autonomous scheduling configuration
-- ============================================
CREATE TABLE IF NOT EXISTS public.agent_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  agent_name text NOT NULL,
  schedule_type text NOT NULL CHECK (schedule_type IN ('interval', 'cron', 'event', 'continuous')),
  interval_ms integer,
  cron_expression text,
  event_type text,
  enabled boolean DEFAULT true,
  last_run timestamptz,
  next_run timestamptz,
  run_count integer DEFAULT 0,
  config jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for agent_schedules
CREATE INDEX IF NOT EXISTS idx_agent_schedules_agent_id ON public.agent_schedules(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_schedules_enabled ON public.agent_schedules(enabled);
CREATE INDEX IF NOT EXISTS idx_agent_schedules_schedule_type ON public.agent_schedules(schedule_type);

-- ============================================
-- 2. SYSTEM_EVENTS TABLE
-- Stores events that trigger agent reactions
-- ============================================
CREATE TABLE IF NOT EXISTS public.system_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  source text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}',
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  processed boolean DEFAULT false,
  processed_at timestamptz,
  timestamp timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Indexes for system_events
CREATE INDEX IF NOT EXISTS idx_system_events_type ON public.system_events(event_type);
CREATE INDEX IF NOT EXISTS idx_system_events_processed ON public.system_events(processed);
CREATE INDEX IF NOT EXISTS idx_system_events_timestamp ON public.system_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_events_priority ON public.system_events(priority);

-- ============================================
-- 3. AGENT_GOALS TABLE
-- Stores long-term goals that agents pursue
-- ============================================
CREATE TABLE IF NOT EXISTS public.agent_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  agent_name text NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  description text NOT NULL,
  goal_type text NOT NULL CHECK (goal_type IN ('task', 'project', 'learning', 'optimization', 'monitoring')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'abandoned')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  milestones jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  deadline timestamptz,
  completed_at timestamptz,
  metadata jsonb DEFAULT '{}'
);

-- Indexes for agent_goals
CREATE INDEX IF NOT EXISTS idx_agent_goals_agent_id ON public.agent_goals(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_goals_user_id ON public.agent_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_goals_status ON public.agent_goals(status);
CREATE INDEX IF NOT EXISTS idx_agent_goals_priority ON public.agent_goals(priority);
CREATE INDEX IF NOT EXISTS idx_agent_goals_deadline ON public.agent_goals(deadline);

-- ============================================
-- 4. GOAL_PROGRESS TABLE
-- Tracks progress updates on goals
-- ============================================
CREATE TABLE IF NOT EXISTS public.goal_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES public.agent_goals(id) ON DELETE CASCADE,
  timestamp timestamptz DEFAULT now(),
  progress integer NOT NULL CHECK (progress >= 0 AND progress <= 100),
  actions_taken jsonb DEFAULT '[]',
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Indexes for goal_progress
CREATE INDEX IF NOT EXISTS idx_goal_progress_goal_id ON public.goal_progress(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_progress_timestamp ON public.goal_progress(timestamp DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE public.agent_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_progress ENABLE ROW LEVEL SECURITY;

-- Agent Schedules Policies
CREATE POLICY "Users can view own agent schedules"
  ON public.agent_schedules FOR SELECT
  TO authenticated
  USING (true);  -- All authenticated users can view

CREATE POLICY "Users can create agent schedules"
  ON public.agent_schedules FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own agent schedules"
  ON public.agent_schedules FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete own agent schedules"
  ON public.agent_schedules FOR DELETE
  TO authenticated
  USING (true);

-- System Events Policies
CREATE POLICY "Users can view system events"
  ON public.system_events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can create events"
  ON public.system_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update events"
  ON public.system_events FOR UPDATE
  TO authenticated
  USING (true);

-- Agent Goals Policies
CREATE POLICY "Users can view own goals"
  ON public.agent_goals FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Users can create own goals"
  ON public.agent_goals FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can update own goals"
  ON public.agent_goals FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Users can delete own goals"
  ON public.agent_goals FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin');

-- Goal Progress Policies
CREATE POLICY "Users can view goal progress"
  ON public.goal_progress FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agent_goals
      WHERE id = goal_id
      AND (user_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin')
    )
  );

CREATE POLICY "System can insert goal progress"
  ON public.goal_progress FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================
-- GRANTS
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_schedules TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.system_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_goals TO authenticated;
GRANT SELECT, INSERT ON public.goal_progress TO authenticated;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE public.agent_schedules IS 'Stores autonomous scheduling configuration for AI agents';
COMMENT ON TABLE public.system_events IS 'Event queue for event-driven agent reactions';
COMMENT ON TABLE public.agent_goals IS 'Long-term goals that agents track and pursue';
COMMENT ON TABLE public.goal_progress IS 'Progress tracking for agent goals';

COMMENT ON COLUMN public.agent_schedules.schedule_type IS 'Type of schedule: interval, cron, event, or continuous';
COMMENT ON COLUMN public.system_events.priority IS 'Event priority: low, medium, high, or critical';
COMMENT ON COLUMN public.agent_goals.progress IS 'Goal completion percentage (0-100)';
COMMENT ON COLUMN public.agent_goals.milestones IS 'JSON array of goal milestones';

-- ============================================
-- 5. CUSTOMER_JOURNEYS TABLE
-- Tracks multi-turn conversations and user journeys
-- ============================================
CREATE TABLE IF NOT EXISTS public.customer_journeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  agent_id uuid NOT NULL,
  agent_name text NOT NULL,
  intent text NOT NULL,
  current_stage text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  context jsonb DEFAULT '{}',
  completed_steps jsonb DEFAULT '[]',
  pending_steps jsonb DEFAULT '[]',
  suggested_next_actions jsonb DEFAULT '[]',
  related_documents jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Indexes for customer_journeys
CREATE INDEX IF NOT EXISTS idx_customer_journeys_user_id ON public.customer_journeys(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_journeys_agent_id ON public.customer_journeys(agent_id);
CREATE INDEX IF NOT EXISTS idx_customer_journeys_status ON public.customer_journeys(status);
CREATE INDEX IF NOT EXISTS idx_customer_journeys_intent ON public.customer_journeys(intent);

-- Enable RLS
ALTER TABLE public.customer_journeys ENABLE ROW LEVEL SECURITY;

-- Customer Journeys Policies
CREATE POLICY "Users can view own journeys"
  ON public.customer_journeys FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Users can create own journeys"
  ON public.customer_journeys FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own journeys"
  ON public.customer_journeys FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Users can delete own journeys"
  ON public.customer_journeys FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin');

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_journeys TO authenticated;

-- Comments
COMMENT ON TABLE public.customer_journeys IS 'Tracks multi-turn conversations and user journeys across all agents';
COMMENT ON COLUMN public.customer_journeys.intent IS 'Primary intent or goal of the journey';
COMMENT ON COLUMN public.customer_journeys.current_stage IS 'Current stage in the journey (e.g., information_gathering, action_execution)';
COMMENT ON COLUMN public.customer_journeys.completed_steps IS 'JSON array of completed journey steps';
COMMENT ON COLUMN public.customer_journeys.suggested_next_actions IS 'JSON array of suggested next actions';

