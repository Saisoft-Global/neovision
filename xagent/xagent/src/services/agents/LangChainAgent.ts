import { initializeAgentExecutorWithOptions } from 'langchain/agents';
import { ChainTool } from '@langchain/core/tools';
import { LangChainService } from '../llm/LangChainService';
import { LangChainRAG } from '../rag/LangChainRAG';

export class LangChainAgent {
  private static instance: LangChainAgent;
  private langChain: LangChainService;
  private rag: LangChainRAG;

  private constructor() {
    this.langChain = LangChainService.getInstance();
    this.rag = LangChainRAG.getInstance();
  }

  public static getInstance(): LangChainAgent {
    if (!this.instance) {
      this.instance = new LangChainAgent();
    }
    return this.instance;
  }

  async createAgent(systemPrompt: string) {
    const model = this.langChain.getModel();

    const searchTool = new ChainTool({
      name: 'search_knowledge',
      description: 'Search the knowledge base for relevant information',
      chain: await this.langChain.createChain(
        'Search the knowledge base for: {query}'
      ),
    });

    return initializeAgentExecutorWithOptions([searchTool], model, {
      agentType: 'openai-functions',
      verbose: true,
      systemMessage: systemPrompt,
    });
  }

  async executeAgent(agent: any, input: string) {
    return agent.invoke({ input });
  }
}