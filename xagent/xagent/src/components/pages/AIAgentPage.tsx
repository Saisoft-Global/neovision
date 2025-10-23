import React from 'react';
import { WorkflowInterface } from '../WorkflowInterface';
import { Bot } from 'lucide-react';

export const AIAgentPage: React.FC = () => {
  const handleWorkflowComplete = (workflowId: string) => {
    console.log(`Workflow ${workflowId} completed`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white">AI Agent Platform</h1>
      </div>
      <WorkflowInterface onWorkflowComplete={handleWorkflowComplete} />
    </div>
  );
}; 