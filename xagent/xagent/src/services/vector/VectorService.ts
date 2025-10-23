/**
 * Vector service - Makes direct backend API calls to avoid circular dependencies
 * All Pinecone operations go through the backend API
 */

export interface VectorQuery {
  query: string;
  top_k?: number;
  filter?: any;
  organization_id?: string;
}

export interface VectorSearch {
  vector: number[];
  top_k?: number;
  filter?: any;
  organization_id?: string;
}

export interface VectorUpsert {
  vectors: Array<{
    id: string;
    values: number[];
    metadata?: any;
  }>;
  organization_id?: string;
}

export interface VectorMatch {
  id: string;
  score: number;
  metadata: any;
}

export interface VectorResponse {
  matches: VectorMatch[];
}

export class VectorService {
  private currentOrganizationId: string | null = null;

  /**
   * Set organization context for multi-tenancy
   */
  setOrganizationContext(organizationId: string | null): void {
    this.currentOrganizationId = organizationId;
    console.log(`🏢 VectorService organization context set: ${organizationId || 'none'}`);
  }

  /**
   * Get current organization context
   */
  getOrganizationContext(): string | null {
    return this.currentOrganizationId;
  }

  async query(_queryData: VectorQuery): Promise<VectorResponse> {
    try {
      // Note: This requires the query text to be converted to a vector first
      // You'll need to use an embedding service (OpenAI, etc.) to convert text to vector
      console.warn('⚠️ Text query requires embedding conversion - use search() with pre-computed vector instead');
      return { matches: [] };
    } catch (error) {
      console.error('Vector query error:', error);
      return { matches: [] };
    }
  }

  async search(searchData: VectorSearch): Promise<VectorResponse> {
    try {
      // Make direct backend API call to avoid circular dependency with pineconeClient
      const headers: any = { 'Content-Type': 'application/json' };
      
      // Try to get auth token if available
      try {
        const { getSupabaseClient } = await import('../../config/supabase');
        const supabase = getSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
      } catch (error) {
        console.warn('Could not get auth token for vector search, continuing without auth');
      }

      // Add organization_id to filter if set
      const filter = searchData.filter || {};
      if (this.currentOrganizationId && !filter.organization_id) {
        filter.organization_id = { $eq: this.currentOrganizationId };
      }

      const response = await fetch('http://localhost:8000/api/vectors/search', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          vector: searchData.vector,
          top_k: searchData.top_k || 10,
          filter,
          organization_id: this.currentOrganizationId
        }),
      });

      if (!response.ok) {
        throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      return {
        matches: result.matches?.map((match: any) => ({
          id: match.id,
          score: match.score,
          metadata: match.metadata || {},
        })) || [],
      };
    } catch (error) {
      console.error('Vector search error:', error);
      return { matches: [] };
    }
  }

  async upsert(upsertData: VectorUpsert): Promise<{ status: string; upserted?: number }> {
    try {
      // Make direct backend API call to avoid circular dependency
      const headers: any = { 'Content-Type': 'application/json' };
      
      // Try to get auth token if available
      try {
        const { getSupabaseClient } = await import('../../config/supabase');
        const supabase = getSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
      } catch (error) {
        console.warn('Could not get auth token for vector upsert, continuing without auth');
      }

      // Add organization_id to metadata if set
      const vectors = upsertData.vectors.map(v => ({
        ...v,
        metadata: {
          ...v.metadata,
          organization_id: this.currentOrganizationId || v.metadata?.organization_id
        }
      }));

      const response = await fetch('http://localhost:8000/api/vectors/upsert', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          vectors,
          organization_id: this.currentOrganizationId
        }),
      });

      if (!response.ok) {
        throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
      }

      return {
        status: 'success',
        upserted: vectors.length,
      };
    } catch (error) {
      console.error('Vector upsert error:', error);
      return { status: 'error' };
    }
  }

  async getStatus(): Promise<{ available: boolean; index_name?: string }> {
    try {
      // Make direct backend API call to avoid circular dependency
      const response = await fetch('http://localhost:8000/api/vectors/status');
      
      if (!response.ok) {
        throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      return {
        available: result.available || false,
        index_name: result.index_name,
      };
    } catch (error) {
      console.error('Status check error:', error);
      return { available: false };
    }
  }
}

// Export singleton instance
export const vectorService = new VectorService();
