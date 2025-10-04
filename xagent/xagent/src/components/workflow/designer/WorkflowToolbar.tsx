import React from 'react';
import { Play, Save, Plus, Trash2 } from 'lucide-react';
import { useWorkflowStore } from '../../../store/workflowStore';

export const WorkflowToolbar: React.FC = () => {
  const { 
    selectedWorkflow,
    executeWorkflow,
    saveWorkflow,
    deleteWorkflow 
  } = useWorkflowStore();

  if (!selectedWorkflow) return null;

  return (
    <div className="p-4 border-b flex items-center justify-between bg-white">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => executeWorkflow(selectedWorkflow.id)}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Play className="w-4 h-4" />
          <span>Run Workflow</span>
        </button>
        
        <button
          onClick={() => saveWorkflow(selectedWorkflow)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Save className="w-4 h-4" />
          <span>Save</span>
        </button>
      </div>

      <div className="flex items-center space-x-4">
        <button
          onClick={() => deleteWorkflow(selectedWorkflow.id)}
          className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
        >
          <Trash2 className="w-4 h-4" />
          <span>Delete</span>
        </button>
      </div>
    </div>
  );
};