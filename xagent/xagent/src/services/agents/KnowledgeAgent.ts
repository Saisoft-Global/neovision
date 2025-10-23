import type { AgentConfig } from '../../types/agent-framework';
import type { AgentResponse } from '../agent/types';
import { BaseAgent } from './BaseAgent';
import { getVectorStore } from '../pinecone/client';
import { generateEmbeddings } from '../openai/embeddings';
import { KnowledgeGraphManager } from '../knowledge/graph/KnowledgeGraphManager';
import { isServiceConfigured } from '../../config/environment';
import { Logger } from '../../utils/logging/Logger';

export class KnowledgeAgent extends BaseAgent {
  private graphManager: KnowledgeGraphManager;
  private logger: Logger;

  constructor(id: string, config: AgentConfig) {
    super(id, config);
    this.graphManager = new KnowledgeGraphManager();
    this.logger = Logger.getInstance();
  }

  protected getSystemPrompt(): string {
    return `You are a knowledgeable assistant that helps with:
- Information retrieval
- Knowledge organization
- Content analysis
- Data enrichment

Always prioritize information from the provided knowledge base over general knowledge.
When using knowledge base information, cite it in your response.`;
  }

  async execute(action: string, params: Record<string, unknown>): Promise<AgentResponse> {
    try {
      switch (action) {
        case 'search':
          return {
            success: true,
            data: await this.searchKnowledge(params.query as string)
          };
        case 'query_with_context':
          return {
            success: true,
            data: await this.queryWithContext(params.query as string)
          };
        case 'add':
          return {
            success: true,
            data: await this.addKnowledge(params.content as string)
          };
        case 'analyze':
          return {
            success: true,
            data: await this.analyzeContent(params.content as string)
          };
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      this.logger.error('Knowledge agent error:', 'agent', { error });
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private async searchKnowledge(query: string) {
    // Check OpenAI configuration first
    if (!isServiceConfigured('openai')) {
      this.logger.info('OpenAI not configured - skipping vector search', 'agent');
      return {
        vectorResults: [],
        graphResults: [],
        hasVectorStore: false,
        message: 'Vector search is disabled - OpenAI API key required'
      };
    }

    try {
      // Generate embeddings for the query
      const queryEmbeddings = await generateEmbeddings(query);
      
      // Search vector store
      const vectorStore = await getVectorStore();
      let vectorResults = [];
      
      if (vectorStore) {
        const results = await vectorStore.query({
          vector: queryEmbeddings,
          topK: 5,
          includeMetadata: true,
        });
        vectorResults = results.matches || [];
        this.logger.info('Vector search completed', 'agent', { 
          resultCount: vectorResults.length 
        });
      } else {
        this.logger.warning('Vector store not available', 'agent');
      }

      // Get graph context
      const graphResults = await this.graphManager.searchGraph(query);
      this.logger.info('Graph search completed', 'agent', { 
        resultCount: graphResults.nodes.length 
      });

      return {
        vectorResults,
        graphResults,
        hasVectorStore: Boolean(vectorStore)
      };
    } catch (error) {
      this.logger.error('Search error:', 'agent', { error });
      throw error;
    }
  }

  private async queryWithContext(query: string) {
    try {
      // First, retrieve relevant context
      const { vectorResults, graphResults, hasVectorStore } = await this.searchKnowledge(query);

      // Build context from available sources
      let context = '';
      let sources = [];

      // Add vector context if available
      if (vectorResults?.length) {
        const vectorContext = vectorResults
          .filter(match => match.score > 0.7) // Only use high-confidence matches
          .map(match => {
            sources.push({
              type: 'vector',
              content: match.metadata.content,
              score: match.score,
              timestamp: match.metadata.uploadedAt
            });
            return match.metadata.content;
          })
          .join('\n\n');
        
        if (vectorContext) {
          context += `Relevant Knowledge Base Information:\n${vectorContext}\n\n`;
        }
      }

      // Add graph context if available
      if (graphResults?.nodes?.length) {
        const graphContext = graphResults.nodes
          .map(node => {
            sources.push({
              type: 'graph',
              content: `${node.label}: ${node.properties.description || ''}`,
              confidence: node.properties.confidence || 1
            });
            return `${node.label}: ${node.properties.description || ''}`;
          })
          .join('\n');
        
        if (graphContext) {
          context += `Related Concepts:\n${graphContext}\n\n`;
        }
      }

      // Generate response using available context
      const systemPrompt = `You are a knowledgeable assistant. ${
        context 
          ? `Use the following context to answer questions accurately. Always reference the source information in your response:\n\n${context}`
          : 'Answer to the best of your ability based on general knowledge.'
      }`;

      const response = await this.generateResponse(query, { systemPrompt });

      return {
        answer: response,
        sources: sources.length > 0 ? sources : undefined,
        hasVectorStore,
        metadata: {
          vectorResultsCount: vectorResults?.length || 0,
          graphResultsCount: graphResults?.nodes?.length || 0,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error('Query error:', 'agent', { error });
      // Fall back to direct response without context
      return this.generateResponse(query, {
        note: 'Response based on general knowledge due to error accessing knowledge base'
      });
    }
  }

  private async addKnowledge(content: string) {
    if (!isServiceConfigured('openai')) {
      this.logger.info('OpenAI not configured - skipping embeddings', 'agent');
      return { 
        success: true, 
        message: 'Knowledge added without embeddings',
        hasVectorStore: false 
      };
    }

    try {
      // Generate embeddings
      const embeddings = await generateEmbeddings(content);
      
      // Store in vector database if available
      const vectorStore = await getVectorStore();
      let vectorStoreSuccess = false;

      if (vectorStore) {
        await vectorStore.upsert([{
          id: crypto.randomUUID(),
          values: embeddings,
          metadata: { 
            content,
            uploadedAt: new Date().toISOString()
          },
        }]);
        vectorStoreSuccess = true;
        this.logger.info('Knowledge added to vector store', 'agent');
      } else {
        this.logger.warning('Vector store not available - skipping vector storage', 'agent');
      }

      // Update knowledge graph
      await this.graphManager.updateGraph(content);
      this.logger.info('Knowledge graph updated', 'agent');

      return { 
        success: true,
        vectorStoreSuccess,
        hasVectorStore: Boolean(vectorStore)
      };
    } catch (error) {
      this.logger.error('Failed to add knowledge:', 'agent', { error });
      throw error;
    }
  }

  private async analyzeContent(content: string) {
    return this.generateResponse(content, { action: 'analyze' });
  }
}