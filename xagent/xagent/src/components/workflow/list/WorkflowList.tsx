import React from 'react';
import { GitGraph, Play, Trash2 } from 'lucide-react';
import type { Workflow } from '../../../types/workflow';

interface WorkflowListProps {
  workflows: Workflow[];
  selectedWorkflow: Workflow | null;
  onSelect: (workflow: Workflow) => void;
  onDelete: (id: string) => void;
  onExecute: (id: string) => void;
}

export const WorkflowList: React.FC<WorkflowListProps> = ({
  workflows,
  selectedWorkflow,
  onSelect,
  onDelete,
  onExecute,
}) => {
  return (
    <div className="space-y-2">
      {workflows.map((workflow) => (
        <div
          key={workflow.id}
          className={`p-4 bg-white rounded-lg border-2 transition-colors cursor-pointer ${
            selectedWorkflow?.id === workflow.id
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-blue-200'
          }`}
          onClick={() => onSelect(workflow)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <GitGraph className="w-5 h-5 text-gray-500" />
              <div>
                <h3 className="font-medium">{workflow.name}</h3>
                <p className="text-sm text-gray-500">{workflow.description}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onExecute(workflow.id);
                }}
                className="p-2 text-gray-400 hover:text-green-500 rounded-full hover:bg-green-50"
                title="Execute workflow"
              >
                <Play className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(workflow.id);
                }}
                className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50"
                title="Delete workflow"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};