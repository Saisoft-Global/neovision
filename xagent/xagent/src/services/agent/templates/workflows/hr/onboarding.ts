import type { Workflow } from '../../../../types/workflow';

export const onboardingWorkflow: Workflow = {
  id: 'onboarding_workflow',
  name: 'Employee Onboarding',
  description: 'Manages the employee onboarding process',
  nodes: [
    {
      id: 'collect_info',
      label: 'Collect Employee Information',
      description: 'Gather necessary employee details',
      position: { x: 100, y: 100 },
      action: 'collect_information',
      parameters: {
        required_fields: [
          'full_name',
          'email',
          'department',
          'start_date',
        ],
      },
    },
    {
      id: 'setup_accounts',
      label: 'Setup System Accounts',
      description: 'Create necessary system accounts',
      position: { x: 300, y: 100 },
      action: 'create_accounts',
      parameters: {
        systems: ['email', 'hr_system', 'payroll'],
      },
    },
    {
      id: 'send_welcome',
      label: 'Send Welcome Email',
      description: 'Send welcome email with important information',
      position: { x: 500, y: 100 },
      action: 'send_email',
      parameters: {
        template: 'welcome_email',
        include_attachments: true,
      },
    },
  ],
  connections: [
    {
      from: 'collect_info',
      to: 'setup_accounts',
      startPoint: { x: 200, y: 100 },
      endPoint: { x: 300, y: 100 },
      midPoint: { x: 250, y: 100 },
    },
    {
      from: 'setup_accounts',
      to: 'send_welcome',
      startPoint: { x: 400, y: 100 },
      endPoint: { x: 500, y: 100 },
      midPoint: { x: 450, y: 100 },
    },
  ],
};