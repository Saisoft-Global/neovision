-- Collective Learning System
-- Enables ALL agents to learn from interactions and share experiences
-- Creates distributed collective intelligence

-- ============================================
-- COLLECTIVE_LEARNINGS TABLE
-- Central repository of all agent learnings
-- ============================================
CREATE TABLE IF NOT EXISTS public.collective_learnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  agent_type text NOT NULL,
  agent_name text NOT NULL,
  learning_type text NOT NULL CHECK (learning_type IN ('success_pattern', 'failure_pattern', 'optimization', 'insight', 'best_practice')),
  domain text NOT NULL,
  skill text,
  pattern_description text NOT NULL,
  context jsonb DEFAULT '{}',
  solution text,
  success_rate float NOT NULL CHECK (success_rate >= 0 AND success_rate <= 1),
  confidence float NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  applicable_to text[] NOT NULL,
  impact_metrics jsonb DEFAULT '{}',
  examples text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  usage_count integer DEFAULT 0,
  last_used timestamptz,
  validated_by text[] DEFAULT '{}'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_collective_learnings_agent_type ON public.collective_learnings(agent_type);
CREATE INDEX IF NOT EXISTS idx_collective_learnings_domain ON public.collective_learnings(domain);
CREATE INDEX IF NOT EXISTS idx_collective_learnings_skill ON public.collective_learnings(skill);
CREATE INDEX IF NOT EXISTS idx_collective_learnings_learning_type ON public.collective_learnings(learning_type);
CREATE INDEX IF NOT EXISTS idx_collective_learnings_success_rate ON public.collective_learnings(success_rate DESC);
CREATE INDEX IF NOT EXISTS idx_collective_learnings_usage_count ON public.collective_learnings(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_collective_learnings_applicable_to ON public.collective_learnings USING GIN(applicable_to);
CREATE INDEX IF NOT EXISTS idx_collective_learnings_created_at ON public.collective_learnings(created_at DESC);

-- Full text search on pattern descriptions
CREATE INDEX IF NOT EXISTS idx_collective_learnings_pattern_search 
  ON public.collective_learnings USING gin(to_tsvector('english', pattern_description));

-- ============================================
-- AGENT_LEARNING_PROFILES TABLE
-- Tracks individual agent learning statistics
-- ============================================
CREATE TABLE IF NOT EXISTS public.agent_learning_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL UNIQUE,
  agent_type text NOT NULL,
  agent_name text NOT NULL,
  total_interactions integer DEFAULT 0,
  successful_interactions integer DEFAULT 0,
  failed_interactions integer DEFAULT 0,
  avg_confidence float DEFAULT 0,
  avg_response_time_ms float DEFAULT 0,
  learnings_contributed integer DEFAULT 0,
  learnings_applied integer DEFAULT 0,
  success_rate float GENERATED ALWAYS AS (
    CASE 
      WHEN total_interactions > 0 
      THEN successful_interactions::float / total_interactions 
      ELSE 0 
    END
  ) STORED,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_learning_profiles_agent_id ON public.agent_learning_profiles(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_learning_profiles_agent_type ON public.agent_learning_profiles(agent_type);
CREATE INDEX IF NOT EXISTS idx_agent_learning_profiles_success_rate ON public.agent_learning_profiles(success_rate DESC);

-- ============================================
-- LEARNING_APPLICATION_LOG TABLE
-- Tracks when learnings are applied
-- ============================================
CREATE TABLE IF NOT EXISTS public.learning_application_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learning_id uuid NOT NULL REFERENCES public.collective_learnings(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL,
  agent_name text NOT NULL,
  context text NOT NULL,
  result text,
  improved_outcome boolean DEFAULT false,
  applied_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_learning_application_log_learning_id ON public.learning_application_log(learning_id);
CREATE INDEX IF NOT EXISTS idx_learning_application_log_agent_id ON public.learning_application_log(agent_id);
CREATE INDEX IF NOT EXISTS idx_learning_application_log_applied_at ON public.learning_application_log(applied_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE public.collective_learnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_learning_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_application_log ENABLE ROW LEVEL SECURITY;

-- Collective Learnings Policies (Shared across organization)
CREATE POLICY "All authenticated users can view collective learnings"
  ON public.collective_learnings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Agents can create learnings"
  ON public.collective_learnings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Agents can update their own learnings"
  ON public.collective_learnings FOR UPDATE
  TO authenticated
  USING (true);

-- Agent Learning Profiles Policies
CREATE POLICY "Users can view all agent learning profiles"
  ON public.agent_learning_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can create/update learning profiles"
  ON public.agent_learning_profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update learning profiles"
  ON public.agent_learning_profiles FOR UPDATE
  TO authenticated
  USING (true);

-- Learning Application Log Policies
CREATE POLICY "Users can view learning application logs"
  ON public.learning_application_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert application logs"
  ON public.learning_application_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================
-- GRANTS
-- ============================================
GRANT SELECT, INSERT, UPDATE ON public.collective_learnings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.agent_learning_profiles TO authenticated;
GRANT SELECT, INSERT ON public.learning_application_log TO authenticated;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update agent learning profile
CREATE OR REPLACE FUNCTION public.update_agent_learning_profile(
  p_agent_id uuid,
  p_agent_type text,
  p_agent_name text,
  p_success boolean,
  p_confidence float,
  p_response_time_ms float
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.agent_learning_profiles (
    agent_id, agent_type, agent_name, 
    total_interactions, successful_interactions, failed_interactions,
    avg_confidence, avg_response_time_ms
  ) VALUES (
    p_agent_id, p_agent_type, p_agent_name,
    1,
    CASE WHEN p_success THEN 1 ELSE 0 END,
    CASE WHEN p_success THEN 0 ELSE 1 END,
    p_confidence,
    p_response_time_ms
  )
  ON CONFLICT (agent_id) DO UPDATE SET
    total_interactions = agent_learning_profiles.total_interactions + 1,
    successful_interactions = agent_learning_profiles.successful_interactions + 
      CASE WHEN p_success THEN 1 ELSE 0 END,
    failed_interactions = agent_learning_profiles.failed_interactions + 
      CASE WHEN p_success THEN 0 ELSE 1 END,
    avg_confidence = (
      (agent_learning_profiles.avg_confidence * agent_learning_profiles.total_interactions) + p_confidence
    ) / (agent_learning_profiles.total_interactions + 1),
    avg_response_time_ms = (
      (agent_learning_profiles.avg_response_time_ms * agent_learning_profiles.total_interactions) + p_response_time_ms
    ) / (agent_learning_profiles.total_interactions + 1),
    updated_at = now();
END;
$$;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE public.collective_learnings IS 'Central repository of learnings from all agents - enables collective intelligence';
COMMENT ON TABLE public.agent_learning_profiles IS 'Individual agent learning statistics and performance metrics';
COMMENT ON TABLE public.learning_application_log IS 'Tracks when and how learnings are applied by agents';

COMMENT ON COLUMN public.collective_learnings.applicable_to IS 'Array of agent types that can benefit from this learning';
COMMENT ON COLUMN public.collective_learnings.success_rate IS 'How often this pattern leads to success (0.0-1.0)';
COMMENT ON COLUMN public.collective_learnings.confidence IS 'Confidence in this learning (0.0-1.0)';
COMMENT ON COLUMN public.collective_learnings.impact_metrics IS 'Measurable impact (time_saved, accuracy_improved, cost_reduced)';
COMMENT ON COLUMN public.collective_learnings.validated_by IS 'Array of agent IDs that have validated this learning';

-- ============================================
-- INITIAL SEED DATA (Common Patterns)
-- ============================================

-- Seed some universal best practices
INSERT INTO public.collective_learnings (
  agent_id, agent_type, agent_name, learning_type, domain, 
  pattern_description, context, solution, success_rate, confidence, applicable_to
) VALUES
  (
    gen_random_uuid(), 'all', 'System', 'best_practice', 'form_filling',
    'Always validate input before submitting forms',
    '{"tip": "Prevents errors and improves success rate"}',
    'Validate all required fields, check formats, confirm with user',
    0.95, 0.9, ARRAY['hr', 'finance', 'it', 'support', 'sales']
  ),
  (
    gen_random_uuid(), 'all', 'System', 'best_practice', 'api_calls',
    'Retry failed API calls with exponential backoff',
    '{"tip": "Handles temporary network issues"}',
    'Wait 1s, 2s, 4s, 8s before each retry. Max 4 retries.',
    0.90, 0.95, ARRAY['hr', 'finance', 'it', 'support', 'sales', 'email', 'productivity']
  ),
  (
    gen_random_uuid(), 'all', 'System', 'best_practice', 'email_processing',
    'Check for urgency indicators in email subject and body',
    '{"keywords": ["urgent", "asap", "immediately", "critical"]}',
    'Prioritize emails with urgency keywords. Response time < 1 hour.',
    0.88, 0.85, ARRAY['email', 'support', 'productivity', 'sales']
  ),
  (
    gen_random_uuid(), 'all', 'System', 'optimization', 'workflow_execution',
    'Execute independent workflow steps in parallel',
    '{"tip": "Reduces total execution time significantly"}',
    'Use Promise.all() for independent steps. Can reduce time by 40-60%.',
    0.92, 0.9, ARRAY['hr', 'finance', 'it', 'support', 'sales', 'productivity']
  )
ON CONFLICT DO NOTHING;


