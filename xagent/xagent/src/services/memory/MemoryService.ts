import { isServiceConfigured } from '../../config/environment';
import { createChatCompletion } from '../openai/chat';
import { generateEmbeddings } from '../openai/embeddings';
import { getVectorStore } from '../pinecone/client';

type ChatTurn = {
  timestamp: string;
  role: 'user' | 'assistant';
  content: string;
};

type EpisodicRecord = {
  id: string;
  userId: string;
  threadId: string;
  goal: string;
  summary: string;
  urls?: string[];
  createdAt: string;
};

// ENHANCED: Advanced memory types
export interface AdvancedMemory {
  id: string;
  userId: string;
  type: MemoryType;
  content: any;
  embeddings?: number[];
  metadata: MemoryMetadata;
  createdAt: string;
  lastAccessed?: string;
  accessCount: number;
  importance: number; // 0-1 scale
  tags: string[];
  relationships: string[]; // IDs of related memories
}

export type MemoryType = 
  | 'episodic'     // Event-based memories
  | 'semantic'     // Factual knowledge
  | 'procedural'   // Skills and procedures
  | 'working'      // Short-term context
  | 'emotional'    // Emotional associations
  | 'spatial'      // Location-based memories
  | 'temporal'     // Time-based patterns
  | 'social'       // People and relationships
  | 'preference'   // User preferences
  | 'contextual';  // Context-specific data

export interface MemoryMetadata {
  source: string; // Where the memory came from
  confidence: number; // 0-1 confidence score
  context: Record<string, any>; // Additional context
  version: number; // Memory version for updates
  expiresAt?: string; // Optional expiration
  privacy: 'public' | 'private' | 'shared'; // Privacy level
}

export interface MemoryQuery {
  userId: string;
  query: string;
  types?: MemoryType[];
  tags?: string[];
  limit?: number;
  threshold?: number;
  includeEmbeddings?: boolean;
  sortBy?: 'relevance' | 'recency' | 'importance' | 'access_count';
  organizationId?: string; // Organization context for multi-tenancy
}

export interface MemoryConsolidation {
  sourceMemories: string[]; // IDs of memories to consolidate
  consolidatedMemory: AdvancedMemory;
  consolidationReason: string;
  confidence: number;
}

export class MemoryService {
  private static instance: MemoryService;
  private currentOrganizationId: string | null = null;

  static getInstance(): MemoryService {
    if (!this.instance) this.instance = new MemoryService();
    return this.instance;
  }

  /**
   * Set organization context for multi-tenancy
   */
  setOrganizationContext(organizationId: string | null): void {
    this.currentOrganizationId = organizationId;
    console.log(`🏢 MemoryService organization context set: ${organizationId || 'none'}`);
  }

  /**
   * Get current organization context
   */
  getOrganizationContext(): string | null {
    return this.currentOrganizationId;
  }

  // Extended methods for email memory integration
  async storeMemory(memory: {
    userId: string;
    type: string;
    content: any;
    metadata?: any;
    organizationId?: string; // Organization context for multi-tenancy
  }): Promise<void> {
    if (!isServiceConfigured('openai')) return;

    try {
      // Generate embeddings for the memory
      const text = typeof memory.content === 'string' 
        ? memory.content 
        : JSON.stringify(memory.content);
      
      const embeddings = await generateEmbeddings(text);
      const vectorStore = await getVectorStore();
      
      if (vectorStore) {
        // Use provided organizationId or fall back to current context
        const organizationId = memory.organizationId || this.currentOrganizationId;
        
        // Ensure content is a string (Pinecone only accepts primitives in metadata)
        const contentString = typeof memory.content === 'string' 
          ? memory.content 
          : JSON.stringify(memory.content);
        
        await vectorStore.upsert([{
          id: crypto.randomUUID(),
          values: embeddings,
          metadata: {
            type: memory.type,
            userId: memory.userId,
            organizationId: organizationId, // Add organization context
            content: contentString, // Store as string, not object
            ...memory.metadata,
            createdAt: new Date().toISOString()
          }
        }]);
      }
    } catch (error) {
      console.error('Failed to store memory:', error);
    }
  }

  async getMemories(userId: string, options?: {
    type?: string;
    limit?: number;
  }): Promise<any[]> {
    if (!isServiceConfigured('openai')) return [];

    try {
      const vectorStore = await getVectorStore();
      if (!vectorStore) return [];

      const results = await vectorStore.query({
        vector: await generateEmbeddings('user memories'),
        topK: options?.limit || 50,
        filter: {
          userId: userId,
          ...(options?.type && { type: options.type })
        },
        includeMetadata: true
      });

      return results.matches.map(m => ({
        id: m.id,
        content: m.metadata?.content,
        type: m.metadata?.type,
        metadata: m.metadata,
        timestamp: new Date(m.metadata?.createdAt || Date.now())
      }));
    } catch (error) {
      console.error('Failed to get memories:', error);
      return [];
    }
  }

  async searchMemories(query: string, userId: string, options?: {
    limit?: number;
    type?: string;
    organizationId?: string; // Organization context for multi-tenancy
  }): Promise<any[]> {
    if (!isServiceConfigured('openai')) return [];

    try {
      const queryEmbedding = await generateEmbeddings(query);
      const vectorStore = await getVectorStore();
      
      if (!vectorStore) return [];

      // Use provided organizationId or fall back to current context
      const organizationId = options?.organizationId || this.currentOrganizationId;
      
      const results = await vectorStore.query({
        vector: queryEmbedding,
        topK: options?.limit || 10,
        filter: {
          userId: userId,
          ...(options?.type && { type: options.type }),
          ...(organizationId && { organizationId: organizationId }) // Add organization filtering
        },
        includeMetadata: true
      });

      return results.matches.map(m => ({
        id: m.id,
        content: m.metadata.content,
        type: m.metadata.type,
        score: m.score,
        metadata: m.metadata
      }));
    } catch (error) {
      console.error('Failed to search memories:', error);
      return [];
    }
  }

  // Short-term: keep last N turns per thread in sessionStorage (scoped by threadId)
  recordChatTurn(threadId: string, turn: ChatTurn, maxTurns: number = 50): void {
    try {
      const key = `chat_turns_${threadId}`;
      const existing = sessionStorage.getItem(key);
      const turns: ChatTurn[] = existing ? JSON.parse(existing) : [];
      turns.push(turn);
      const trimmed = turns.slice(-maxTurns);
      sessionStorage.setItem(key, JSON.stringify(trimmed));
    } catch {
      // ignore storage errors
    }
  }

  // Episodic: summarize and embed a session outcome (stored in vector DB)
  async recordEpisodicSummary(params: {
    userId: string;
    threadId: string;
    goal: string;
    observations?: any[];
    actions?: any[];
    reflections?: any[];
    urls?: string[];
  }): Promise<void> {
    const { userId, threadId, goal, observations = [], actions = [], reflections = [], urls = [] } = params;

    // Build a concise summary with OpenAI (if available); fallback to simple join
    let summary = '';
    if (isServiceConfigured('openai')) {
      const content = `Create a concise episodic summary (<= 150 words) for this task:\n\nGoal: ${goal}\nObservations: ${JSON.stringify(observations).slice(0, 2000)}\nActions: ${JSON.stringify(actions).slice(0, 2000)}\nReflections: ${JSON.stringify(reflections).slice(0, 2000)}\n`;
      const resp = await createChatCompletion([
        { role: 'system', content: 'You summarize user task episodes for future retrieval.' },
        { role: 'user', content }
      ]);
      summary = resp?.choices?.[0]?.message?.content || '';
    }
    if (!summary) {
      summary = `Goal: ${goal}. Actions: ${actions.length}, Observations: ${observations.length}.`;
    }

    // Generate embeddings and upsert to vector store if available
    try {
      if (isServiceConfigured('openai')) {
        const embeddings = await generateEmbeddings(summary);
        const vectorStore = await getVectorStore();
        if (vectorStore) {
          await vectorStore.upsert([
            {
              id: crypto.randomUUID(),
              values: embeddings,
              metadata: {
                type: 'episode',
                userId,
                threadId,
                goal,
                summary,
                urls,
                createdAt: new Date().toISOString()
              }
            }
          ]);
        }
      }
    } catch {
      // embedding or vector upsert failed; continue without throwing
    }

    // Also store a lightweight pointer in localStorage for quick listing
    try {
      const key = `episodes_${userId}`;
      const existing = localStorage.getItem(key);
      const records: EpisodicRecord[] = existing ? JSON.parse(existing) : [];
      records.push({
        id: crypto.randomUUID(),
        userId,
        threadId,
        goal,
        summary,
        urls,
        createdAt: new Date().toISOString()
      });
      localStorage.setItem(key, JSON.stringify(records.slice(-200)));
    } catch {
      // ignore storage errors
    }
  }

  // Long-term: roll up episodic to user profile (preference/pattern summaries)
  async rollupUserProfile(userId: string): Promise<void> {
    try {
      const key = `episodes_${userId}`;
      const existing = localStorage.getItem(key);
      const records: EpisodicRecord[] = existing ? JSON.parse(existing) : [];
      if (records.length === 0) return;

      const content = `Summarize stable user preferences and successful patterns from episodes:\n${records
        .slice(-50)
        .map(r => `- [${r.createdAt}] ${r.goal}: ${r.summary}`)
        .join('\n')}`;

      let profile = '';
      if (isServiceConfigured('openai')) {
        const resp = await createChatCompletion([
          { role: 'system', content: 'You distill long-term user preferences and patterns.' },
          { role: 'user', content }
        ]);
        profile = resp?.choices?.[0]?.message?.content || '';
      }
      if (!profile) profile = 'User preferences and patterns unavailable.';

      localStorage.setItem(`user_profile_${userId}`, JSON.stringify({ updatedAt: new Date().toISOString(), profile }));
    } catch {
      // ignore failures
    }
  }

  /**
   * ENHANCED: Store advanced memory with multiple types
   */
  async storeAdvancedMemory(memory: Omit<AdvancedMemory, 'id' | 'createdAt' | 'accessCount' | 'lastAccessed'>): Promise<string> {
    if (!isServiceConfigured('openai')) {
      throw new Error('OpenAI not configured for memory storage');
    }

    try {
      const memoryId = crypto.randomUUID();
      const now = new Date().toISOString();
      
      // Generate embeddings for the memory content
      const text = typeof memory.content === 'string' 
        ? memory.content 
        : JSON.stringify(memory.content);
      
      const embeddings = await generateEmbeddings(text);
      
      // Create enhanced memory object
      const advancedMemory: AdvancedMemory = {
        ...memory,
        id: memoryId,
        createdAt: now,
        accessCount: 0,
        embeddings
      };

      // Store in vector database
      const vectorStore = await getVectorStore();
      if (vectorStore) {
        await vectorStore.upsert([{
          id: memoryId,
          values: embeddings,
          metadata: {
            type: memory.type,
            userId: memory.userId,
            content: text,
            importance: memory.importance,
            tags: memory.tags,
            relationships: memory.relationships,
            metadata: memory.metadata,
            createdAt: now
          }
        }]);
      }

      console.log(`🧠 Stored ${memory.type} memory: ${memoryId}`);
      return memoryId;
      
    } catch (error) {
      console.error('Advanced memory storage error:', error);
      throw error;
    }
  }

  /**
   * ENHANCED: Search memories with advanced querying
   */
  async searchAdvancedMemories(query: MemoryQuery): Promise<AdvancedMemory[]> {
    if (!isServiceConfigured('openai')) {
      return [];
    }

    try {
      console.log(`🔍 Searching memories: ${query.query}`);
      
      // Generate query embeddings
      const queryEmbeddings = await generateEmbeddings(query.query);
      
      // Search vector database
      const vectorStore = await getVectorStore();
      if (!vectorStore) return [];

      // Use provided organizationId or fall back to current context
      const organizationId = query.organizationId || this.currentOrganizationId;
      
      const searchResults = await vectorStore.query({
        vector: queryEmbeddings,
        topK: query.limit || 10,
        filter: {
          userId: query.userId,
          ...(query.types && { type: { $in: query.types } }),
          ...(query.tags && { tags: { $in: query.tags } }),
          ...(organizationId && { organizationId: organizationId }) // Add organization filtering
        },
        includeMetadata: true
      });

      // Transform results to AdvancedMemory format
      const memories: AdvancedMemory[] = searchResults.matches
        ?.filter(match => match.score >= (query.threshold || 0.7))
        .map(match => ({
          id: match.id,
          userId: match.metadata?.userId || '',
          type: match.metadata?.type as MemoryType || 'semantic',
          content: match.metadata?.content || '',
          embeddings: query.includeEmbeddings ? match.values : undefined,
          metadata: match.metadata?.metadata || {},
          createdAt: match.metadata?.createdAt || new Date().toISOString(),
          accessCount: 0,
          importance: match.metadata?.importance || 0.5,
          tags: match.metadata?.tags || [],
          relationships: match.metadata?.relationships || []
        })) || [];

      // Sort results
      if (query.sortBy) {
        memories.sort((a, b) => {
          switch (query.sortBy) {
            case 'recency':
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            case 'importance':
              return b.importance - a.importance;
            case 'access_count':
              return b.accessCount - a.accessCount;
            default:
              return 0; // Already sorted by relevance from vector search
          }
        });
      }

      // Update access count for retrieved memories
      await this.updateMemoryAccess(memories.map(m => m.id));

      return memories;
      
    } catch (error) {
      console.error('Memory search error:', error);
      throw error;
    }
  }

  /**
   * ENHANCED: Update memory access count and timestamp
   */
  private async updateMemoryAccess(memoryIds: string[]): Promise<void> {
    try {
      // This would update access statistics in the database
      // For now, just log the access
      console.log(`📊 Updated access for memories: ${memoryIds.join(', ')}`);
    } catch (error) {
      console.error('Memory access update error:', error);
    }
  }

  /**
   * ENHANCED: Consolidate related memories
   */
  async consolidateMemories(sourceMemoryIds: string[], consolidationReason: string): Promise<MemoryConsolidation> {
    if (!isServiceConfigured('openai')) {
      throw new Error('OpenAI not configured for memory consolidation');
    }

    try {
      console.log(`🔄 Consolidating ${sourceMemoryIds.length} memories...`);
      
      // Retrieve source memories
      const sourceMemories = await Promise.all(
        sourceMemoryIds.map(id => this.getMemoryById(id))
      );

      const validMemories = sourceMemories.filter(m => m !== null) as AdvancedMemory[];
      
      if (validMemories.length === 0) {
        throw new Error('No valid memories found for consolidation');
      }

      // Create consolidation prompt
      const consolidationPrompt = this.buildConsolidationPrompt(validMemories, consolidationReason);
      
      // Use LLM to consolidate memories
      const consolidatedContent = await createChatCompletion([
        {
          role: 'system',
          content: 'You are an expert at consolidating and synthesizing information from multiple sources. Create a comprehensive, coherent summary that captures the essential information while removing redundancy.'
        },
        {
          role: 'user',
          content: consolidationPrompt
        }
      ]);

      // Generate embeddings for consolidated content
      const embeddings = await generateEmbeddings(consolidatedContent);

      // Create consolidated memory
      const consolidatedMemory: AdvancedMemory = {
        id: crypto.randomUUID(),
        userId: validMemories[0].userId,
        type: this.determineConsolidatedType(validMemories),
        content: consolidatedContent,
        embeddings,
        metadata: {
          source: 'consolidation',
          confidence: this.calculateConsolidationConfidence(validMemories),
          context: {
            originalCount: validMemories.length,
            consolidationReason,
            sourceIds: sourceMemoryIds
          },
          version: 1,
          privacy: 'private'
        },
        createdAt: new Date().toISOString(),
        accessCount: 0,
        importance: Math.max(...validMemories.map(m => m.importance)),
        tags: [...new Set(validMemories.flatMap(m => m.tags))],
        relationships: [...new Set(validMemories.flatMap(m => m.relationships))]
      };

      // Store consolidated memory
      const consolidatedId = await this.storeAdvancedMemory({
        ...consolidatedMemory,
        id: undefined as any,
        createdAt: undefined as any,
        accessCount: undefined as any
      });

      const consolidation: MemoryConsolidation = {
        sourceMemories: sourceMemoryIds,
        consolidatedMemory: { ...consolidatedMemory, id: consolidatedId },
        consolidationReason,
        confidence: consolidatedMemory.metadata.confidence
      };

      console.log(`✅ Consolidated ${sourceMemoryIds.length} memories into ${consolidatedId}`);
      return consolidation;
      
    } catch (error) {
      console.error('Memory consolidation error:', error);
      throw error;
    }
  }

  /**
   * ENHANCED: Get memory by ID
   */
  private async getMemoryById(id: string): Promise<AdvancedMemory | null> {
    try {
      // This would retrieve from database in production
      // For now, return null as placeholder
      return null;
    } catch (error) {
      console.error('Get memory by ID error:', error);
      return null;
    }
  }

  /**
   * ENHANCED: Build consolidation prompt
   */
  private buildConsolidationPrompt(memories: AdvancedMemory[], reason: string): string {
    const memorySummaries = memories.map((memory, index) => 
      `Memory ${index + 1} (${memory.type}):\n${typeof memory.content === 'string' ? memory.content : JSON.stringify(memory.content)}\n`
    ).join('\n');

    return `
Consolidation Reason: ${reason}

Source Memories:
${memorySummaries}

Please create a consolidated memory that:
1. Captures the essential information from all source memories
2. Removes redundancy and contradictions
3. Maintains important details and context
4. Is coherent and well-structured
5. Preserves the original intent and meaning

Provide only the consolidated content, no additional commentary.
    `.trim();
  }

  /**
   * ENHANCED: Determine consolidated memory type
   */
  private determineConsolidatedType(memories: AdvancedMemory[]): MemoryType {
    // If all memories are the same type, use that type
    const types = [...new Set(memories.map(m => m.type))];
    if (types.length === 1) return types[0];

    // Otherwise, determine the most appropriate type
    const typeCounts = memories.reduce((acc, memory) => {
      acc[memory.type] = (acc[memory.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Return the most common type, with semantic as fallback
    const mostCommonType = Object.entries(typeCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] as MemoryType;
    
    return mostCommonType || 'semantic';
  }

  /**
   * ENHANCED: Calculate consolidation confidence
   */
  private calculateConsolidationConfidence(memories: AdvancedMemory[]): number {
    // Average confidence of source memories, with penalty for large numbers
    const avgConfidence = memories.reduce((sum, m) => sum + m.metadata.confidence, 0) / memories.length;
    const sizePenalty = Math.max(0, 1 - (memories.length - 1) * 0.1); // 10% penalty per additional memory
    
    return Math.min(1, avgConfidence * sizePenalty);
  }

  /**
   * ENHANCED: Get memory insights and analytics
   */
  async getMemoryInsights(userId: string): Promise<{
    totalMemories: number;
    memoryTypes: Record<MemoryType, number>;
    averageImportance: number;
    mostAccessedMemories: AdvancedMemory[];
    recentMemories: AdvancedMemory[];
    memoryGrowth: Array<{ date: string; count: number }>;
  }> {
    try {
      // This would query the database in production
      // For now, return placeholder data
      return {
        totalMemories: 0,
        memoryTypes: {} as Record<MemoryType, number>,
        averageImportance: 0.5,
        mostAccessedMemories: [],
        recentMemories: [],
        memoryGrowth: []
      };
    } catch (error) {
      console.error('Memory insights error:', error);
      throw error;
    }
  }

  /**
   * ENHANCED: Clean up expired memories
   */
  async cleanupExpiredMemories(): Promise<number> {
    try {
      console.log('🧹 Cleaning up expired memories...');
      
      // This would query and delete expired memories in production
      // For now, return 0 as placeholder
      const cleanedCount = 0;
      
      console.log(`✅ Cleaned up ${cleanedCount} expired memories`);
      return cleanedCount;
      
    } catch (error) {
      console.error('Memory cleanup error:', error);
      throw error;
    }
  }
}


