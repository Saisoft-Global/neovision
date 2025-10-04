import type { KnowledgeNode, KnowledgeRelation } from '../../../types/knowledge';
import { neo4jClient } from '../../neo4j/client';
import { EntityManager } from './EntityManager';
import { RelationManager } from './RelationManager';
import { HierarchyManager } from './HierarchyManager';
import { EventEmitter } from '../../../utils/events/EventEmitter';

export class KnowledgeGraphManager {
  private static instance: KnowledgeGraphManager | null = null;
  private entityManager: EntityManager;
  private relationManager: RelationManager;
  private hierarchyManager: HierarchyManager;
  private eventEmitter: EventEmitter;
  private isNeo4jAvailable: boolean = false;
  private initPromise: Promise<void> | null = null;

  private constructor() {
    this.entityManager = new EntityManager();
    this.relationManager = new RelationManager();
    this.hierarchyManager = new HierarchyManager();
    this.eventEmitter = new EventEmitter();
    this.initializeGraph();
  }

  public static getInstance(): KnowledgeGraphManager {
    if (!this.instance) {
      this.instance = new KnowledgeGraphManager();
    }
    return this.instance;
  }

  private async initializeGraph(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.performInitialization();
    return this.initPromise;
  }

  private async performInitialization(): Promise<void> {
    try {
      if (neo4jClient) {
        await neo4jClient.connect();
        this.isNeo4jAvailable = true;
        this.eventEmitter.emit('initialized');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to initialize graph';
      this.eventEmitter.emit('error', message);
      this.isNeo4jAvailable = false;
    } finally {
      this.initPromise = null;
    }
  }

  async updateGraph(content: string): Promise<void> {
    if (!this.isNeo4jAvailable) {
      this.eventEmitter.emit('warning', 'Neo4j not available - skipping graph update');
      return;
    }

    try {
      this.eventEmitter.emit('updateStart', { content });

      // Process entities
      const entities = await this.entityManager.processEntities(content);
      this.eventEmitter.emit('entitiesProcessed', { count: entities.length });
      
      // Process relationships
      const relations = await this.relationManager.processRelations(entities);
      this.eventEmitter.emit('relationsProcessed', { count: relations.length });
      
      // Update hierarchical relationships
      for (let i = 0; i < entities.length - 1; i++) {
        await this.hierarchyManager.createHierarchicalRelation(
          entities[i].id,
          entities[i + 1].id,
          'CONTAINS'
        );
      }

      this.eventEmitter.emit('updateComplete', {
        entityCount: entities.length,
        relationCount: relations.length
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update graph';
      this.eventEmitter.emit('error', message);
      throw error;
    }
  }

  async searchGraph(query: string): Promise<{
    nodes: KnowledgeNode[];
    relations: KnowledgeRelation[];
  }> {
    if (!this.isNeo4jAvailable || !neo4jClient) {
      return { nodes: [], relations: [] };
    }

    try {
      const result = await neo4jClient.executeQuery(`
        MATCH (n)-[r]->(m)
        WHERE n.content CONTAINS $query
        RETURN n, r, m
        LIMIT 10
      `, { query });

      const nodes = new Map<string, KnowledgeNode>();
      const relations: KnowledgeRelation[] = [];

      result.forEach(record => {
        const node = record.get('n').properties;
        const relation = record.get('r').properties;
        const target = record.get('m').properties;

        nodes.set(node.id, node);
        nodes.set(target.id, target);

        relations.push({
          id: relation.id,
          type: relation.type,
          sourceId: node.id,
          targetId: target.id,
          properties: relation.properties,
          confidence: relation.confidence,
        });
      });

      return {
        nodes: Array.from(nodes.values()),
        relations
      };
    } catch (error) {
      console.error('Graph search error:', error);
      return { nodes: [], relations: [] };
    }
  }

  async getRelatedNodes(nodeId: string): Promise<KnowledgeNode[]> {
    if (!this.isNeo4jAvailable || !neo4jClient) {
      return [];
    }

    try {
      const result = await neo4jClient.executeQuery(`
        MATCH (n {id: $nodeId})-[r]-(related)
        RETURN related
        LIMIT 5
      `, { nodeId });

      return result.map(record => record.get('related').properties);
    } catch (error) {
      console.error('Failed to get related nodes:', error);
      return [];
    }
  }

  async cleanup(): Promise<void> {
    if (neo4jClient) {
      await neo4jClient.disconnect();
    }
  }

  onInitialized(callback: () => void): void {
    if (this.isNeo4jAvailable) {
      callback();
    }
    this.eventEmitter.on('initialized', callback);
  }

  onError(callback: (error: string) => void): void {
    this.eventEmitter.on('error', callback);
  }

  onWarning(callback: (message: string) => void): void {
    this.eventEmitter.on('warning', callback);
  }

  onUpdateProgress(callback: (data: any) => void): void {
    this.eventEmitter.on('updateStart', callback);
    this.eventEmitter.on('entitiesProcessed', callback);
    this.eventEmitter.on('relationsProcessed', callback);
    this.eventEmitter.on('updateComplete', callback);
  }
}