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
  ensureDefaultAgent: () => Promise<void>;
}

const SELECTED_KEY = 'xagent_selected_agent_v1';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export const useAgentStore = create<AgentState>((set, get) => ({
  agents: [],
  selectedAgent: (() => {
    try {
      const raw = localStorage.getItem(SELECTED_KEY);
      return raw ? (JSON.parse(raw) as Agent) : null;
    } catch {
      return null;
    }
  })(),
  messages: [],
  isLoading: false,
  error: null,

  addAgent: (agent) =>
    set((state) => ({ agents: [...state.agents, agent] })),

  selectAgent: (agent) =>
    set(() => {
      try {
        if (agent) localStorage.setItem(SELECTED_KEY, JSON.stringify(agent));
        else localStorage.removeItem(SELECTED_KEY);
      } catch {}
      return { selectedAgent: agent, messages: [] };
    }),

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  clearMessages: () =>
    set({ messages: [] }),

  setLoading: (loading) =>
    set({ isLoading: loading }),

  setError: (error) =>
    set({ error }),

  ensureDefaultAgent: async () => {
    try {
      // If agent already selected, skip
      if (get().selectedAgent) return;

      // Call /ensure to create agent in Supabase if not exists, then fetch /default
      await fetch(`${BACKEND_URL}/api/default-agent/ensure`).catch(err => {
        console.warn('Ensure endpoint failed (non-blocking):', err);
      });

      // Fetch default agent metadata
      const response = await fetch(`${BACKEND_URL}/api/default-agent/default`);
      if (!response.ok) {
        console.warn('Failed to fetch default agent; user can select manually');
        return;
      }

      const defaultAgent = await response.json();
      
      // Auto-select default agent
      set(() => {
        try {
          localStorage.setItem(SELECTED_KEY, JSON.stringify(defaultAgent));
        } catch {}
        return { selectedAgent: defaultAgent, agents: [defaultAgent], messages: [] };
      });

      console.log('✅ Auto-selected default agent:', defaultAgent.name);
    } catch (error) {
      console.warn('Failed to ensure default agent:', error);
      // Non-blocking; user can still select manually
    }
  },
}));