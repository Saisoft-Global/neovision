import type { AgentRequest } from '../../types/agent';

export function prioritizeActions(actions: AgentRequest[]): AgentRequest[] {
  return actions.sort((a, b) => {
    // Consider explicit priority first
    if (a.priority !== undefined && b.priority !== undefined) {
      return a.priority - b.priority;
    }

    // Default priorities for different agent types
    const typePriority: Record<string, number> = {
      knowledge: 1,
      calendar: 2,
      meeting: 3,
      email: 4,
      task: 5,
      document: 6,
    };

    return (typePriority[a.type] || 99) - (typePriority[b.type] || 99);
  });
}