import type { KnowledgeNode } from '../../../types/knowledge';
import { neo4jClient } from '../../neo4j/client';
import { extractEntities } from '../../nlp/entityExtraction';
import { generateEmbeddings } from '../../openai/embeddings';
import { EventEmitter } from '../../../utils/events/EventEmitter';

export class EntityManager {
  private eventEmitter: EventEmitter;

  constructor() {
    this.eventEmitter = new EventEmitter();
  }

  async processEntities(content: string): Promise<KnowledgeNode[]> {
    try {
      this.eventEmitter.emit('processingStart', { content });

      const extractedEntities = await extractEntities(content);
      this.eventEmitter.emit('entitiesExtracted', { count: extractedEntities.length });

      const entities = await this.enrichEntities(extractedEntities);
      this.eventEmitter.emit('entitiesEnriched', { count: entities.length });

      if (neo4jClient?.isConnected()) {
        await this.storeEntities(entities);
        this.eventEmitter.emit('entitiesStored', { count: entities.length });
      }

      return entities;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to process entities';
      this.eventEmitter.emit('error', message);
      throw error;
    }
  }

  private async enrichEntities(entities: any[]): Promise<KnowledgeNode[]> {
    return Promise.all(
      entities.map(async entity => ({
        id: crypto.randomUUID(),
        type: entity.type,
        label: entity.text,
        properties: entity.properties || {},
        embeddings: await generateEmbeddings(entity.text),
      }))
    );
  }

  private async storeEntities(entities: KnowledgeNode[]): Promise<void> {
    if (!neo4jClient) return;

    await Promise.all(
      entities.map(entity =>
        neo4jClient.executeQuery(`
          MERGE (n:Entity {id: $id})
          SET n += $properties
        `, {
          id: entity.id,
          properties: entity,
        })
      )
    );
  }

  onProcessingStart(callback: (data: { content: string }) => void): void {
    this.eventEmitter.on('processingStart', callback);
  }

  onEntitiesExtracted(callback: (data: { count: number }) => void): void {
    this.eventEmitter.on('entitiesExtracted', callback);
  }

  onEntitiesEnriched(callback: (data: { count: number }) => void): void {
    this.eventEmitter.on('entitiesEnriched', callback);
  }

  onEntitiesStored(callback: (data: { count: number }) => void): void {
    this.eventEmitter.on('entitiesStored', callback);
  }

  onError(callback: (error: string) => void): void {
    this.eventEmitter.on('error', callback);
  }
}