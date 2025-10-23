import type { KnowledgeNode, KnowledgeRelation } from '../../../types/knowledge';
import { neo4jClient } from '../../neo4j/client';
import { EntityManager } from './EntityManager';
import { RelationManager } from './RelationManager';
import { HierarchyManager } from './HierarchyManager';
import { EventEmitter } from '../../../utils/events/EventEmitter';
import { generateEmbeddings } from '../../openai/embeddings';

// ENHANCED: Advanced knowledge graph types
export interface GraphQuery {
  query: string;
  parameters?: Record<string, any>;
  returnFields?: string[];
}

export interface GraphSearchResult {
  nodes: KnowledgeNode[];
  relations: KnowledgeRelation[];
  paths: Array<{
    nodes: KnowledgeNode[];
    relations: KnowledgeRelation[];
    confidence: number;
  }>;
  metadata: {
    executionTime: number;
    resultCount: number;
    queryComplexity: 'simple' | 'medium' | 'complex';
  };
}

export interface SemanticGraphQuery {
  text: string;
  intent: 'find_entities' | 'find_relationships' | 'find_paths' | 'reasoning' | 'similarity';
  context?: string;
  filters?: Record<string, any>;
  limit?: number;
}

export interface GraphInsight {
  type: 'pattern' | 'anomaly' | 'recommendation' | 'prediction';
  title: string;
  description: string;
  confidence: number;
  entities: KnowledgeNode[];
  evidence: KnowledgeRelation[];
  actionable: boolean;
}

export class KnowledgeGraphManager {
  private static instance: KnowledgeGraphManager | null = null;
  private entityManager: EntityManager;
  private relationManager: RelationManager;
  private hierarchyManager: HierarchyManager;
  private eventEmitter: EventEmitter;
  private isNeo4jAvailable: boolean = false;
  private initPromise: Promise<void> | null = null;
  private currentOrganizationId: string | null = null;

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

  /**
   * Set organization context for multi-tenancy
   */
  setOrganizationContext(organizationId: string | null): void {
    this.currentOrganizationId = organizationId;
    console.log(`🏢 KnowledgeGraphManager organization context set: ${organizationId || 'none'}`);
  }

  /**
   * Get current organization context
   */
  getOrganizationContext(): string | null {
    return this.currentOrganizationId;
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

  /**
   * ENHANCED: Semantic search in knowledge graph using natural language
   */
  async semanticSearch(query: SemanticGraphQuery): Promise<GraphSearchResult> {
    const startTime = Date.now();
    
    if (!this.isNeo4jAvailable || !neo4jClient) {
      return {
        nodes: [],
        relations: [],
        paths: [],
        metadata: {
          executionTime: 0,
          resultCount: 0,
          queryComplexity: 'simple'
        }
      };
    }

    try {
      console.log(`🔍 Semantic graph search: ${query.intent}`);
      
      // Generate embeddings for semantic similarity
      const queryEmbeddings = await generateEmbeddings(query.text);
      
      // Build Cypher query based on intent
      const cypherQuery = this.buildSemanticQuery(query, queryEmbeddings);
      
      // Execute query
      const result = await neo4jClient.executeQuery(cypherQuery.query, cypherQuery.parameters);
      
      // Process results
      const searchResult = this.processSearchResults(result, query);
      
      return {
        ...searchResult,
        metadata: {
          ...searchResult.metadata,
          executionTime: Date.now() - startTime
        }
      };
      
    } catch (error) {
      console.error('Semantic graph search error:', error);
      throw error;
    }
  }

  /**
   * ENHANCED: Build semantic Cypher query based on intent
   */
  private buildSemanticQuery(query: SemanticGraphQuery, embeddings: number[]): GraphQuery {
    const limit = query.limit || 10;
    
    switch (query.intent) {
      case 'find_entities':
        return {
          query: `
            MATCH (n)
            WHERE n.embeddings IS NOT NULL
            WITH n, vector.similarity.cosine(n.embeddings, $embeddings) as similarity
            WHERE similarity > 0.7
            RETURN n
            ORDER BY similarity DESC
            LIMIT $limit
          `,
          parameters: { embeddings, limit }
        };
        
      case 'find_relationships':
        return {
          query: `
            MATCH (a)-[r]->(b)
            WHERE a.embeddings IS NOT NULL OR b.embeddings IS NOT NULL
            WITH a, r, b, 
                 vector.similarity.cosine(a.embeddings, $embeddings) as aSim,
                 vector.similarity.cosine(b.embeddings, $embeddings) as bSim
            WHERE aSim > 0.6 OR bSim > 0.6
            RETURN a, r, b
            ORDER BY (aSim + bSim) / 2 DESC
            LIMIT $limit
          `,
          parameters: { embeddings, limit }
        };
        
      case 'find_paths':
        return {
          query: `
            MATCH path = (start)-[*1..3]-(end)
            WHERE start.embeddings IS NOT NULL AND end.embeddings IS NOT NULL
            WITH path, 
                 vector.similarity.cosine(start.embeddings, $embeddings) as startSim,
                 vector.similarity.cosine(end.embeddings, $embeddings) as endSim
            WHERE startSim > 0.6 OR endSim > 0.6
            RETURN path
            ORDER BY (startSim + endSim) / 2 DESC
            LIMIT $limit
          `,
          parameters: { embeddings, limit }
        };
        
      case 'reasoning':
        return {
          query: `
            MATCH (n)
            WHERE n.embeddings IS NOT NULL
            WITH n, vector.similarity.cosine(n.embeddings, $embeddings) as similarity
            WHERE similarity > 0.5
            MATCH (n)-[r*1..2]-(related)
            RETURN n, r, related
            ORDER BY similarity DESC
            LIMIT $limit
          `,
          parameters: { embeddings, limit }
        };
        
      default:
        return {
          query: `
            MATCH (n)
            WHERE n.embeddings IS NOT NULL
            WITH n, vector.similarity.cosine(n.embeddings, $embeddings) as similarity
            RETURN n
            ORDER BY similarity DESC
            LIMIT $limit
          `,
          parameters: { embeddings, limit }
        };
    }
  }

  /**
   * ENHANCED: Process search results into structured format
   */
  private processSearchResults(result: any, query: SemanticGraphQuery): GraphSearchResult {
    const nodes: KnowledgeNode[] = [];
    const relations: KnowledgeRelation[] = [];
    const paths: Array<{ nodes: KnowledgeNode[]; relations: KnowledgeRelation[]; confidence: number }> = [];
    
    // Process result records
    for (const record of result.records || []) {
      const keys = record.keys;
      
      for (const key of keys) {
        const value = record.get(key);
        
        if (value && typeof value === 'object') {
          // Handle nodes
          if (value.labels) {
            nodes.push(this.recordToNode(value));
          }
          
          // Handle relations
          if (value.type) {
            relations.push(this.recordToRelation(value));
          }
          
          // Handle paths
          if (value.length !== undefined && Array.isArray(value.segments)) {
            const path = this.recordToPath(value);
            if (path) paths.push(path);
          }
        }
      }
    }
    
    return {
      nodes: [...new Set(nodes)], // Remove duplicates
      relations: [...new Set(relations)],
      paths,
      metadata: {
        executionTime: 0, // Will be set by caller
        resultCount: nodes.length + relations.length + paths.length,
        queryComplexity: this.determineQueryComplexity(query)
      }
    };
  }

  /**
   * ENHANCED: Convert Neo4j record to KnowledgeNode
   */
  private recordToNode(record: any): KnowledgeNode {
    return {
      id: record.properties?.id || record.identity?.low || crypto.randomUUID(),
      type: record.labels?.[0] || 'Unknown',
      label: record.properties?.name || record.properties?.title || 'Unnamed',
      properties: record.properties || {},
      embeddings: record.properties?.embeddings,
      sourceDocumentId: record.properties?.sourceDocumentId
    };
  }

  /**
   * ENHANCED: Convert Neo4j record to KnowledgeRelation
   */
  private recordToRelation(record: any): KnowledgeRelation {
    return {
      id: record.identity?.low || crypto.randomUUID(),
      type: record.type || 'RELATES_TO',
      sourceId: record.start?.low || record.startNode?.identity?.low || '',
      targetId: record.end?.low || record.endNode?.identity?.low || '',
      properties: record.properties || {},
      confidence: record.properties?.confidence || 0.8
    };
  }

  /**
   * ENHANCED: Convert Neo4j path to structured path
   */
  private recordToPath(record: any): { nodes: KnowledgeNode[]; relations: KnowledgeRelation[]; confidence: number } | null {
    try {
      const nodes: KnowledgeNode[] = [];
      const relations: KnowledgeRelation[] = [];
      
      // Extract nodes and relations from path segments
      for (const segment of record.segments || []) {
        if (segment.start) nodes.push(this.recordToNode(segment.start));
        if (segment.end) nodes.push(this.recordToNode(segment.end));
        if (segment.relationship) relations.push(this.recordToRelation(segment.relationship));
      }
      
      return {
        nodes: [...new Set(nodes)], // Remove duplicates
        relations: [...new Set(relations)],
        confidence: 0.8 // Default confidence
      };
    } catch (error) {
      console.error('Path conversion error:', error);
      return null;
    }
  }

  /**
   * ENHANCED: Determine query complexity
   */
  private determineQueryComplexity(query: SemanticGraphQuery): 'simple' | 'medium' | 'complex' {
    if (query.intent === 'find_entities') return 'simple';
    if (query.intent === 'find_relationships') return 'medium';
    return 'complex';
  }

  /**
   * ENHANCED: Generate insights from knowledge graph
   */
  async generateInsights(): Promise<GraphInsight[]> {
    if (!this.isNeo4jAvailable || !neo4jClient) {
      return [];
    }

    try {
      console.log('🧠 Generating knowledge graph insights...');
      
      const insights: GraphInsight[] = [];
      
      // 1. Find isolated nodes (potential orphans)
      const isolatedNodes = await this.findIsolatedNodes();
      if (isolatedNodes.length > 0) {
        insights.push({
          type: 'anomaly',
          title: 'Isolated Knowledge Nodes',
          description: `Found ${isolatedNodes.length} nodes with no relationships`,
          confidence: 0.9,
          entities: isolatedNodes,
          evidence: [],
          actionable: true
        });
      }
      
      // 2. Find highly connected nodes (hubs)
      const hubNodes = await this.findHubNodes();
      if (hubNodes.length > 0) {
        insights.push({
          type: 'pattern',
          title: 'Knowledge Hubs',
          description: `Found ${hubNodes.length} highly connected nodes`,
          confidence: 0.8,
          entities: hubNodes,
          evidence: [],
          actionable: true
        });
      }
      
      // 3. Find potential missing relationships
      const missingRelations = await this.findMissingRelations();
      if (missingRelations.length > 0) {
        insights.push({
          type: 'recommendation',
          title: 'Potential Missing Relationships',
          description: `Found ${missingRelations.length} potential connections`,
          confidence: 0.6,
          entities: missingRelations,
          evidence: [],
          actionable: true
        });
      }
      
      return insights;
      
    } catch (error) {
      console.error('Insight generation error:', error);
      return [];
    }
  }

  /**
   * ENHANCED: Find isolated nodes
   */
  private async findIsolatedNodes(): Promise<KnowledgeNode[]> {
    try {
      const result = await neo4jClient?.executeQuery(`
        MATCH (n)
        WHERE NOT (n)--()
        RETURN n
        LIMIT 10
      `);
      
      return (result?.records || []).map(record => 
        this.recordToNode(record.get('n'))
      );
    } catch (error) {
      console.error('Isolated nodes query error:', error);
      return [];
    }
  }

  /**
   * ENHANCED: Find hub nodes (highly connected)
   */
  private async findHubNodes(): Promise<KnowledgeNode[]> {
    try {
      const result = await neo4jClient?.executeQuery(`
        MATCH (n)-[r]-(connected)
        WITH n, count(r) as connections
        WHERE connections > 5
        RETURN n, connections
        ORDER BY connections DESC
        LIMIT 10
      `);
      
      return (result?.records || []).map(record => 
        this.recordToNode(record.get('n'))
      );
    } catch (error) {
      console.error('Hub nodes query error:', error);
      return [];
    }
  }

  /**
   * ENHANCED: Find potential missing relationships
   */
  private async findMissingRelations(): Promise<KnowledgeNode[]> {
    try {
      const result = await neo4jClient?.executeQuery(`
        MATCH (a), (b)
        WHERE a <> b AND NOT (a)--(b)
        WITH a, b, 
             vector.similarity.cosine(a.embeddings, b.embeddings) as similarity
        WHERE a.embeddings IS NOT NULL AND b.embeddings IS NOT NULL 
              AND similarity > 0.8
        RETURN a, b, similarity
        ORDER BY similarity DESC
        LIMIT 5
      `);
      
      const nodes: KnowledgeNode[] = [];
      for (const record of result?.records || []) {
        nodes.push(this.recordToNode(record.get('a')));
        nodes.push(this.recordToNode(record.get('b')));
      }
      
      return nodes;
    } catch (error) {
      console.error('Missing relations query error:', error);
      return [];
    }
  }

  /**
   * ENHANCED: Perform graph analytics
   */
  async performAnalytics(): Promise<{
    totalNodes: number;
    totalRelations: number;
    nodeTypes: Record<string, number>;
    relationTypes: Record<string, number>;
    averageConnections: number;
    graphDensity: number;
  }> {
    if (!this.isNeo4jAvailable || !neo4jClient) {
      return {
        totalNodes: 0,
        totalRelations: 0,
        nodeTypes: {},
        relationTypes: {},
        averageConnections: 0,
        graphDensity: 0
      };
    }

    try {
      // Get basic counts
      const [nodeCount, relationCount] = await Promise.all([
        neo4jClient.executeQuery('MATCH (n) RETURN count(n) as count'),
        neo4jClient.executeQuery('MATCH ()-[r]->() RETURN count(r) as count')
      ]);

      const totalNodes = nodeCount.records[0]?.get('count')?.low || 0;
      const totalRelations = relationCount.records[0]?.get('count')?.low || 0;

      // Get node type distribution
      const nodeTypesResult = await neo4jClient.executeQuery(`
        MATCH (n)
        RETURN labels(n)[0] as label, count(n) as count
        ORDER BY count DESC
      `);

      const nodeTypes: Record<string, number> = {};
      for (const record of nodeTypesResult.records) {
        const label = record.get('label');
        const count = record.get('count')?.low || 0;
        nodeTypes[label] = count;
      }

      // Get relation type distribution
      const relationTypesResult = await neo4jClient.executeQuery(`
        MATCH ()-[r]->()
        RETURN type(r) as type, count(r) as count
        ORDER BY count DESC
      `);

      const relationTypes: Record<string, number> = {};
      for (const record of relationTypesResult.records) {
        const type = record.get('type');
        const count = record.get('count')?.low || 0;
        relationTypes[type] = count;
      }

      // Calculate average connections and graph density
      const averageConnections = totalNodes > 0 ? (totalRelations * 2) / totalNodes : 0;
      const maxPossibleConnections = totalNodes * (totalNodes - 1);
      const graphDensity = maxPossibleConnections > 0 ? totalRelations / maxPossibleConnections : 0;

      return {
        totalNodes,
        totalRelations,
        nodeTypes,
        relationTypes,
        averageConnections,
        graphDensity
      };

    } catch (error) {
      console.error('Graph analytics error:', error);
      throw error;
    }
  }
}