import React, { useState } from 'react';
import { WorkflowManager, WorkflowStep } from '../services/workflowManager';
import { AIAgent } from './AIAgent';

interface WorkflowInterfaceProps {
  onWorkflowComplete: (workflowId: string) => void;
}

export const WorkflowInterface: React.FC<WorkflowInterfaceProps> = ({ onWorkflowComplete }) => {
  const [workflowManager] = useState(() => new WorkflowManager());
  const [currentStatus, setCurrentStatus] = useState('Initializing...');
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);

  const handleAddStep = (step: WorkflowStep) => {
    setWorkflowSteps([...workflowSteps, step]);
  };

  const handleStartWorkflow = async () => {
    const workflowId = `workflow-${Date.now()}`;
    const workflow = workflowManager.createWorkflow(workflowId, 'New Workflow', workflowSteps);
    
    try {
      await workflowManager.startWorkflow(workflowId, (step) => {
        setCurrentStatus(`Completed step: ${step.type} - ${step.action}`);
      });
      onWorkflowComplete(workflowId);
    } catch (error) {
      console.error('Workflow execution failed:', error);
      setCurrentStatus('Error: Workflow execution failed');
    }
  };

  return (
    <div className="workflow-interface">
      <div className="workflow-controls">
        <h2>Workflow Builder</h2>
        <div className="step-builder">
          <select
            onChange={(e) => {
              const type = e.target.value as WorkflowStep['type'];
              handleAddStep({
                type,
                action: '',
                params: {},
              });
            }}
          >
            <option value="">Add Step</option>
            <option value="url">URL Navigation</option>
            <option value="form">Form Fill</option>
            <option value="facial">Facial Recognition</option>
            <option value="desktop">Desktop Action</option>
          </select>
        </div>
        <div className="workflow-steps">
          {workflowSteps.map((step, index) => (
            <div key={index} className="workflow-step">
              <span>{step.type}</span>
              <input
                type="text"
                placeholder="Action"
                value={step.action}
                onChange={(e) => {
                  const newSteps = [...workflowSteps];
                  newSteps[index].action = e.target.value;
                  setWorkflowSteps(newSteps);
                }}
              />
              <textarea
                placeholder="Parameters (JSON)"
                value={JSON.stringify(step.params, null, 2)}
                onChange={(e) => {
                  try {
                    const newSteps = [...workflowSteps];
                    newSteps[index].params = JSON.parse(e.target.value);
                    setWorkflowSteps(newSteps);
                  } catch (error) {
                    console.error('Invalid JSON:', error);
                  }
                }}
              />
            </div>
          ))}
        </div>
        <button
          onClick={handleStartWorkflow}
          disabled={workflowSteps.length === 0}
        >
          Start Workflow
        </button>
      </div>
      <div className="workflow-status">
        <h3>Status</h3>
        <p>{currentStatus}</p>
      </div>
      <AIAgent onStatusChange={setCurrentStatus} />
    </div>
  );
}; 