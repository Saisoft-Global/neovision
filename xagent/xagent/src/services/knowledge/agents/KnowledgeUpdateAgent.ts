import { BaseAgent } from '../../agent/BaseAgent';
import type { AgentConfig } from '../../../types/agent-framework';
import { vectorStore } from '../../pinecone/client';
import { neo4jClient } from '../../neo4j/client';
import { generateEmbeddings } from '../../openai/embeddings';
import { extractEntities } from '../../nlp/entityExtraction';
import { extractRelations } from '../../nlp/relationExtraction';

export class KnowledgeUpdateAgent extends BaseAgent {
  constructor(id: string, config: AgentConfig) {
    super(id, config);
  }

  async execute(action: string, params: Record<string, unknown>): Promise<unknown> {
    switch (action) {
      case 'add_knowledge':
        return this.addKnowledge(params.content as string);
      case 'update_knowledge_graph':
        return this.updateKnowledgeGraph(params.content as string);
      default:
        throw new Error(`Invalid action for KnowledgeUpdateAgent: ${action}`);
    }
  }

  private async addKnowledge(content: string) {
    const embeddings = await generateEmbeddings(content);
    
    await vectorStore.upsert([{
      id: crypto.randomUUID(),
      values: embeddings,
      metadata: { content },
    }]);

    return this.updateKnowledgeGraph(content);
  }

  private async updateKnowledgeGraph(content: string) {
    const entities = await extractEntities(content);
    const relations = await extractRelations(entities);

    await Promise.all([
      this.storeEntities(entities),
      this.storeRelations(relations)
    ]);

    return { entities, relations };
  }

  private async storeEntities(entities: any[]) {
    return Promise.all(entities.map(entity => 
      neo4jClient?.executeQuery(`
        MERGE (n:Entity {id: $id})
        SET n += $properties
      `, {
        id: entity.id,
        properties: entity,
      })
    ));
  }

  private async storeRelations(relations: any[]) {
    return Promise.all(relations.map(relation =>
      neo4jClient?.executeQuery(`
        MATCH (a:Entity {id: $fromId})
        MATCH (b:Entity {id: $toId})
        MERGE (a)-[r:${relation.type}]->(b)
        SET r += $properties
      `, {
        fromId: relation.from,
        toId: relation.to,
        properties: relation,
      })
    ));
  }
}