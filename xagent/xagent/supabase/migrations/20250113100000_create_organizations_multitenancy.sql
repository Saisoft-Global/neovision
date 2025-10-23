-- ============================================
-- ENTERPRISE MULTI-TENANCY: ORGANIZATIONS
-- ============================================
-- This migration creates a complete multi-tenant organization structure
-- for enterprise customers with full isolation and collaboration features

-- ============================================
-- 1. ORGANIZATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Information
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  display_name text,
  description text,
  logo_url text,
  website text,
  
  -- Plan & Billing
  plan text NOT NULL DEFAULT 'trial' CHECK (plan IN ('trial', 'starter', 'business', 'enterprise', 'custom')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial', 'cancelled')),
  trial_ends_at timestamptz,
  subscription_id text,
  
  -- Settings & Configuration
  settings jsonb DEFAULT '{
    "features": {
      "max_agents": 10,
      "max_workflows": 20,
      "max_users": 5,
      "max_storage_gb": 10,
      "ai_credits_monthly": 1000,
      "custom_llm_keys": true,
      "api_access": false,
      "priority_support": false,
      "sso_enabled": false
    },
    "branding": {
      "primary_color": "#6366f1",
      "custom_domain": null
    },
    "security": {
      "require_2fa": false,
      "ip_whitelist": [],
      "session_timeout_minutes": 480
    }
  }'::jsonb,
  
  -- Contact & Billing
  billing_email text,
  contact_name text,
  contact_phone text,
  address jsonb,
  
  -- Metadata
  metadata jsonb DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Indexes for common queries
  CONSTRAINT valid_slug CHECK (slug ~ '^[a-z0-9-]+$')
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON public.organizations(status);
CREATE INDEX IF NOT EXISTS idx_organizations_plan ON public.organizations(plan);
CREATE INDEX IF NOT EXISTS idx_organizations_created_at ON public.organizations(created_at);

-- ============================================
-- 2. ORGANIZATION MEMBERS (USER-ORG MAPPING)
-- ============================================
CREATE TABLE IF NOT EXISTS public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Role & Permissions
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'manager', 'member', 'viewer', 'guest')),
  permissions jsonb DEFAULT '{
    "agents": {"create": true, "read": true, "update": true, "delete": false, "share": true},
    "workflows": {"create": true, "read": true, "update": true, "delete": false, "share": true},
    "documents": {"upload": true, "read": true, "delete": false},
    "settings": {"view": true, "edit": false},
    "members": {"invite": false, "remove": false, "edit_roles": false},
    "billing": {"view": false, "edit": false}
  }'::jsonb,
  
  -- Status
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'invited', 'suspended')),
  invitation_token text,
  invitation_expires_at timestamptz,
  
  -- Metadata
  invited_by uuid REFERENCES auth.users(id),
  joined_at timestamptz DEFAULT now(),
  last_active_at timestamptz,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraints
  UNIQUE(organization_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON public.organization_members(role);
CREATE INDEX IF NOT EXISTS idx_org_members_status ON public.organization_members(status);
CREATE INDEX IF NOT EXISTS idx_org_members_invitation_token ON public.organization_members(invitation_token) WHERE invitation_token IS NOT NULL;

-- ============================================
-- 3. ORGANIZATION LLM SETTINGS
-- ============================================
CREATE TABLE IF NOT EXISTS public.organization_llm_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Provider API Keys (Organization-level)
  openai_api_key text,
  groq_api_key text,
  mistral_api_key text,
  anthropic_api_key text,
  google_api_key text,
  ollama_base_url text DEFAULT 'http://localhost:11434',
  
  -- Provider Configuration
  provider_preferences jsonb DEFAULT '{
    "openai": {"enabled": true, "priority": 5, "quota_percentage": 40},
    "groq": {"enabled": true, "priority": 1, "quota_percentage": 20},
    "mistral": {"enabled": true, "priority": 2, "quota_percentage": 15},
    "anthropic": {"enabled": true, "priority": 3, "quota_percentage": 15},
    "google": {"enabled": true, "priority": 4, "quota_percentage": 10}
  }'::jsonb,
  
  -- Usage Quotas & Limits
  monthly_request_quota integer DEFAULT 10000,
  monthly_token_quota bigint DEFAULT 1000000,
  current_requests integer DEFAULT 0,
  current_tokens bigint DEFAULT 0,
  quota_reset_at timestamptz DEFAULT date_trunc('month', now() + interval '1 month'),
  
  -- Cost Management
  cost_limit_monthly numeric(10, 2),
  current_cost_monthly numeric(10, 2) DEFAULT 0.00,
  alert_threshold_percentage integer DEFAULT 80,
  
  -- Policy
  allow_user_keys boolean DEFAULT true, -- Allow users to use their own API keys
  fallback_to_org_keys boolean DEFAULT true, -- Fallback to org keys if user keys fail
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(organization_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_org_llm_settings_org_id ON public.organization_llm_settings(organization_id);

-- ============================================
-- 4. ORGANIZATION USAGE TRACKING
-- ============================================
CREATE TABLE IF NOT EXISTS public.organization_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Usage Metrics
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  
  -- LLM Usage
  llm_requests integer DEFAULT 0,
  llm_tokens_used bigint DEFAULT 0,
  llm_cost numeric(10, 4) DEFAULT 0.0000,
  
  -- Resource Usage
  agents_created integer DEFAULT 0,
  workflows_executed integer DEFAULT 0,
  documents_processed integer DEFAULT 0,
  storage_used_mb numeric(12, 2) DEFAULT 0.00,
  
  -- User Activity
  active_users integer DEFAULT 0,
  total_messages integer DEFAULT 0,
  
  -- Provider Breakdown
  usage_by_provider jsonb DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(organization_id, period_start)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_org_usage_org_id ON public.organization_usage(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_usage_period ON public.organization_usage(period_start, period_end);

-- ============================================
-- 5. ORGANIZATION INVITATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.organization_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Invitation Details
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member',
  permissions jsonb,
  
  -- Token & Status
  token text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  
  -- Metadata
  invited_by uuid NOT NULL REFERENCES auth.users(id),
  accepted_by uuid REFERENCES auth.users(id),
  message text,
  
  -- Expiration
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_org_invitations_org_id ON public.organization_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_invitations_email ON public.organization_invitations(email);
CREATE INDEX IF NOT EXISTS idx_org_invitations_token ON public.organization_invitations(token);
CREATE INDEX IF NOT EXISTS idx_org_invitations_status ON public.organization_invitations(status);

-- ============================================
-- 6. ORGANIZATION AUDIT LOGS
-- ============================================
CREATE TABLE IF NOT EXISTS public.organization_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Actor
  user_id uuid REFERENCES auth.users(id),
  user_email text,
  
  -- Action
  action text NOT NULL, -- 'created', 'updated', 'deleted', 'invited', 'removed', etc.
  resource_type text NOT NULL, -- 'agent', 'workflow', 'member', 'settings', etc.
  resource_id text,
  
  -- Details
  changes jsonb, -- Before/after for updates
  metadata jsonb DEFAULT '{}'::jsonb,
  
  -- Context
  ip_address inet,
  user_agent text,
  
  -- Timestamp
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_org_audit_logs_org_id ON public.organization_audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_audit_logs_user_id ON public.organization_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_org_audit_logs_action ON public.organization_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_org_audit_logs_resource ON public.organization_audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_org_audit_logs_created_at ON public.organization_audit_logs(created_at);

-- ============================================
-- 7. ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_llm_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 8. RLS POLICIES - ORGANIZATIONS
-- ============================================

-- Organizations: Users can view organizations they belong to
CREATE POLICY "Users can view their organizations"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid() 
        AND status = 'active'
    )
  );

-- Organizations: Only owners and admins can update
CREATE POLICY "Owners and admins can update organizations"
  ON public.organizations FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid() 
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

-- Organizations: Authenticated users can create (for self-service signup)
CREATE POLICY "Authenticated users can create organizations"
  ON public.organizations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================
-- 9. RLS POLICIES - ORGANIZATION MEMBERS
-- ============================================

-- Members: Users can view members of their organizations
CREATE POLICY "Users can view org members"
  ON public.organization_members FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid() 
        AND status = 'active'
    )
  );

-- Members: Owners and admins can manage members
CREATE POLICY "Owners and admins can manage members"
  ON public.organization_members FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid() 
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

-- Members: Users can update their own membership
CREATE POLICY "Users can update their own membership"
  ON public.organization_members FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- 10. RLS POLICIES - ORGANIZATION LLM SETTINGS
-- ============================================

-- LLM Settings: Members can view their org's LLM settings
CREATE POLICY "Members can view org LLM settings"
  ON public.organization_llm_settings FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid() 
        AND status = 'active'
    )
  );

-- LLM Settings: Only owners and admins can modify
CREATE POLICY "Owners and admins can manage LLM settings"
  ON public.organization_llm_settings FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid() 
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

-- ============================================
-- 11. RLS POLICIES - USAGE TRACKING
-- ============================================

-- Usage: Members can view their org's usage
CREATE POLICY "Members can view org usage"
  ON public.organization_usage FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid() 
        AND status = 'active'
    )
  );

-- Usage: System can insert/update usage (via service role)
CREATE POLICY "System can manage usage"
  ON public.organization_usage FOR ALL
  TO authenticated
  USING (true);

-- ============================================
-- 12. RLS POLICIES - INVITATIONS
-- ============================================

-- Invitations: Members can view org invitations
CREATE POLICY "Members can view org invitations"
  ON public.organization_invitations FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid() 
        AND status = 'active'
    )
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Invitations: Admins can create invitations
CREATE POLICY "Admins can create invitations"
  ON public.organization_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid() 
        AND role IN ('owner', 'admin', 'manager')
        AND status = 'active'
    )
  );

-- Invitations: Users can update invitations (accept/decline)
CREATE POLICY "Users can update invitations"
  ON public.organization_invitations FOR UPDATE
  TO authenticated
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR organization_id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid() 
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

-- ============================================
-- 13. RLS POLICIES - AUDIT LOGS
-- ============================================

-- Audit Logs: Owners and admins can view audit logs
CREATE POLICY "Owners and admins can view audit logs"
  ON public.organization_audit_logs FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid() 
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

-- Audit Logs: System can insert audit logs
CREATE POLICY "System can insert audit logs"
  ON public.organization_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================
-- 14. HELPER FUNCTIONS
-- ============================================

-- Function to check if user has permission in organization
CREATE OR REPLACE FUNCTION public.user_has_org_permission(
  p_user_id uuid,
  p_organization_id uuid,
  p_permission_path text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_member_permissions jsonb;
  v_permission_value boolean;
BEGIN
  -- Get member permissions
  SELECT permissions INTO v_member_permissions
  FROM public.organization_members
  WHERE user_id = p_user_id 
    AND organization_id = p_organization_id
    AND status = 'active';
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Navigate JSON path and get boolean value
  v_permission_value := (v_member_permissions #>> string_to_array(p_permission_path, '.'))::boolean;
  
  RETURN COALESCE(v_permission_value, false);
END;
$$;

-- Function to get user's organizations
CREATE OR REPLACE FUNCTION public.get_user_organizations(p_user_id uuid)
RETURNS TABLE (
  organization_id uuid,
  organization_name text,
  organization_slug text,
  member_role text,
  member_status text,
  joined_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    o.slug,
    om.role,
    om.status,
    om.joined_at
  FROM public.organizations o
  INNER JOIN public.organization_members om ON o.id = om.organization_id
  WHERE om.user_id = p_user_id
    AND om.status = 'active'
    AND o.status = 'active'
  ORDER BY om.joined_at DESC;
END;
$$;

-- Function to reset monthly usage quotas
CREATE OR REPLACE FUNCTION public.reset_organization_usage_quotas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.organization_llm_settings
  SET 
    current_requests = 0,
    current_tokens = 0,
    current_cost_monthly = 0.00,
    quota_reset_at = date_trunc('month', now() + interval '1 month'),
    updated_at = now()
  WHERE quota_reset_at <= now();
END;
$$;

-- ============================================
-- 15. TRIGGERS
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organization_members_updated_at BEFORE UPDATE ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organization_llm_settings_updated_at BEFORE UPDATE ON public.organization_llm_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Automatically create LLM settings when organization is created
CREATE OR REPLACE FUNCTION public.create_org_llm_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.organization_llm_settings (organization_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_org_llm_settings_trigger AFTER INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.create_org_llm_settings();

-- ============================================
-- 16. COMMENTS
-- ============================================

COMMENT ON TABLE public.organizations IS 'Enterprise organizations/tenants for multi-tenancy';
COMMENT ON TABLE public.organization_members IS 'User membership in organizations with roles and permissions';
COMMENT ON TABLE public.organization_llm_settings IS 'Organization-level LLM API keys and quotas';
COMMENT ON TABLE public.organization_usage IS 'Track organization resource usage and costs';
COMMENT ON TABLE public.organization_invitations IS 'Pending invitations to join organizations';
COMMENT ON TABLE public.organization_audit_logs IS 'Audit trail of all organization activities';

COMMENT ON COLUMN public.organizations.plan IS 'Subscription plan: trial, starter, business, enterprise, custom';
COMMENT ON COLUMN public.organization_members.role IS 'Member role: owner, admin, manager, member, viewer, guest';
COMMENT ON COLUMN public.organization_members.permissions IS 'Granular permissions for this member';


