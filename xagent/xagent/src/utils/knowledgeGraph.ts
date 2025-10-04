import type { Document } from '../types/document';
import type { KnowledgeNode, KnowledgeRelation } from '../types/knowledge';
import { extractEntities } from '../services/nlp/entityExtraction';
import { extractRelations } from '../services/nlp/relationExtraction';
import { generateEmbeddings } from '../services/openai/embeddings';
import { createNode, createRelation } from '../services/neo4j/operations';

export async function updateKnowledgeGraph(document: Document): Promise<void> {
  // Extract entities using NLP
  const entities = await extractEntities(document.content);
  
  // Create nodes for each entity
  const nodes = await Promise.all(
    entities.map(async (entity) => {
      const node: KnowledgeNode = {
        id: crypto.randomUUID(),
        type: entity.type,
        label: entity.text,
        properties: entity.properties || {},
        embeddings: await generateEmbeddings(entity.text),
        sourceDocumentId: document.id,
      };

      // Store node in graph database
      await createNode(node);
      return node;
    })
  );

  // Extract and create relationships
  const relations = await extractRelations(nodes);
  for (const relation of relations) {
    const knowledgeRelation: KnowledgeRelation = {
      id: crypto.randomUUID(),
      type: relation.type,
      sourceId: relation.source,
      targetId: relation.target,
      properties: relation.properties || {},
      confidence: relation.confidence,
    };

    // Store relation in graph database
    await createRelation(knowledgeRelation);
  }
}