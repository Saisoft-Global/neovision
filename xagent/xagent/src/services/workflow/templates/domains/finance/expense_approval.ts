import type { Workflow } from '../../../../types/workflow';

export const financeExpenseWorkflow: Workflow = {
  id: 'finance_expense_approval',
  name: 'Expense Approval',
  description: 'Process and approve expense reports',
  nodes: [
    {
      id: 'submit_expense',
      label: 'Submit Expense Report',
      description: 'Submit expense details and receipts',
      position: { x: 100, y: 100 },
      action: 'collect_information',
      parameters: {
        requiredFields: [
          'amount',
          'category',
          'date',
          'description',
          'receipts',
        ],
      },
    },
    {
      id: 'validate_expense',
      label: 'Validate Expenses',
      description: 'Check compliance with expense policy',
      position: { x: 300, y: 100 },
      action: 'validate_expenses',
      parameters: {
        checks: ['policy_limits', 'required_receipts', 'category_rules'],
      },
    },
    {
      id: 'manager_approval',
      label: 'Manager Approval',
      description: 'Route for manager approval',
      position: { x: 500, y: 100 },
      action: 'request_approval',
      parameters: {
        approverRole: 'manager',
        timeoutDays: 5,
      },
    },
  ],
  connections: [
    {
      from: 'submit_expense',
      to: 'validate_expense',
      startPoint: { x: 200, y: 100 },
      endPoint: { x: 300, y: 100 },
      midPoint: { x: 250, y: 100 },
    },
    {
      from: 'validate_expense',
      to: 'manager_approval',
      startPoint: { x: 400, y: 100 },
      endPoint: { x: 500, y: 100 },
      midPoint: { x: 450, y: 100 },
    },
  ],
};