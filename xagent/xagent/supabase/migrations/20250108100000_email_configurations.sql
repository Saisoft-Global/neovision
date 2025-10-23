-- Email Configurations Table
CREATE TABLE IF NOT EXISTS email_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Provider info
  provider TEXT NOT NULL CHECK (provider IN ('gmail', 'outlook', 'imap', 'custom')),
  display_name TEXT NOT NULL,
  
  -- Basic settings
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  
  -- IMAP settings (encrypted)
  imap_host TEXT,
  imap_port INTEGER,
  imap_secure BOOLEAN DEFAULT true,
  imap_username TEXT,
  imap_password TEXT, -- Encrypted
  
  -- SMTP settings (encrypted)
  smtp_host TEXT,
  smtp_port INTEGER,
  smtp_secure BOOLEAN DEFAULT true,
  smtp_username TEXT,
  smtp_password TEXT, -- Encrypted
  
  -- OAuth settings (encrypted)
  oauth_provider TEXT CHECK (oauth_provider IN ('google', 'microsoft')),
  oauth_access_token TEXT, -- Encrypted
  oauth_refresh_token TEXT, -- Encrypted
  oauth_token_expiry TIMESTAMPTZ,
  
  -- AI Features
  auto_processing BOOLEAN DEFAULT true,
  auto_response BOOLEAN DEFAULT false,
  daily_summary BOOLEAN DEFAULT true,
  proactive_outreach BOOLEAN DEFAULT true,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
  last_sync TIMESTAMPTZ,
  last_error TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, email)
);

-- Enable RLS
ALTER TABLE email_configurations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own email configurations"
  ON email_configurations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own email configurations"
  ON email_configurations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own email configurations"
  ON email_configurations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own email configurations"
  ON email_configurations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_email_configurations_user_id ON email_configurations(user_id);
CREATE INDEX idx_email_configurations_status ON email_configurations(status);
CREATE INDEX idx_email_configurations_provider ON email_configurations(provider);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_email_configurations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_email_configurations_updated_at
  BEFORE UPDATE ON email_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_email_configurations_updated_at();

-- Email Processing Log
CREATE TABLE IF NOT EXISTS email_processing_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  configuration_id UUID REFERENCES email_configurations(id) ON DELETE CASCADE,
  email_id TEXT NOT NULL,
  
  -- Processing details
  action TEXT NOT NULL, -- 'classified', 'responded', 'task_created', 'meeting_scheduled'
  classification JSONB,
  response_generated TEXT,
  tasks_created JSONB,
  
  -- Performance
  processing_time_ms INTEGER,
  confidence FLOAT,
  
  -- Status
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'error', 'skipped')),
  error_message TEXT,
  
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE email_processing_log ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Users can view own email processing logs"
  ON email_processing_log FOR SELECT
  TO authenticated
  USING (
    configuration_id IN (
      SELECT id FROM email_configurations WHERE user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_email_processing_log_config ON email_processing_log(configuration_id);
CREATE INDEX idx_email_processing_log_date ON email_processing_log(processed_at);
CREATE INDEX idx_email_processing_log_action ON email_processing_log(action);
