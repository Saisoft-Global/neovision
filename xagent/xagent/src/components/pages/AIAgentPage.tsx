import React from 'react';
import { WorkflowInterface } from '../WorkflowInterface';

export const AIAgentPage: React.FC = () => {
  const handleWorkflowComplete = (workflowId: string) => {
    console.log(`Workflow ${workflowId} completed`);
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">AI Agent Platform</h1>
      <WorkflowInterface onWorkflowComplete={handleWorkflowComplete} />
    </div>
  );
}; 