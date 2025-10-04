import { BaseAgent } from '../agents/BaseAgent';
import type { AgentConfig } from '../../types/agent-framework';
import { getVectorIndex } from '../pinecone/client';
import { generateEmbeddings } from '../openai/embeddings';

export class KnowledgeAgent extends BaseAgent {
  constructor(id: string, config: AgentConfig) {
    super(id, config);
  }

  protected getSystemPrompt(): string {
    return `You are a knowledge management assistant that helps with:
- Information retrieval
- Knowledge organization
- Content analysis
- Data enrichment`;
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
    const vectorStore = await getVectorIndex();
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
    const vectorStore = await getVectorIndex();
    if (!vectorStore) {
      throw new Error('Vector store not available');
    }
    return vectorStore.upsert([{
      id: crypto.randomUUID(),
      values: embeddings,
      metadata: { content },
    }]);
  }

  private async analyzeContent(content: string) {
    return this.generateResponse(content, { action: 'analyze' });
  }
}