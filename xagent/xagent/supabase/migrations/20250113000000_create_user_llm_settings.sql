-- ============================================
-- Create User LLM Settings Table
-- ============================================
-- This migration creates a table for storing user-specific LLM API keys and preferences

-- Create user_llm_settings table
CREATE TABLE IF NOT EXISTS public.user_llm_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Provider-specific API keys (encrypted in production)
  openai_api_key text,
  groq_api_key text,
  mistral_api_key text,
  anthropic_api_key text,
  google_api_key text,
  
  -- User preferences
  default_provider text NOT NULL DEFAULT 'openai',
  enable_fallbacks boolean NOT NULL DEFAULT true,
  
  -- Provider preferences (JSONB for flexibility)
  provider_preferences jsonb DEFAULT '{
    "openai": {"enabled": true, "priority": 5},
    "groq": {"enabled": true, "priority": 1},
    "mistral": {"enabled": true, "priority": 2},
    "anthropic": {"enabled": true, "priority": 3},
    "google": {"enabled": true, "priority": 4}
  }'::jsonb,
  
  -- Task-specific overrides
  task_overrides jsonb DEFAULT '{
    "research": {"provider": "mistral", "model": "mistral-large-latest"},
    "writing": {"provider": "anthropic", "model": "claude-3-opus-20240229"},
    "coding": {"provider": "openai", "model": "gpt-4-turbo-preview"},
    "conversation": {"provider": "groq", "model": "llama3-8b-8192"},
    "translation": {"provider": "google", "model": "gemini-1.5-pro"}
  }'::jsonb,
  
  -- Usage tracking
  total_requests integer DEFAULT 0,
  last_used_at timestamptz,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraints
  UNIQUE(user_id),
  CONSTRAINT valid_default_provider CHECK (default_provider IN ('openai', 'groq', 'mistral', 'anthropic', 'google'))
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_llm_settings_user_id ON public.user_llm_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_llm_settings_default_provider ON public.user_llm_settings(default_provider);
CREATE INDEX IF NOT EXISTS idx_user_llm_settings_last_used ON public.user_llm_settings(last_used_at);

-- Enable Row Level Security
ALTER TABLE public.user_llm_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own LLM settings"
  ON public.user_llm_settings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own LLM settings"
  ON public.user_llm_settings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own LLM settings"
  ON public.user_llm_settings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own LLM settings"
  ON public.user_llm_settings FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_llm_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_update_user_llm_settings_updated_at
  BEFORE UPDATE ON public.user_llm_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_llm_settings_updated_at();

-- Create function to track usage
CREATE OR REPLACE FUNCTION track_llm_usage(user_uuid uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.user_llm_settings 
  SET 
    total_requests = total_requests + 1,
    last_used_at = now()
  WHERE user_id = user_uuid;
  
  -- If no settings exist, create default ones
  IF NOT FOUND THEN
    INSERT INTO public.user_llm_settings (user_id, default_provider)
    VALUES (user_uuid, 'openai')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE public.user_llm_settings IS 'User-specific LLM provider settings and API keys';
COMMENT ON COLUMN public.user_llm_settings.openai_api_key IS 'OpenAI API key (should be encrypted in production)';
COMMENT ON COLUMN public.user_llm_settings.groq_api_key IS 'Groq API key (should be encrypted in production)';
COMMENT ON COLUMN public.user_llm_settings.mistral_api_key IS 'Mistral API key (should be encrypted in production)';
COMMENT ON COLUMN public.user_llm_settings.anthropic_api_key IS 'Anthropic Claude API key (should be encrypted in production)';
COMMENT ON COLUMN public.user_llm_settings.google_api_key IS 'Google Gemini API key (should be encrypted in production)';
COMMENT ON COLUMN public.user_llm_settings.default_provider IS 'Default LLM provider for fallbacks';
COMMENT ON COLUMN public.user_llm_settings.enable_fallbacks IS 'Whether to use intelligent fallbacks';
COMMENT ON COLUMN public.user_llm_settings.provider_preferences IS 'User preferences for each provider (enabled/disabled, priority)';
COMMENT ON COLUMN public.user_llm_settings.task_overrides IS 'Task-specific provider and model overrides';
COMMENT ON COLUMN public.user_llm_settings.total_requests IS 'Total number of LLM requests made by user';
COMMENT ON COLUMN public.user_llm_settings.last_used_at IS 'Timestamp of last LLM request';


