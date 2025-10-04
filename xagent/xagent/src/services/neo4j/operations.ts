import neo4jClient from './client';
import type { KnowledgeNode, KnowledgeRelation } from '../../types/knowledge';

export async function createNode(node: KnowledgeNode): Promise<void> {
  const query = `
    CREATE (n:${node.type} {
      id: $id,
      label: $label,
      properties: $properties,
      embeddings: $embeddings,
      sourceDocumentId: $sourceDocumentId
    })
  `;
  
  await neo4jClient.executeQuery(query, node);
}

export async function createRelation(relation: KnowledgeRelation): Promise<void> {
  const query = `
    MATCH (source {id: $sourceId})
    MATCH (target {id: $targetId})
    CREATE (source)-[r:${relation.type} {
      id: $id,
      properties: $properties,
      confidence: $confidence
    }]->(target)
  `;
  
  await neo4jClient.executeQuery(query, relation);
}

export async function findNodesByLabel(label: string): Promise<KnowledgeNode[]> {
  const query = `
    MATCH (n {label: $label})
    RETURN n
  `;
  
  const result = await neo4jClient.executeQuery(query, { label });
  return result.map((record: any) => record.get('n').properties);
}

export async function findRelatedNodes(nodeId: string): Promise<KnowledgeNode[]> {
  const query = `
    MATCH (n {id: $nodeId})-[r]-(related)
    RETURN related
  `;
  
  const result = await neo4jClient.executeQuery(query, { nodeId });
  return result.map((record: any) => record.get('related').properties);
}