/**
 * Response Cache for Agent Responses
 * Caches vector search results, knowledge graph queries, and collective learnings
 * to improve response time for similar queries
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export class ResponseCache {
  private static instance: ResponseCache;
  
  // In-memory caches
  private vectorSearchCache: Map<string, CacheEntry<any>> = new Map();
  private knowledgeGraphCache: Map<string, CacheEntry<any>> = new Map();
  private learningCache: Map<string, CacheEntry<any>> = new Map();
  
  // Cache TTL (Time To Live) in milliseconds
  private readonly VECTOR_SEARCH_TTL = 5 * 60 * 1000;  // 5 minutes
  private readonly KNOWLEDGE_GRAPH_TTL = 10 * 60 * 1000; // 10 minutes
  private readonly LEARNING_TTL = 2 * 60 * 1000;         // 2 minutes
  
  // Max cache size (to prevent memory issues)
  private readonly MAX_CACHE_SIZE = 100;
  
  private constructor() {
    // Start cleanup interval
    this.startCleanupInterval();
  }
  
  static getInstance(): ResponseCache {
    if (!ResponseCache.instance) {
      ResponseCache.instance = new ResponseCache();
    }
    return ResponseCache.instance;
  }
  
  /**
   * Generate cache key from message and context
   */
  private generateKey(message: string, userId: string, agentId?: string): string {
    const normalized = message.toLowerCase().trim();
    return `${agentId || 'global'}_${userId}_${normalized}`;
  }
  
  /**
   * Get vector search results from cache
   */
  getVectorSearch(message: string, userId: string): any[] | null {
    const key = this.generateKey(message, userId);
    const entry = this.vectorSearchCache.get(key);
    
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      this.vectorSearchCache.delete(key);
      return null;
    }
    
    console.log(`⚡ [CACHE HIT] Vector search cache hit for: "${message.substring(0, 30)}..."`);
    return entry.data;
  }
  
  /**
   * Set vector search results in cache
   */
  setVectorSearch(message: string, userId: string, results: any[]): void {
    const key = this.generateKey(message, userId);
    
    // Evict oldest entries if cache is full
    if (this.vectorSearchCache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.vectorSearchCache.keys().next().value;
      this.vectorSearchCache.delete(firstKey);
    }
    
    this.vectorSearchCache.set(key, {
      data: results,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.VECTOR_SEARCH_TTL
    });
  }
  
  /**
   * Get knowledge graph results from cache
   */
  getKnowledgeGraph(message: string, userId: string): any[] | null {
    const key = this.generateKey(message, userId);
    const entry = this.knowledgeGraphCache.get(key);
    
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      this.knowledgeGraphCache.delete(key);
      return null;
    }
    
    console.log(`⚡ [CACHE HIT] Knowledge graph cache hit for: "${message.substring(0, 30)}..."`);
    return entry.data;
  }
  
  /**
   * Set knowledge graph results in cache
   */
  setKnowledgeGraph(message: string, userId: string, results: any[]): void {
    const key = this.generateKey(message, userId);
    
    if (this.knowledgeGraphCache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.knowledgeGraphCache.keys().next().value;
      this.knowledgeGraphCache.delete(firstKey);
    }
    
    this.knowledgeGraphCache.set(key, {
      data: results,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.KNOWLEDGE_GRAPH_TTL
    });
  }
  
  /**
   * Get collective learnings from cache
   */
  getLearnings(message: string, agentId: string): any[] | null {
    const key = this.generateKey(message, 'global', agentId);
    const entry = this.learningCache.get(key);
    
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      this.learningCache.delete(key);
      return null;
    }
    
    console.log(`⚡ [CACHE HIT] Learnings cache hit for: "${message.substring(0, 30)}..."`);
    return entry.data;
  }
  
  /**
   * Set collective learnings in cache
   */
  setLearnings(message: string, agentId: string, learnings: any[]): void {
    const key = this.generateKey(message, 'global', agentId);
    
    if (this.learningCache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.learningCache.keys().next().value;
      this.learningCache.delete(firstKey);
    }
    
    this.learningCache.set(key, {
      data: learnings,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.LEARNING_TTL
    });
  }
  
  /**
   * Clear all caches
   */
  clearAll(): void {
    this.vectorSearchCache.clear();
    this.knowledgeGraphCache.clear();
    this.learningCache.clear();
    console.log('🗑️ All caches cleared');
  }
  
  /**
   * Clear expired entries periodically
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now();
      let cleaned = 0;
      
      // Clean vector search cache
      for (const [key, entry] of this.vectorSearchCache.entries()) {
        if (now > entry.expiresAt) {
          this.vectorSearchCache.delete(key);
          cleaned++;
        }
      }
      
      // Clean knowledge graph cache
      for (const [key, entry] of this.knowledgeGraphCache.entries()) {
        if (now > entry.expiresAt) {
          this.knowledgeGraphCache.delete(key);
          cleaned++;
        }
      }
      
      // Clean learning cache
      for (const [key, entry] of this.learningCache.entries()) {
        if (now > entry.expiresAt) {
          this.learningCache.delete(key);
          cleaned++;
        }
      }
      
      if (cleaned > 0) {
        console.log(`🗑️ Cache cleanup: removed ${cleaned} expired entries`);
      }
    }, 60000); // Run every minute
  }
  
  /**
   * Get cache statistics
   */
  getStats(): {
    vectorSearchSize: number;
    knowledgeGraphSize: number;
    learningSize: number;
    totalSize: number;
  } {
    return {
      vectorSearchSize: this.vectorSearchCache.size,
      knowledgeGraphSize: this.knowledgeGraphCache.size,
      learningSize: this.learningCache.size,
      totalSize: this.vectorSearchCache.size + this.knowledgeGraphCache.size + this.learningCache.size
    };
  }
}

export const responseCache = ResponseCache.getInstance();


