import { create } from 'zustand';
import type { Agent, Message } from '../types/agent';

interface AgentState {
  agents: Agent[];
  selectedAgent: Agent | null;
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  addAgent: (agent: Agent) => void;
  selectAgent: (agent: Agent | null) => void;
  addMessage: (message: Message) => void;
  clearMessages: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  agents: [],
  selectedAgent: null,
  messages: [],
  isLoading: false,
  error: null,

  addAgent: (agent) =>
    set((state) => ({ agents: [...state.agents, agent] })),

  selectAgent: (agent) =>
    set({ selectedAgent: agent, messages: [] }),

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  clearMessages: () =>
    set({ messages: [] }),

  setLoading: (loading) =>
    set({ isLoading: loading }),

  setError: (error) =>
    set({ error }),
}));