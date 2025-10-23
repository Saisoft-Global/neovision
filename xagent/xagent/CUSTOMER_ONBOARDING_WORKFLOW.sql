-- ============================================
-- CUSTOMER ONBOARDING WORKFLOW
-- Implements the sophisticated onboarding process shown in the diagram
-- ============================================

-- 1. Create OCR Processing Workflow
INSERT INTO workflow (name, description, status, nodes, edges) VALUES (
  'customer_onboarding_ocr',
  'AI-powered document OCR with ensemble processing',
  'active',
  '[
    {
      "id": "start",
      "type": "start",
      "data": { "label": "Customer Application Submitted" }
    },
    {
      "id": "front_office_review",
      "type": "task",
      "data": { 
        "label": "Front Office Review",
        "assignee": "front_office_staff",
        "description": "Initial application review and validation"
      }
    },
    {
      "id": "ai_ocr_processing",
      "type": "ai_task",
      "data": {
        "label": "AI OCR Agent Processing",
        "agent_id": "ocr_agent",
        "description": "Ensemble OCR: Tesseract + Azure + Google Vision",
        "config": {
          "ocr_engines": ["tesseract", "azure", "google_vision"],
          "confidence_threshold": 0.85,
          "ensemble_voting": true
        }
      }
    },
    {
      "id": "ocr_approval",
      "type": "approval",
      "data": {
        "label": "Front Office Approves OCR",
        "approver": "front_office_staff",
        "description": "Human validation of OCR results"
      }
    },
    {
      "id": "document_completeness_check",
      "type": "condition",
      "data": {
        "label": "Are all documents in order?",
        "condition": "document_completeness_validation"
      }
    },
    {
      "id": "notify_missing_info",
      "type": "notification",
      "data": {
        "label": "Notify Customer of Missing Info",
        "channels": ["email", "phone", "mail"],
        "template": "missing_document_notification"
      }
    },
    {
      "id": "business_operations",
      "type": "task",
      "data": {
        "label": "Business Operations",
        "assignee": "business_ops_team",
        "description": "Process validated application"
      }
    }
  ]'::jsonb,
  '[
    {"source": "start", "target": "front_office_review"},
    {"source": "front_office_review", "target": "ai_ocr_processing"},
    {"source": "ai_ocr_processing", "target": "ocr_approval"},
    {"source": "ocr_approval", "target": "document_completeness_check"},
    {"source": "document_completeness_check", "target": "notify_missing_info", "condition": "no"},
    {"source": "document_completeness_check", "target": "business_operations", "condition": "yes"}
  ]'::jsonb
);

-- 2. Create Background Check Workflow
INSERT INTO workflow (name, description, status, nodes, edges) VALUES (
  'background_verification',
  'Comprehensive background and credit verification',
  'active',
  '[
    {
      "id": "mareva_injunction_search",
      "type": "ai_task",
      "data": {
        "label": "Mareva Injunction Search",
        "agent_id": "background_check_agent",
        "description": "Search for court orders and injunctions"
      }
    },
    {
      "id": "credit_report_generation",
      "type": "ai_task",
      "data": {
        "label": "Credit Report Generator",
        "agent_id": "credit_agent",
        "description": "Generate comprehensive credit report"
      }
    },
    {
      "id": "multi_system_search",
      "type": "parallel_task",
      "data": {
        "label": "Multi-System API Search",
        "description": "Parallel search across all databases",
        "tasks": [
          {
            "name": "court_order_search",
            "api": "court_order_db",
            "description": "Search court order databases"
          },
          {
            "name": "aml_search",
            "api": "aml_db",
            "description": "Anti-Money Laundering check"
          },
          {
            "name": "fraud_search",
            "api": "fraud_db",
            "description": "Financial fraud database check"
          },
          {
            "name": "criminal_search",
            "api": "criminal_db",
            "description": "Criminal record database check"
          }
        ]
      }
    },
    {
      "id": "validate_search_results",
      "type": "ai_task",
      "data": {
        "label": "Validate Search Results",
        "agent_id": "validation_agent",
        "description": "AI-powered validation of all search results"
      }
    },
    {
      "id": "validation_decision",
      "type": "condition",
      "data": {
        "label": "Passed Validation Checks?",
        "condition": "comprehensive_validation"
      }
    },
    {
      "id": "account_flagged",
      "type": "task",
      "data": {
        "label": "Account Flagged",
        "assignee": "compliance_team",
        "description": "Manual review required"
      }
    },
    {
      "id": "notify_customer_flagged",
      "type": "notification",
      "data": {
        "label": "Notify Customer (Flagged)",
        "channels": ["email", "phone"],
        "template": "account_flagged_notification"
      }
    },
    {
      "id": "account_approved",
      "type": "task",
      "data": {
        "label": "Account Approved",
        "assignee": "account_team",
        "description": "Account approved for opening"
      }
    }
  ]'::jsonb,
  '[
    {"source": "start", "target": "mareva_injunction_search"},
    {"source": "mareva_injunction_search", "target": "credit_report_generation"},
    {"source": "credit_report_generation", "target": "multi_system_search"},
    {"source": "multi_system_search", "target": "validate_search_results"},
    {"source": "validate_search_results", "target": "validation_decision"},
    {"source": "validation_decision", "target": "account_flagged", "condition": "no"},
    {"source": "validation_decision", "target": "account_approved", "condition": "yes"},
    {"source": "account_flagged", "target": "notify_customer_flagged"}
  ]'::jsonb
);

-- 3. Create Account Opening Workflow
INSERT INTO workflow (name, description, status, nodes, edges) VALUES (
  'account_opening_automation',
  'Automated account opening process',
  'active',
  '[
    {
      "id": "post_ccm",
      "type": "task",
      "data": {
        "label": "Post/CCM",
        "assignee": "ccm_team",
        "description": "Customer Communication Management"
      }
    },
    {
      "id": "send_customer_letter",
      "type": "notification",
      "data": {
        "label": "Send Letter to Customer",
        "channels": ["mail", "email"],
        "template": "account_approval_letter"
      }
    },
    {
      "id": "electronic_workflow",
      "type": "workflow_trigger",
      "data": {
        "label": "Electronic Workflow",
        "target_workflow": "account_setup_tasks"
      }
    },
    {
      "id": "account_opening_agent",
      "type": "ai_task",
      "data": {
        "label": "Account Opening Agent",
        "agent_id": "account_opening_agent",
        "description": "Automated account setup tasks"
      }
    },
    {
      "id": "create_instructions",
      "type": "ai_task",
      "data": {
        "label": "Create Instructions",
        "agent_id": "documentation_agent",
        "description": "Generate account setup instructions"
      }
    },
    {
      "id": "scan_documents",
      "type": "ai_task",
      "data": {
        "label": "Scan Documents",
        "agent_id": "document_agent",
        "description": "Digitize and organize documents"
      }
    },
    {
      "id": "fill_checklist",
      "type": "ai_task",
      "data": {
        "label": "Fill-in Checklist",
        "agent_id": "compliance_agent",
        "description": "Complete compliance checklist"
      }
    },
    {
      "id": "prepare_documents",
      "type": "ai_task",
      "data": {
        "label": "Prepare Documents",
        "agent_id": "document_agent",
        "description": "Prepare final account documents"
      }
    }
  ]'::jsonb,
  '[
    {"source": "start", "target": "post_ccm"},
    {"source": "post_ccm", "target": "send_customer_letter"},
    {"source": "send_customer_letter", "target": "electronic_workflow"},
    {"source": "electronic_workflow", "target": "account_opening_agent"},
    {"source": "account_opening_agent", "target": "create_instructions"},
    {"source": "create_instructions", "target": "scan_documents"},
    {"source": "scan_documents", "target": "fill_checklist"},
    {"source": "fill_checklist", "target": "prepare_documents"}
  ]'::jsonb
);

-- 4. Create Specialized Agents
INSERT INTO agents (name, type, config, status) VALUES 
  (
    'AI OCR Agent',
    'document_processing',
    '{
      "personality": {
        "friendliness": 0.7,
        "formality": 0.9,
        "proactiveness": 0.8,
        "detail_orientation": 1.0
      },
      "skills": [
        {
          "name": "document_processing",
          "level": 5,
          "preferred_llm": {
            "provider": "mistral",
            "model": "mistral-large-latest",
            "reason": "Best for document analysis and validation"
          }
        },
        {
          "name": "ocr_processing",
          "level": 5,
          "preferred_llm": {
            "provider": "google",
            "model": "gemini-1.5-pro",
            "reason": "Excellent for visual document processing"
          }
        }
      ],
      "llm_config": {
        "provider": "mistral",
        "model": "mistral-large-latest"
      },
      "llm_overrides": {
        "document_analysis": {
          "provider": "mistral",
          "model": "mistral-large-latest"
        },
        "visual_processing": {
          "provider": "google",
          "model": "gemini-1.5-pro"
        }
      }
    }'::jsonb,
    'active'
  ),
  (
    'Background Check Agent',
    'verification',
    '{
      "personality": {
        "friendliness": 0.5,
        "formality": 1.0,
        "proactiveness": 0.9,
        "detail_orientation": 1.0
      },
      "skills": [
        {
          "name": "data_integration",
          "level": 5,
          "preferred_llm": {
            "provider": "mistral",
            "model": "mistral-large-latest",
            "reason": "Best for data analysis and pattern recognition"
          }
        },
        {
          "name": "compliance_checking",
          "level": 5,
          "preferred_llm": {
            "provider": "anthropic",
            "model": "claude-3-opus-20240229",
            "reason": "Excellent for regulatory compliance analysis"
          }
        }
      ],
      "llm_config": {
        "provider": "mistral",
        "model": "mistral-large-latest"
      }
    }'::jsonb,
    'active'
  ),
  (
    'Account Opening Agent',
    'automation',
    '{
      "personality": {
        "friendliness": 0.8,
        "formality": 0.8,
        "proactiveness": 0.9,
        "detail_orientation": 0.9
      },
      "skills": [
        {
          "name": "account_setup",
          "level": 5,
          "preferred_llm": {
            "provider": "openai",
            "model": "gpt-4-turbo",
            "reason": "Best for complex procedural tasks"
          }
        },
        {
          "name": "document_generation",
          "level": 4,
          "preferred_llm": {
            "provider": "anthropic",
            "model": "claude-3-sonnet-20240229",
            "reason": "Good for document creation and formatting"
          }
        }
      ],
      "llm_config": {
        "provider": "openai",
        "model": "gpt-4-turbo"
      }
    }'::jsonb,
    'active'
  );

-- 5. Link workflows to agents
INSERT INTO agent_workflows (agent_id, workflow_id) 
SELECT a.id, w.id 
FROM agents a, workflow w 
WHERE a.name = 'AI OCR Agent' AND w.name = 'customer_onboarding_ocr';

INSERT INTO agent_workflows (agent_id, workflow_id) 
SELECT a.id, w.id 
FROM agents a, workflow w 
WHERE a.name = 'Background Check Agent' AND w.name = 'background_verification';

INSERT INTO agent_workflows (agent_id, workflow_id) 
SELECT a.id, w.id 
FROM agents a, workflow w 
WHERE a.name = 'Account Opening Agent' AND w.name = 'account_opening_automation';

-- 6. Create API Connectors for External Systems
INSERT INTO agent_tools (name, description, type, provider, functions, config) VALUES
  (
    'Court Order Database',
    'API connector for court order and injunction databases',
    'integration',
    'court_system',
    '[
      {"id": "search_court_orders", "name": "search_court_orders", "description": "Search for court orders by person/entity", "type": "api", "apiEndpoint": "/api/v1/court-orders/search", "apiMethod": "POST"},
      {"id": "get_injunction_details", "name": "get_injunction_details", "description": "Get detailed injunction information", "type": "api", "apiEndpoint": "/api/v1/injunctions/{id}", "apiMethod": "GET"}
    ]'::jsonb,
    '{"endpoint": "https://api.courtsystem.gov", "timeout": 30000}'::jsonb
  ),
  (
    'AML Database',
    'Anti-Money Laundering database connector',
    'integration',
    'aml_system',
    '[
      {"id": "aml_check", "name": "aml_check", "description": "Perform AML screening", "type": "api", "apiEndpoint": "/api/v1/aml/screening", "apiMethod": "POST"},
      {"id": "sanctions_check", "name": "sanctions_check", "description": "Check against sanctions lists", "type": "api", "apiEndpoint": "/api/v1/sanctions/check", "apiMethod": "POST"}
    ]'::jsonb,
    '{"endpoint": "https://api.aml-provider.com", "timeout": 30000}'::jsonb
  ),
  (
    'Fraud Detection System',
    'Financial fraud detection and prevention',
    'integration',
    'fraud_system',
    '[
      {"id": "fraud_risk_assessment", "name": "fraud_risk_assessment", "description": "Assess fraud risk for customer", "type": "api", "apiEndpoint": "/api/v1/fraud/assessment", "apiMethod": "POST"},
      {"id": "identity_verification", "name": "identity_verification", "description": "Verify customer identity", "type": "api", "apiEndpoint": "/api/v1/identity/verify", "apiMethod": "POST"}
    ]'::jsonb,
    '{"endpoint": "https://api.fraud-detection.com", "timeout": 30000}'::jsonb
  ),
  (
    'Criminal Records Database',
    'Criminal background check system',
    'integration',
    'criminal_db',
    '[
      {"id": "criminal_background_check", "name": "criminal_background_check", "description": "Perform criminal background check", "type": "api", "apiEndpoint": "/api/v1/criminal/check", "apiMethod": "POST"},
      {"id": "get_criminal_record", "name": "get_criminal_record", "description": "Retrieve criminal record details", "type": "api", "apiEndpoint": "/api/v1/criminal/record/{id}", "apiMethod": "GET"}
    ]'::jsonb,
    '{"endpoint": "https://api.criminal-db.gov", "timeout": 30000}'::jsonb
  );

-- 7. Create notification templates
INSERT INTO notification_templates (name, type, subject, body, channels) VALUES
  (
    'missing_document_notification',
    'email',
    'Missing Documents - Account Application',
    'Dear {{customer_name}},\n\nWe have reviewed your account application and need the following documents to proceed:\n\n{{missing_documents}}\n\nPlease submit these documents at your earliest convenience.\n\nBest regards,\nAccount Opening Team',
    '["email", "phone"]'::jsonb
  ),
  (
    'account_flagged_notification',
    'email',
    'Account Application Status - Additional Review Required',
    'Dear {{customer_name}},\n\nYour account application requires additional review. Our compliance team will contact you within 3-5 business days.\n\nThank you for your patience.\n\nBest regards,\nCompliance Team',
    '["email", "phone"]'::jsonb
  ),
  (
    'account_approval_letter',
    'mail',
    'Account Approved - Welcome!',
    'Dear {{customer_name}},\n\nCongratulations! Your account has been approved.\n\nAccount Details:\n- Account Number: {{account_number}}\n- Account Type: {{account_type}}\n\nYour account opening package will be sent separately.\n\nWelcome to our banking family!\n\nBest regards,\nAccount Services Team',
    '["mail", "email"]'::jsonb
  );

-- 8. Verification queries
SELECT 'Customer Onboarding Workflow Created' as status, count(*) as workflow_count FROM workflow WHERE name LIKE '%onboarding%' OR name LIKE '%background%' OR name LIKE '%account_opening%';

SELECT 'Specialized Agents Created' as status, count(*) as agent_count FROM agents WHERE name IN ('AI OCR Agent', 'Background Check Agent', 'Account Opening Agent');

SELECT 'API Connectors Created' as status, count(*) as tool_count FROM agent_tools WHERE provider IN ('court_system', 'aml_system', 'fraud_system', 'criminal_db');

SELECT 'Notification Templates Created' as status, count(*) as template_count FROM notification_templates WHERE name IN ('missing_document_notification', 'account_flagged_notification', 'account_approval_letter');
