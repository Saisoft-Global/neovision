import type { Workflow } from '../../../../types/workflow';

export const itIncidentWorkflow: Workflow = {
  id: 'it_incident_response',
  name: 'IT Incident Response',
  description: 'Handle and resolve IT incidents',
  nodes: [
    {
      id: 'incident_report',
      label: 'Report Incident',
      description: 'Record incident details',
      position: { x: 100, y: 100 },
      action: 'collect_information',
      parameters: {
        requiredFields: [
          'type',
          'severity',
          'description',
          'affectedSystems',
          'impact',
        ],
      },
    },
    {
      id: 'initial_assessment',
      label: 'Initial Assessment',
      description: 'Assess incident severity and impact',
      position: { x: 300, y: 100 },
      action: 'assess_incident',
      parameters: {
        assessmentCriteria: [
          'business_impact',
          'user_impact',
          'security_risk',
        ],
      },
    },
    {
      id: 'assign_resource',
      label: 'Assign Resources',
      description: 'Assign appropriate IT resources',
      position: { x: 500, y: 100 },
      action: 'assign_resources',
      parameters: {
        resourceTypes: ['technician', 'specialist', 'manager'],
        priorityBased: true,
      },
    },
  ],
  connections: [
    {
      from: 'incident_report',
      to: 'initial_assessment',
      startPoint: { x: 200, y: 100 },
      endPoint: { x: 300, y: 100 },
      midPoint: { x: 250, y: 100 },
    },
    {
      from: 'initial_assessment',
      to: 'assign_resource',
      startPoint: { x: 400, y: 100 },
      endPoint: { x: 500, y: 100 },
      midPoint: { x: 450, y: 100 },
    },
  ],
};