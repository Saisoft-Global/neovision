import type { Workflow } from '../../../../types/workflow';

export const hrOnboardingWorkflow: Workflow = {
  id: 'hr_onboarding',
  name: 'Employee Onboarding',
  description: 'Complete employee onboarding process',
  nodes: [
    {
      id: 'collect_info',
      label: 'Collect Employee Information',
      description: 'Gather necessary employee details',
      position: { x: 100, y: 100 },
      action: 'collect_information',
      parameters: {
        requiredFields: [
          'fullName',
          'email',
          'department',
          'startDate',
          'position',
        ],
      },
    },
    {
      id: 'setup_accounts',
      label: 'Setup System Access',
      description: 'Create necessary system accounts',
      position: { x: 300, y: 100 },
      action: 'create_accounts',
      parameters: {
        systems: ['email', 'hr', 'payroll', 'benefits'],
      },
    },
    {
      id: 'schedule_orientation',
      label: 'Schedule Orientation',
      description: 'Schedule onboarding meetings',
      position: { x: 500, y: 100 },
      action: 'schedule_meetings',
      parameters: {
        meetings: [
          { type: 'orientation', duration: 60 },
          { type: 'it_setup', duration: 30 },
          { type: 'team_intro', duration: 30 },
        ],
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
      to: 'schedule_orientation',
      startPoint: { x: 400, y: 100 },
      endPoint: { x: 500, y: 100 },
      midPoint: { x: 450, y: 100 },
    },
  ],
};