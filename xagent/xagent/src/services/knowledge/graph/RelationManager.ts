import type { KnowledgeNode, KnowledgeRelation } from '../../../types/knowledge';
import { neo4jClient } from '../../neo4j/client';
import { extractRelations } from '../../nlp/relationExtraction';

export class RelationManager {
  async processRelations(entities: KnowledgeNode[]): Promise<KnowledgeRelation[]> {
    const relations = await extractRelations(entities);
    await this.storeRelations(relations);
    return relations;
  }

  private async storeRelations(relations: KnowledgeRelation[]): Promise<void> {
    if (!neo4jClient) return;

    await Promise.all(
      relations.map(relation =>
        neo4jClient.executeQuery(`
          MATCH (a:Entity {id: $fromId})
          MATCH (b:Entity {id: $toId})
          MERGE (a)-[r:${relation.type}]->(b)
          SET r += $properties
        `, {
          fromId: relation.sourceId,
          toId: relation.targetId,
          properties: relation.properties,
        })
      )
    );
  }
}