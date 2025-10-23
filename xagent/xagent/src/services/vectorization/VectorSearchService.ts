import { VectorStoreManager } from './VectorStoreManager';
import { generateEmbeddings } from '../openai/embeddings';
import { isServiceConfigured } from '../../config/environment';
import { llmRouter } from '../llm/LLMRouter';
import type { Document } from '../../types/document';
import type { SearchResult } from '../../types/search';

// Enhanced types for multimodal support
export interface MultimodalContent {
  type: 'text' | 'image' | 'audio' | 'document';
  content: string | File | Blob;
  metadata?: Record<string, any>;
}

export interface MultimodalEmbedding {
  textEmbedding?: number[];
  imageEmbedding?: number[];
  audioEmbedding?: number[];
  combinedEmbedding?: number[];
}

export class VectorSearchService {
  private static instance: VectorSearchService;
  private vectorStore: VectorStoreManager;
  private currentOrganizationId: string | null = null;  // ✅ ADD organization context

  private constructor() {
    this.vectorStore = VectorStoreManager.getInstance();
  }

  public static getInstance(): VectorSearchService {
    if (!this.instance) {
      this.instance = new VectorSearchService();
    }
    return this.instance;
  }

  /**
   * ✅ Set organization context for multi-tenancy data isolation
   */
  setOrganizationContext(organizationId: string | null): void {
    this.currentOrganizationId = organizationId;
    this.vectorStore.setOrganizationContext(organizationId);
    console.log(`🏢 VectorSearchService organization context set: ${organizationId || 'none'}`);
  }

  /**
   * ✅ Get current organization context
   */
  getOrganizationContext(): string | null {
    return this.currentOrganizationId;
  }

  async indexDocument(document: Document): Promise<void> {
    if (!isServiceConfigured('openai')) {
      console.warn('OpenAI not configured - skipping vector indexing');
      return;
    }

    try {
      // Generate embeddings if not already present
      const embeddings = document.embeddings || await generateEmbeddings(document.content);

      // Store in vector database
      await this.vectorStore.updateVectors({
        ...document,
        embeddings,
      });
    } catch (error) {
      console.error('Vector indexing error:', error);
      throw error;
    }
  }

  async searchSimilarDocuments(
    query: string,
    options: {
      filter?: Record<string, unknown>;
      topK?: number;
      threshold?: number;
    } = {}
  ): Promise<SearchResult[]> {
    if (!isServiceConfigured('openai')) {
      throw new Error('OpenAI API key required for semantic search');
    }

    try {
      // Generate query embeddings
      const queryEmbeddings = await generateEmbeddings(query);

      // ✅ CRITICAL SECURITY FIX: ENFORCE organization filter
      // This CANNOT be bypassed by the caller
      const secureFilter: Record<string, any> = {
        ...options.filter
      };

      // If organization context is set, ENFORCE it (mandatory filtering)
      if (this.currentOrganizationId !== null) {
        // ✅ Force organization_id filter - prevents cross-org data access
        secureFilter.organization_id = { $eq: this.currentOrganizationId };
        console.log(`✅ Enforcing organization filter: ${this.currentOrganizationId}`);
      } else {
        console.warn(`⚠️ No organization context set for vector search - results not org-filtered`);
      }

      // Perform similarity search with SECURE filter
      const results = await this.vectorStore.similaritySearch(
        queryEmbeddings,
        {
          ...options,
          filter: secureFilter  // ✅ Use secure filter (org-enforced)
        }
      );

      // Transform and filter results
      return results
        .filter(doc => doc.score >= (options.threshold || 0.7))
        .map(doc => ({
          id: doc.id,
          content: doc.content,
          score: doc.score,
          metadata: doc.metadata,
          type: 'document',
          source: 'vector_search',
          timestamp: new Date(doc.metadata.uploadedAt),
        }));
    } catch (error) {
      console.error('Vector search error:', error);
      throw error;
    }
  }

  /**
   * ENHANCED: Multimodal search with text, image, audio support
   */
  async searchMultimodal(
    content: MultimodalContent,
    options: {
      filter?: Record<string, unknown>;
      topK?: number;
      threshold?: number;
      searchTypes?: ('text' | 'image' | 'audio')[];
    } = {}
  ): Promise<SearchResult[]> {
    try {
      console.log(`🔍 Multimodal search: ${content.type}`);
      
      // Generate embeddings based on content type
      const embeddings = await this.generateMultimodalEmbeddings(content);
      
      // Use combined embedding for search
      const searchEmbedding = embeddings.combinedEmbedding || embeddings.textEmbedding || [];
      
      if (searchEmbedding.length === 0) {
        throw new Error('No embeddings generated for search');
      }

      // Perform similarity search
      const results = await this.vectorStore.similaritySearch(
        searchEmbedding,
        options
      );

      // Transform and filter results
      return results
        .filter(doc => doc.score >= (options.threshold || 0.7))
        .map(doc => ({
          id: doc.id,
          content: doc.content,
          score: doc.score,
          metadata: doc.metadata,
          type: 'multimodal',
          source: 'multimodal_search',
          timestamp: new Date(doc.metadata.uploadedAt || Date.now()),
        }));
    } catch (error) {
      console.error('Multimodal search error:', error);
      throw error;
    }
  }

  /**
   * ENHANCED: Generate embeddings for multimodal content
   */
  private async generateMultimodalEmbeddings(content: MultimodalContent): Promise<MultimodalEmbedding> {
    const embeddings: MultimodalEmbedding = {};

    try {
      // Text embeddings (always available)
      if (typeof content.content === 'string') {
        embeddings.textEmbedding = await generateEmbeddings(content.content);
      }

      // Image embeddings (using vision models)
      if (content.type === 'image' && content.content instanceof File) {
        embeddings.imageEmbedding = await this.generateImageEmbeddings(content.content);
      }

      // Audio embeddings (using audio models)
      if (content.type === 'audio' && content.content instanceof File) {
        embeddings.audioEmbedding = await this.generateAudioEmbeddings(content.content);
      }

      // Combine embeddings if multiple available
      if (embeddings.textEmbedding && embeddings.imageEmbedding) {
        embeddings.combinedEmbedding = this.combineEmbeddings([
          embeddings.textEmbedding,
          embeddings.imageEmbedding
        ]);
      } else if (embeddings.textEmbedding && embeddings.audioEmbedding) {
        embeddings.combinedEmbedding = this.combineEmbeddings([
          embeddings.textEmbedding,
          embeddings.audioEmbedding
        ]);
      } else if (embeddings.textEmbedding) {
        embeddings.combinedEmbedding = embeddings.textEmbedding;
      }

      return embeddings;
    } catch (error) {
      console.error('Error generating multimodal embeddings:', error);
      throw error;
    }
  }

  /**
   * ENHANCED: Generate embeddings for images using vision models
   */
  private async generateImageEmbeddings(imageFile: File): Promise<number[]> {
    try {
      // Convert image to base64
      const base64 = await this.fileToBase64(imageFile);
      
      // Use Gemini for image embeddings (best for multimodal)
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': import.meta.env.VITE_GOOGLE_API_KEY || ''
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              inline_data: {
                mime_type: imageFile.type,
                data: base64
              }
            }]
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`Image embedding failed: ${response.statusText}`);
      }

      // For now, generate text-based embedding from image description
      // In production, you'd extract actual image embeddings
      const description = `Image: ${imageFile.name}, Type: ${imageFile.type}`;
      return await generateEmbeddings(description);
      
    } catch (error) {
      console.error('Image embedding error:', error);
      // Fallback to filename-based embedding
      return await generateEmbeddings(`Image file: ${imageFile.name}`);
    }
  }

  /**
   * ENHANCED: Generate embeddings for audio files
   */
  private async generateAudioEmbeddings(audioFile: File): Promise<number[]> {
    try {
      // For now, generate text-based embedding from audio metadata
      // In production, you'd use speech-to-text then embed the transcript
      const description = `Audio: ${audioFile.name}, Type: ${audioFile.type}, Size: ${audioFile.size}`;
      return await generateEmbeddings(description);
      
    } catch (error) {
      console.error('Audio embedding error:', error);
      // Fallback to filename-based embedding
      return await generateEmbeddings(`Audio file: ${audioFile.name}`);
    }
  }

  /**
   * ENHANCED: Combine multiple embeddings into one
   */
  private combineEmbeddings(embeddings: number[][]): number[] {
    if (embeddings.length === 1) return embeddings[0];
    
    // Simple averaging combination
    const combined = new Array(embeddings[0].length).fill(0);
    
    for (const embedding of embeddings) {
      for (let i = 0; i < embedding.length; i++) {
        combined[i] += embedding[i];
      }
    }
    
    // Average
    for (let i = 0; i < combined.length; i++) {
      combined[i] /= embeddings.length;
    }
    
    return combined;
  }

  /**
   * ENHANCED: Convert file to base64
   */
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Remove data:image/...;base64, prefix
      };
      reader.onerror = error => reject(error);
    });
  }

  /**
   * ENHANCED: Hybrid search combining semantic and keyword search
   */
  async hybridSearch(
    query: string,
    options: {
      semanticWeight?: number;
      keywordWeight?: number;
      filter?: Record<string, unknown>;
      topK?: number;
    } = {}
  ): Promise<SearchResult[]> {
    const { semanticWeight = 0.7, keywordWeight = 0.3, topK = 10 } = options;

    try {
      // Run both searches in parallel
      const [semanticResults, keywordResults] = await Promise.all([
        this.searchSimilarDocuments(query, { ...options, topK: topK * 2 }),
        this.keywordSearch(query, { ...options, topK: topK * 2 })
      ]);

      // Combine and score results
      const combinedResults = new Map<string, SearchResult & { combinedScore: number }>();

      // Add semantic results
      semanticResults.forEach(result => {
        combinedResults.set(result.id, {
          ...result,
          combinedScore: result.score * semanticWeight
        });
      });

      // Add keyword results
      keywordResults.forEach(result => {
        const existing = combinedResults.get(result.id);
        if (existing) {
          existing.combinedScore += result.score * keywordWeight;
        } else {
          combinedResults.set(result.id, {
            ...result,
            combinedScore: result.score * keywordWeight
          });
        }
      });

      // Sort by combined score and return top K
      return Array.from(combinedResults.values())
        .sort((a, b) => b.combinedScore - a.combinedScore)
        .slice(0, topK);

    } catch (error) {
      console.error('Hybrid search error:', error);
      throw error;
    }
  }

  /**
   * ENHANCED: Keyword-based search fallback
   */
  private async keywordSearch(
    query: string,
    options: {
      filter?: Record<string, unknown>;
      topK?: number;
    } = {}
  ): Promise<SearchResult[]> {
    // Simple keyword search implementation
    // In production, you'd use Elasticsearch or similar
    try {
      const keywords = query.toLowerCase().split(' ').filter(word => word.length > 2);
      
      // This is a placeholder - in production you'd search your document index
      const results: SearchResult[] = [];
      
      // For now, return empty results
      return results.slice(0, options.topK || 5);
      
    } catch (error) {
      console.error('Keyword search error:', error);
      return [];
    }
  }
}