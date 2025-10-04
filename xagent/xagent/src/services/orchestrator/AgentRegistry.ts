import type { Agent } from '../../types/agent';

export class AgentRegistry {
  private agents: Map<string, Agent> = new Map();
  private domainAgents: Map<string, Set<string>> = new Map();

  registerAgent(agent: Agent): void {
    this.agents.set(agent.id, agent);
    
    // Register for domain lookup
    agent.expertise.forEach(domain => {
      if (!this.domainAgents.has(domain)) {
        this.domainAgents.set(domain, new Set());
      }
      this.domainAgents.get(domain)?.add(agent.id);
    });
  }

  getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  getAgentsForDomain(domain: string): Agent[] {
    const agentIds = this.domainAgents.get(domain) || new Set();
    return Array.from(agentIds)
      .map(id => this.agents.get(id))
      .filter((agent): agent is Agent => agent !== undefined);
  }

  unregisterAgent(id: string): void {
    const agent = this.agents.get(id);
    if (agent) {
      agent.expertise.forEach(domain => {
        this.domainAgents.get(domain)?.delete(id);
      });
      this.agents.delete(id);
    }
  }
}