import { create } from 'zustand';
import type { Workflow, WorkflowNode } from '../types/workflow';
import { WorkflowManager } from '../services/workflow/WorkflowManager';

interface WorkflowState {
  workflows: Workflow[];
  selectedWorkflow: Workflow | null;
  selectedNode: WorkflowNode | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchWorkflows: () => Promise<void>;
  createWorkflow: (workflow: Partial<Workflow>) => Promise<void>;
  saveWorkflow: (workflow: Workflow) => Promise<void>;
  deleteWorkflow: (id: string) => Promise<void>;
  executeWorkflow: (id: string) => Promise<void>;
  
  // Selection
  selectWorkflow: (workflow: Workflow | null) => void;
  selectNode: (node: WorkflowNode | null) => void;
  
  // Node operations
  addNode: (workflowId: string, node: WorkflowNode) => void;
  updateNode: (workflowId: string, updates: Partial<WorkflowNode>) => void;
  removeNode: (workflowId: string, nodeId: string) => void;
  updateNodePosition: (workflowId: string, nodeId: string, position: { x: number; y: number }) => void;
  
  // Connection operations
  addConnection: (workflowId: string, fromId: string, toId: string) => void;
  removeConnection: (workflowId: string, fromId: string, toId: string) => void;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => {
  const workflowManager = WorkflowManager.getInstance();

  return {
    workflows: [],
    selectedWorkflow: null,
    selectedNode: null,
    isLoading: false,
    error: null,

    fetchWorkflows: async () => {
      try {
        set({ isLoading: true, error: null });
        const workflows = await workflowManager.listWorkflows();
        set({ workflows, isLoading: false });
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to fetch workflows',
          isLoading: false 
        });
      }
    },

    createWorkflow: async (workflow) => {
      try {
        set({ isLoading: true, error: null });
        const newWorkflow = await workflowManager.createWorkflow(workflow);
        set(state => ({
          workflows: [...state.workflows, newWorkflow],
          selectedWorkflow: newWorkflow,
          isLoading: false,
        }));
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to create workflow',
          isLoading: false 
        });
      }
    },

    saveWorkflow: async (workflow) => {
      try {
        set({ isLoading: true, error: null });
        await workflowManager.updateWorkflow(workflow.id, workflow);
        set(state => ({
          workflows: state.workflows.map(w => 
            w.id === workflow.id ? workflow : w
          ),
          isLoading: false,
        }));
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to save workflow',
          isLoading: false 
        });
      }
    },

    deleteWorkflow: async (id) => {
      try {
        set({ isLoading: true, error: null });
        await workflowManager.deleteWorkflow(id);
        set(state => ({
          workflows: state.workflows.filter(w => w.id !== id),
          selectedWorkflow: state.selectedWorkflow?.id === id ? null : state.selectedWorkflow,
          isLoading: false,
        }));
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to delete workflow',
          isLoading: false 
        });
      }
    },

    executeWorkflow: async (id) => {
      try {
        set({ isLoading: true, error: null });
        await workflowManager.executeWorkflow(id);
        set({ isLoading: false });
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to execute workflow',
          isLoading: false 
        });
      }
    },

    selectWorkflow: (workflow) => set({ selectedWorkflow: workflow }),
    selectNode: (node) => set({ selectedNode: node }),

    addNode: (workflowId, node) => {
      set(state => ({
        workflows: state.workflows.map(w => 
          w.id === workflowId 
            ? { ...w, nodes: [...w.nodes, node] }
            : w
        ),
      }));
    },

    updateNode: (workflowId, updates) => {
      set(state => ({
        workflows: state.workflows.map(w => 
          w.id === workflowId 
            ? {
                ...w,
                nodes: w.nodes.map(n => 
                  n.id === updates.id ? { ...n, ...updates } : n
                ),
              }
            : w
        ),
      }));
    },

    removeNode: (workflowId, nodeId) => {
      set(state => ({
        workflows: state.workflows.map(w => 
          w.id === workflowId 
            ? {
                ...w,
                nodes: w.nodes.filter(n => n.id !== nodeId),
                connections: w.connections.filter(c => 
                  c.from !== nodeId && c.to !== nodeId
                ),
              }
            : w
        ),
      }));
    },

    updateNodePosition: (workflowId, nodeId, position) => {
      set(state => ({
        workflows: state.workflows.map(w => 
          w.id === workflowId 
            ? {
                ...w,
                nodes: w.nodes.map(n => 
                  n.id === nodeId ? { ...n, position } : n
                ),
              }
            : w
        ),
      }));
    },

    addConnection: (workflowId, fromId, toId) => {
      set(state => ({
        workflows: state.workflows.map(w => 
          w.id === workflowId 
            ? {
                ...w,
                connections: [...w.connections, {
                  from: fromId,
                  to: toId,
                  startPoint: { x: 0, y: 0 }, // Calculate actual points
                  endPoint: { x: 0, y: 0 },
                  midPoint: { x: 0, y: 0 },
                }],
              }
            : w
        ),
      }));
    },

    removeConnection: (workflowId, fromId, toId) => {
      set(state => ({
        workflows: state.workflows.map(w => 
          w.id === workflowId 
            ? {
                ...w,
                connections: w.connections.filter(c => 
                  !(c.from === fromId && c.to === toId)
                ),
              }
            : w
        ),
      }));
    },
  };
});