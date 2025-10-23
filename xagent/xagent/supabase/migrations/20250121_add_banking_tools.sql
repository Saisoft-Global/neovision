-- =====================================================
-- ADD BANKING API TOOLS TO EXISTING TOOLS TABLE
-- Purpose: Add HDFC and ICICI banking tools to existing tools table
-- =====================================================

-- Insert HDFC Bank API Tool (using UUID)
INSERT INTO public.tools (id, name, description, type, config, is_active, is_system_tool)
VALUES (
  '550e8400-e29b-41d4-a716-446655440001'::uuid,  -- Fixed UUID for HDFC
  'HDFC Bank API',
  'Core banking API tool for HDFC Bank operations including account balance, card services, and loan eligibility',
  'custom',
  '{
    "name": "HDFC Bank API",
    "description": "Core banking API tool for HDFC Bank",
    "version": "1.0.0",
    "baseUrl": "${HDFC_API_URL}",
    "authentication": {
      "type": "bearer",
      "tokenEnvVar": "HDFC_API_KEY"
    },
    "skills": [
      {
        "id": "hdfc_get_balance",
        "name": "get_account_balance",
        "description": "Get account balance for a customer",
        "request": {
          "endpoint": "/accounts/{account_id}/balance",
          "method": "GET"
        },
        "method": "GET",
        "parameters": [
          {"name": "account_id", "type": "string", "required": true, "description": "Customer account number"}
        ],
        "useBrowserFallback": true,
        "browserFallbackConfig": {
          "searchQuery": "HDFC netbanking login check balance",
          "targetDomain": "netbanking.hdfcbank.com"
        }
      },
      {
        "id": "hdfc_block_card",
        "name": "block_card",
        "description": "Block a customer card (debit/credit)",
        "request": {
          "endpoint": "/cards/{card_id}/block",
          "method": "POST"
        },
        "method": "POST",
        "parameters": [
          {"name": "card_id", "type": "string", "required": true, "description": "Card number (last 4 digits)"},
          {"name": "reason", "type": "string", "required": true, "description": "Reason for blocking"}
        ],
        "useBrowserFallback": true
      },
      {
        "id": "hdfc_loan_eligibility",
        "name": "check_loan_eligibility",
        "description": "Check loan eligibility for a customer",
        "request": {
          "endpoint": "/loans/eligibility",
          "method": "POST"
        },
        "method": "POST",
        "parameters": [
          {"name": "customer_id", "type": "string", "required": true},
          {"name": "loan_type", "type": "string", "required": true},
          {"name": "loan_amount", "type": "number", "required": true}
        ],
        "useBrowserFallback": true
      }
    ]
  }'::jsonb,
  true,
  false  -- is_system_tool = false (custom tool)
) ON CONFLICT (id) DO UPDATE
SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  config = EXCLUDED.config,
  updated_at = NOW();

-- Insert ICICI Bank API Tool (using UUID)
INSERT INTO public.tools (id, name, description, type, config, is_active, is_system_tool)
VALUES (
  '550e8400-e29b-41d4-a716-446655440002'::uuid,  -- Fixed UUID for ICICI
  'ICICI Bank API',
  'Core banking API tool for ICICI Bank operations',
  'custom',
  '{
    "name": "ICICI Bank API",
    "description": "Core banking API tool for ICICI Bank",
    "version": "1.0.0",
    "baseUrl": "${ICICI_API_URL}",
    "authentication": {
      "type": "bearer",
      "tokenEnvVar": "ICICI_API_KEY"
    },
    "skills": [
      {
        "id": "icici_get_balance",
        "name": "get_account_balance",
        "description": "Get account balance for ICICI customer",
        "request": {
          "endpoint": "/api/v1/accounts/{account_id}/balance",
          "method": "GET"
        },
        "method": "GET",
        "parameters": [
          {"name": "account_id", "type": "string", "required": true}
        ],
        "useBrowserFallback": true,
        "browserFallbackConfig": {
          "searchQuery": "ICICI netbanking login",
          "targetDomain": "retail.onlineicicibank.com"
        }
      }
    ]
  }'::jsonb,
  true,
  false  -- is_system_tool = false (custom tool)
) ON CONFLICT (id) DO UPDATE
SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  config = EXCLUDED.config,
  updated_at = NOW();

-- Verify insertion
SELECT id, name, type, is_active 
FROM public.tools 
WHERE id IN (
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  '550e8400-e29b-41d4-a716-446655440002'::uuid
);

-- Comment
COMMENT ON TABLE public.tools IS 'Global tool registry including banking APIs, CRM, email, and custom tools';

