import { BaseAgent } from '../../agent/BaseAgent';
import type { AgentConfig } from '../../../types/agent-framework';
import { vectorStore } from '../../pinecone/client';
import { neo4jClient } from '../../neo4j/client';
import { generateEmbeddings } from '../../openai/embeddings';

export class KnowledgeQueryAgent extends BaseAgent {
  constructor(id: string, config: AgentConfig) {
    super(id, config);
  }

  async execute(action: string, params: Record<string, unknown>): Promise<unknown> {
    if (action !== 'query_knowledge') {
      throw new Error(`Invalid action for KnowledgeQueryAgent: ${action}`);
    }
    return this.queryKnowledge(params.query as string);
  }

  private async queryKnowledge(query: string) {
    const queryEmbeddings = await generateEmbeddings(query);
    
    const [vectorResults, graphResults] = await Promise.all([
      this.queryVectorStore(queryEmbeddings),
      this.queryKnowledgeGraph(query)
    ]);

    return { vectorResults, graphResults };
  }

  private async queryVectorStore(embeddings: number[]) {
    return vectorStore.query({
      vector: embeddings,
      topK: 5,
    });
  }

  private async queryKnowledgeGraph(query: string) {
    return neo4jClient?.executeQuery(`
      MATCH (n)-[r]-(m)
      WHERE n.content CONTAINS $query
      RETURN n, r, m
      LIMIT 5
    `, { query });
  }
}