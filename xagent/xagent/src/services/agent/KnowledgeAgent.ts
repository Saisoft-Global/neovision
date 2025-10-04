import type { AgentConfig } from '../../types/agent-framework';
import { BaseAgent } from './BaseAgent';
import { getVectorStore } from '../pinecone/client';
import { generateEmbeddings } from '../openai/embeddings';
import { KnowledgeGraphManager } from '../knowledge/graph/KnowledgeGraphManager';

export class KnowledgeAgent extends BaseAgent {
  private graphManager: KnowledgeGraphManager;

  constructor(id: string, config: AgentConfig) {
    super(id, config);
    this.graphManager = new KnowledgeGraphManager();
  }

  async execute(action: string, params: Record<string, unknown>): Promise<unknown> {
    switch (action) {
      case 'search':
        return this.searchKnowledge(params.query as string);
      case 'add':
        return this.addKnowledge(params.content as string);
      case 'analyze':
        return this.analyzeContent(params.content as string);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  private async searchKnowledge(query: string) {
    const embeddings = await generateEmbeddings(query);
    const vectorStore = await getVectorStore();
    
    if (!vectorStore) {
      throw new Error('Vector store not available');
    }

    return vectorStore.query({
      vector: embeddings,
      topK: 5,
      includeMetadata: true,
    });
  }

  private async addKnowledge(content: string) {
    const embeddings = await generateEmbeddings(content);
    const vectorStore = await getVectorStore();
    
    if (!vectorStore) {
      throw new Error('Vector store not available');
    }

    await vectorStore.upsert([{
      id: crypto.randomUUID(),
      values: embeddings,
      metadata: { content },
    }]);

    // Update knowledge graph
    return this.graphManager.updateGraph(content);
  }

  private async analyzeContent(content: string) {
    return this.generateResponse(content, { action: 'analyze' });
  }
}