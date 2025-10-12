# 🔒 **RAG, KNOWLEDGE BASE & VECTORIZATION - MULTI-TENANCY**

## ⚠️ **CRITICAL SECURITY ISSUE IDENTIFIED**

**Current Status**: RAG/KB/Vector components are **NOT organization-aware**
- ❌ Vector search searches across ALL organizations
- ❌ Knowledge graphs are shared across organizations
- ❌ Memories are not isolated by organization
- ❌ **MAJOR DATA LEAK RISK** 🚨

---

## 🎯 **REQUIRED CHANGES**

### **1. Vector Store (Pinecone/Embeddings)**

#### **Current Issue**:
```typescript
// ❌ PROBLEM: Searches ALL vectors regardless of organization
await vectorStore.search(query, { topK: 5 });
```

#### **Required Solution**:
```typescript
// ✅ SOLUTION: Filter by organization namespace
await vectorStore.search(query, { 
  topK: 5,
  filter: { 
    organization_id: { $eq: currentOrgId },
    user_id: { $in: [userId, null] } // User's own + org shared
  }
});
```

#### **Implementation**:

**A. Update Vector Store Manager**:
```typescript
// src/services/vectorization/VectorStoreManager.ts

export interface VectorMetadata {
  organization_id: string | null;
  user_id: string;
  visibility: 'private' | 'organization' | 'public';
  document_id: string;
  created_at: string;
  // ... other metadata
}

export class VectorStoreManager {
  private currentOrganizationId: string | null = null;
  private currentUserId: string | null = null;

  /**
   * Set organization context for vector operations
   */
  setOrganizationContext(organizationId: string | null, userId: string): void {
    this.currentOrganizationId = organizationId;
    this.currentUserId = userId;
  }

  /**
   * Organization-aware vector upsert
   */
  async upsert(vectors: Array<{
    id: string;
    values: number[];
    metadata: Record<string, any>;
  }>): Promise<void> {
    // Add organization context to metadata
    const enhancedVectors = vectors.map(v => ({
      ...v,
      metadata: {
        ...v.metadata,
        organization_id: this.currentOrganizationId,
        user_id: this.currentUserId,
        visibility: v.metadata.visibility || 'private'
      }
    }));

    await this.vectorStore.upsert(enhancedVectors);
  }

  /**
   * Organization-aware vector search
   */
  async search(
    query: number[],
    options: {
      topK?: number;
      threshold?: number;
      includeOrgShared?: boolean;
    } = {}
  ): Promise<SearchResult[]> {
    if (!this.currentUserId) {
      throw new Error('User context not set for vector search');
    }

    // Build organization filter
    const filter: any = {
      $or: [
        // User's private vectors
        {
          user_id: { $eq: this.currentUserId },
          visibility: { $eq: 'private' }
        }
      ]
    };

    // Include organization-shared vectors if in org context
    if (this.currentOrganizationId && options.includeOrgShared !== false) {
      filter.$or.push({
        organization_id: { $eq: this.currentOrganizationId },
        visibility: { $in: ['organization', 'public'] }
      });
    }

    // Always include public vectors
    filter.$or.push({
      visibility: { $eq: 'public' }
    });

    const results = await this.vectorStore.search(query, {
      topK: options.topK || 5,
      filter,
      threshold: options.threshold || 0.7
    });

    console.log(`🔍 Vector search: ${results.length} results (org: ${this.currentOrganizationId})`);
    return results;
  }
}
```

**B. Update Vector Search Service**:
```typescript
// src/services/vectorization/VectorSearchService.ts

export class VectorSearchService {
  private vectorStore: VectorStoreManager;
  private organizationContext: {
    organizationId: string | null;
    userId: string;
  } | null = null;

  setOrganizationContext(orgId: string | null, userId: string): void {
    this.organizationContext = { organizationId: orgId, userId };
    this.vectorStore.setOrganizationContext(orgId, userId);
  }

  async indexDocument(document: Document, orgId?: string): Promise<void> {
    const embeddings = await generateEmbeddings(document.content);

    await this.vectorStore.upsert([{
      id: document.id,
      values: embeddings,
      metadata: {
        organization_id: orgId || this.organizationContext?.organizationId,
        user_id: this.organizationContext?.userId,
        visibility: document.visibility || 'private',
        content: document.content,
        title: document.title,
        created_at: new Date().toISOString()
      }
    }]);
  }

  async searchSimilarDocuments(
    query: string,
    options: {
      organizationId?: string;
      userId?: string;
      topK?: number;
      threshold?: number;
    } = {}
  ): Promise<SearchResult[]> {
    // Use provided context or fall back to current context
    const orgId = options.organizationId || this.organizationContext?.organizationId;
    const userId = options.userId || this.organizationContext?.userId;

    if (!userId) {
      throw new Error('User context required for document search');
    }

    // Temporarily set context if provided
    if (options.organizationId || options.userId) {
      this.vectorStore.setOrganizationContext(orgId, userId!);
    }

    const queryEmbedding = await generateEmbeddings(query);
    return await this.vectorStore.search(queryEmbedding, {
      topK: options.topK,
      threshold: options.threshold,
      includeOrgShared: true
    });
  }
}
```

---

### **2. Knowledge Graph (Neo4j)**

#### **Current Issue**:
```typescript
// ❌ PROBLEM: All nodes in single graph
await neo4j.run('MATCH (n:Entity) RETURN n');
```

#### **Required Solution**:
```typescript
// ✅ SOLUTION: Namespace by organization
await neo4j.run(`
  MATCH (n:Entity {organization_id: $orgId})
  WHERE n.visibility IN ['organization', 'public']
  RETURN n
`, { orgId });
```

#### **Implementation**:

```typescript
// src/services/knowledge/graph/KnowledgeGraphManager.ts

export class KnowledgeGraphManager {
  private currentOrganizationId: string | null = null;
  private currentUserId: string | null = null;

  setOrganizationContext(orgId: string | null, userId: string): void {
    this.currentOrganizationId = orgId;
    this.currentUserId = userId;
    console.log(`🏢 Knowledge Graph org context: ${orgId}`);
  }

  /**
   * Create node with organization context
   */
  async createNode(node: KnowledgeNode): Promise<void> {
    const enhancedNode = {
      ...node,
      organization_id: this.currentOrganizationId,
      user_id: this.currentUserId,
      visibility: node.visibility || 'private',
      created_at: new Date().toISOString()
    };

    await neo4jClient.run(`
      CREATE (n:Entity {
        id: $id,
        type: $type,
        name: $name,
        organization_id: $organization_id,
        user_id: $user_id,
        visibility: $visibility,
        properties: $properties,
        created_at: $created_at
      })
    `, enhancedNode);
  }

  /**
   * Search with organization filtering
   */
  async searchGraph(query: string): Promise<GraphSearchResult> {
    if (!this.currentUserId) {
      throw new Error('User context required for graph search');
    }

    // Build visibility filter
    const visibilityFilter = this.currentOrganizationId
      ? `(n.visibility = 'public' OR 
          (n.visibility = 'organization' AND n.organization_id = $orgId) OR
          (n.visibility = 'private' AND n.user_id = $userId))`
      : `(n.visibility = 'public' OR n.user_id = $userId)`;

    const result = await neo4jClient.run(`
      MATCH (n:Entity)
      WHERE ${visibilityFilter}
        AND (n.name CONTAINS $query OR n.description CONTAINS $query)
      OPTIONAL MATCH (n)-[r]->(m:Entity)
      WHERE ${visibilityFilter.replace(/n\./g, 'm.')}
      RETURN n, collect(r) as relations, collect(m) as related
      LIMIT 20
    `, {
      query,
      orgId: this.currentOrganizationId,
      userId: this.currentUserId
    });

    return this.processGraphResults(result);
  }

  /**
   * Semantic search with embeddings + org filtering
   */
  async semanticSearch(query: string, options: {
    topK?: number;
    threshold?: number;
  } = {}): Promise<KnowledgeNode[]> {
    // Generate query embedding
    const queryEmbedding = await generateEmbeddings(query);

    // Search with org filter
    const visibilityFilter = this.currentOrganizationId
      ? `(n.visibility = 'public' OR 
          (n.visibility = 'organization' AND n.organization_id = $orgId) OR
          (n.visibility = 'private' AND n.user_id = $userId))`
      : `(n.visibility = 'public' OR n.user_id = $userId)`;

    const result = await neo4jClient.run(`
      MATCH (n:Entity)
      WHERE ${visibilityFilter}
        AND n.embedding IS NOT NULL
      WITH n, 
           gds.similarity.cosine(n.embedding, $queryEmbedding) AS similarity
      WHERE similarity > $threshold
      RETURN n
      ORDER BY similarity DESC
      LIMIT $topK
    `, {
      queryEmbedding,
      threshold: options.threshold || 0.7,
      topK: options.topK || 10,
      orgId: this.currentOrganizationId,
      userId: this.currentUserId
    });

    return result.records.map(r => r.get('n').properties);
  }
}
```

---

### **3. Memory Service**

#### **Current Issue**:
```typescript
// ❌ PROBLEM: Memories searchable across all users
await memoryService.searchMemories({ userId: 'user123' });
```

#### **Required Solution**:
```typescript
// ✅ SOLUTION: Add organization boundary
await memoryService.searchMemories({ 
  userId: 'user123',
  organizationId: 'org456' // ← Add this
});
```

#### **Implementation**:

```typescript
// src/services/memory/MemoryService.ts

export interface MemoryQuery {
  userId: string;
  organizationId?: string; // ✅ Add organization context
  type?: MemoryType | MemoryType[];
  tags?: string[];
  minImportance?: number;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export class MemoryService {
  private currentOrganizationId: string | null = null;

  setOrganizationContext(orgId: string | null): void {
    this.currentOrganizationId = orgId;
    console.log(`🏢 Memory Service org context: ${orgId}`);
  }

  /**
   * Store memory with organization context
   */
  async storeAdvancedMemory(
    memory: Omit<AdvancedMemory, 'id' | 'createdAt' | 'accessCount'>
  ): Promise<string> {
    const memoryId = crypto.randomUUID();
    const text = typeof memory.content === 'string' 
      ? memory.content 
      : JSON.stringify(memory.content);
    
    const embeddings = await generateEmbeddings(text);
    
    const advancedMemory: AdvancedMemory = {
      ...memory,
      id: memoryId,
      createdAt: new Date().toISOString(),
      accessCount: 0,
      embeddings
    };

    // Store in vector database with org context
    const vectorStore = await getVectorStore();
    if (vectorStore) {
      await vectorStore.upsert([{
        id: memoryId,
        values: embeddings,
        metadata: {
          type: memory.type,
          userId: memory.userId,
          organization_id: this.currentOrganizationId, // ✅ Add org context
          visibility: memory.visibility || 'private', // ✅ Add visibility
          content: text,
          importance: memory.importance,
          tags: memory.tags,
          relationships: memory.relationships,
          metadata: memory.metadata,
          createdAt: new Date().toISOString()
        }
      }]);
    }

    console.log(`🧠 Stored memory: ${memoryId} (org: ${this.currentOrganizationId})`);
    return memoryId;
  }

  /**
   * Search memories with organization filtering
   */
  async searchAdvancedMemories(query: MemoryQuery): Promise<AdvancedMemory[]> {
    const queryText = typeof query === 'string' ? query : JSON.stringify(query);
    const queryEmbedding = await generateEmbeddings(queryText);

    // Build filter with organization context
    const filter: any = {
      userId: { $eq: query.userId }
    };

    // Add organization filtering
    if (query.organizationId || this.currentOrganizationId) {
      const orgId = query.organizationId || this.currentOrganizationId;
      filter.$or = [
        { visibility: { $eq: 'private' }, userId: { $eq: query.userId } },
        { visibility: { $eq: 'organization' }, organization_id: { $eq: orgId } },
        { visibility: { $eq: 'public' } }
      ];
    } else {
      // No org context - only private memories
      filter.visibility = { $eq: 'private' };
    }

    // Add type filter
    if (query.type) {
      filter.type = Array.isArray(query.type)
        ? { $in: query.type }
        : { $eq: query.type };
    }

    // Add importance filter
    if (query.minImportance !== undefined) {
      filter.importance = { $gte: query.minImportance };
    }

    const vectorStore = await getVectorStore();
    const results = await vectorStore.search(queryEmbedding, {
      topK: query.limit || 10,
      filter,
      threshold: 0.7
    });

    console.log(`🔍 Memory search: ${results.length} results (org: ${this.currentOrganizationId})`);
    return results.map(r => this.hydrateMemory(r));
  }
}
```

---

### **4. Base Agent RAG Integration**

#### **Update BaseAgent to pass organization context**:

```typescript
// src/services/agent/BaseAgent.ts

export abstract class BaseAgent {
  protected organizationId: string | null = null;
  protected userId: string | null = null;

  setOrganizationContext(orgId: string | null, userId: string): void {
    this.organizationId = orgId;
    this.userId = userId;

    // Propagate to all RAG services
    const vectorSearch = VectorSearchService.getInstance();
    vectorSearch.setOrganizationContext(orgId, userId);

    const knowledgeGraph = KnowledgeGraphManager.getInstance();
    knowledgeGraph.setOrganizationContext(orgId, userId);

    const memoryService = MemoryService.getInstance();
    memoryService.setOrganizationContext(orgId);

    console.log(`🏢 Agent ${this.id} org context set: ${orgId}`);
  }

  /**
   * RAG-powered response with organization isolation
   */
  protected async buildRAGContext(
    userMessage: string,
    conversationHistory: Array<{ role: string; content: string }>,
    userId: string
  ): Promise<RAGContext> {
    // Ensure organization context is set
    if (!this.userId) {
      this.userId = userId;
    }

    console.log(`🧠 Building RAG context (org: ${this.organizationId})`);
    
    try {
      // All searches now automatically filtered by organization
      const [vectorResults, graphResults, memories, summarizedHistory] = await Promise.all([
        this.searchVectorStore(userMessage, userId),
        this.searchKnowledgeGraph(userMessage, userId),
        this.searchMemories(userMessage, userId),
        this.summarizeConversation(conversationHistory)
      ]);

      return {
        vectorResults,
        graphResults,
        memories,
        summarizedHistory,
        tokenUsage: this.calculateTokenUsage(conversationHistory, summarizedHistory)
      };
    } catch (error) {
      console.error('RAG context building error:', error);
      return this.getEmptyRAGContext(conversationHistory);
    }
  }

  private async searchVectorStore(query: string, userId: string) {
    const vectorSearch = VectorSearchService.getInstance();
    return await vectorSearch.searchSimilarDocuments(query, {
      organizationId: this.organizationId || undefined,
      userId,
      topK: 5,
      threshold: 0.7
    });
  }

  private async searchKnowledgeGraph(query: string, userId: string) {
    const knowledgeGraph = KnowledgeGraphManager.getInstance();
    return await knowledgeGraph.semanticSearch(query, {
      topK: 10,
      threshold: 0.7
    });
  }

  private async searchMemories(query: string, userId: string) {
    const memoryService = MemoryService.getInstance();
    return await memoryService.searchAdvancedMemories({
      userId,
      organizationId: this.organizationId || undefined,
      limit: 10,
      minImportance: 0.5
    });
  }
}
```

---

## 🔐 **SECURITY VALIDATION**

### **Test Cases**:

```typescript
// Test 1: Cross-organization data leak
async function testOrganizationIsolation() {
  // User A in Org 1
  const vectorSearch = VectorSearchService.getInstance();
  vectorSearch.setOrganizationContext('org1', 'userA');
  
  // Index document
  await vectorSearch.indexDocument({
    id: 'doc1',
    content: 'Secret org 1 data',
    visibility: 'organization'
  });

  // User B in Org 2
  vectorSearch.setOrganizationContext('org2', 'userB');
  
  // Search should NOT find org 1 data
  const results = await vectorSearch.searchSimilarDocuments('Secret');
  assert(results.length === 0, 'Cross-org data leak detected!');
}

// Test 2: Private vs organization visibility
async function testVisibility() {
  const vectorSearch = VectorSearchService.getInstance();
  
  // User A creates private doc
  vectorSearch.setOrganizationContext('org1', 'userA');
  await vectorSearch.indexDocument({
    id: 'doc2',
    content: 'Private data',
    visibility: 'private'
  });

  // User B in same org should NOT see private doc
  vectorSearch.setOrganizationContext('org1', 'userB');
  const results = await vectorSearch.searchSimilarDocuments('Private');
  assert(results.length === 0, 'Private document visible to other users!');
}
```

---

## 📊 **DATABASE UPDATES NEEDED**

### **Add indexes for performance**:

```sql
-- Pinecone metadata indexes (if using Pinecone)
-- These are handled by Pinecone's filter system

-- Neo4j indexes
CREATE INDEX entity_org_visibility IF NOT EXISTS 
FOR (n:Entity) ON (n.organization_id, n.visibility);

CREATE INDEX entity_user_visibility IF NOT EXISTS 
FOR (n:Entity) ON (n.user_id, n.visibility);

-- Optimize organization + visibility queries
CREATE INDEX entity_org_user_visibility IF NOT EXISTS 
FOR (n:Entity) ON (n.organization_id, n.user_id, n.visibility);
```

---

## ✅ **IMPLEMENTATION CHECKLIST**

### **Vector Store**:
- [ ] Add organization_id to vector metadata
- [ ] Add visibility field to vector metadata
- [ ] Update upsert to include org context
- [ ] Update search to filter by org
- [ ] Test cross-org isolation

### **Knowledge Graph**:
- [ ] Add organization_id property to nodes
- [ ] Add visibility property to nodes
- [ ] Update all queries with org filter
- [ ] Update semantic search with org filter
- [ ] Test cross-org isolation

### **Memory Service**:
- [ ] Add organization_id to memory storage
- [ ] Add visibility field to memories
- [ ] Update memory search with org filter
- [ ] Update memory consolidation per org
- [ ] Test cross-org isolation

### **Base Agent**:
- [ ] Add setOrganizationContext method
- [ ] Propagate org context to all RAG services
- [ ] Update RAG context building
- [ ] Test RAG with org isolation

### **Integration**:
- [ ] Update Agent Factory to set org context on agent creation
- [ ] Update ChatProcessor to pass org context to agents
- [ ] Update Orchestrator to maintain org context
- [ ] End-to-end testing

---

## 🚨 **CRITICAL PRIORITY**

This is a **SECURITY ISSUE** and must be fixed before production:

1. **Data Leak Risk**: HIGH - Users can currently see other orgs' data
2. **Privacy Violation**: HIGH - Violates org isolation
3. **Compliance Risk**: HIGH - GDPR/SOC2 requirement

**Estimated Time**: 4-6 hours to implement and test fully

---

## 🎯 **QUICK FIX (Temporary)**

Until full implementation, add this check:

```typescript
// In all RAG components, add this validation
function validateOrganizationContext(
  requestedOrgId: string | null,
  currentOrgId: string | null
): void {
  if (requestedOrgId && requestedOrgId !== currentOrgId) {
    throw new Error('Organization context mismatch - possible security breach');
  }
}
```

---

**⚠️ THIS IS THE MOST CRITICAL REMAINING TASK FOR MULTI-TENANCY SECURITY!**

