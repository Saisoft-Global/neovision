/**
 * Source Citation Engine
 * Automatically adds source citations, links, and references to ALL agent responses
 * This is a core capability that every agent should have
 */

export interface CitedResponse {
  answer: string;
  sources: DocumentSource[];
  related_links: RelatedLink[];
  suggested_actions: SuggestedAction[];
  metadata: ResponseMetadata;
}

export interface DocumentSource {
  id: string;
  title: string;
  section?: string;
  page_number?: number;
  url?: string;
  excerpt: string;
  relevance_score: number;
  last_updated?: Date;
  doc_type: 'policy' | 'procedure' | 'guide' | 'faq' | 'external' | 'intranet';
}

export interface RelatedLink {
  title: string;
  url: string;
  type: 'form' | 'tool' | 'guide' | 'reference' | 'external';
  description?: string;
  icon?: string;
}

export interface SuggestedAction {
  id: string;
  title: string;
  description: string;
  action_type: 'workflow' | 'form' | 'api_call' | 'navigation' | 'manual';
  can_automate: boolean;
  priority: 'low' | 'medium' | 'high';
  workflow_id?: string;
  parameters?: Record<string, any>;
}

export interface ResponseMetadata {
  sources_used: number;
  vector_search_used: boolean;
  graph_search_used: boolean;
  confidence_score: number;
  response_time_ms: number;
}

export class SourceCitationEngine {
  private static instance: SourceCitationEngine;

  private constructor() {}

  public static getInstance(): SourceCitationEngine {
    if (!this.instance) {
      this.instance = new SourceCitationEngine();
    }
    return this.instance;
  }

  /**
   * Enhance agent response with citations and sources
   */
  async enhanceResponseWithCitations(
    answer: string,
    ragContext: any,
    userMessage: string
  ): Promise<CitedResponse> {
    const startTime = Date.now();

    // Extract sources from RAG context
    const sources = this.extractSources(ragContext);

    // Find related links
    const relatedLinks = this.extractRelatedLinks(ragContext, userMessage);

    // Generate suggested next actions
    const suggestedActions = await this.generateSuggestedActions(userMessage, ragContext);

    // Build metadata
    const metadata: ResponseMetadata = {
      sources_used: sources.length,
      vector_search_used: ragContext.vectorResults?.length > 0,
      graph_search_used: ragContext.graphResults?.length > 0,
      confidence_score: this.calculateConfidence(ragContext),
      response_time_ms: Date.now() - startTime
    };

    return {
      answer,
      sources,
      related_links: relatedLinks,
      suggested_actions: suggestedActions,
      metadata
    };
  }

  /**
   * Format response with citations for display
   */
  formatCitedResponse(citedResponse: CitedResponse): string {
    let formatted = citedResponse.answer;

    // Add sources section
    if (citedResponse.sources.length > 0) {
      formatted += '\n\n**📚 Sources:**\n';
      
      citedResponse.sources.forEach((source, index) => {
        formatted += `\n${index + 1}. 📄 **${source.title}**`;
        
        if (source.section) {
          formatted += `, Section ${source.section}`;
        }
        
        if (source.page_number) {
          formatted += `, Page ${source.page_number}`;
        }
        
        if (source.url) {
          formatted += `\n   🔗 [View Document](${source.url})`;
        }
        
        if (source.last_updated) {
          formatted += `\n   📅 Last updated: ${source.last_updated.toLocaleDateString()}`;
        }
        
        formatted += `\n   *Relevance: ${(source.relevance_score * 100).toFixed(0)}%*`;
      });
    }

    // Add related links section
    if (citedResponse.related_links.length > 0) {
      formatted += '\n\n**🔗 Related Links:**\n';
      
      citedResponse.related_links.forEach(link => {
        const icon = this.getLinkIcon(link.type);
        formatted += `\n${icon} [${link.title}](${link.url})`;
        
        if (link.description) {
          formatted += `\n   *${link.description}*`;
        }
      });
    }

    // Add suggested actions section
    if (citedResponse.suggested_actions.length > 0) {
      formatted += '\n\n**💡 I can help you:**\n';
      
      citedResponse.suggested_actions
        .sort((a, b) => {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        })
        .forEach(action => {
          const automateIcon = action.can_automate ? '✅' : '📋';
          formatted += `\n${automateIcon} ${action.title}`;
          
          if (action.description) {
            formatted += `\n   *${action.description}*`;
          }
        });
    }

    return formatted;
  }

  /**
   * Extract sources from RAG context
   */
  private extractSources(ragContext: any): DocumentSource[] {
    const sources: DocumentSource[] = [];

    // Extract from vector results
    if (ragContext.vectorResults) {
      ragContext.vectorResults.forEach((result: any) => {
        if (result.score >= 0.7) { // Only include high-relevance results
          sources.push({
            id: result.metadata?.documentId || crypto.randomUUID(),
            title: result.metadata?.title || 'Untitled Document',
            section: result.metadata?.section,
            page_number: result.metadata?.page,
            url: result.metadata?.sourceUrl || result.metadata?.url,
            excerpt: result.content.substring(0, 200) + '...',
            relevance_score: result.score,
            last_updated: result.metadata?.uploadedAt ? new Date(result.metadata.uploadedAt) : undefined,
            doc_type: this.inferDocType(result.metadata?.title)
          });
        }
      });
    }

    // Extract from knowledge graph results
    if (ragContext.graphResults) {
      ragContext.graphResults.forEach((graphResult: any) => {
        if (graphResult.nodes) {
          graphResult.nodes.forEach((node: any) => {
            if (node.properties?.sourceDocument) {
              sources.push({
                id: node.id,
                title: node.properties.sourceDocument,
                excerpt: node.properties.description || '',
                relevance_score: node.properties.confidence || 0.8,
                url: node.properties.sourceUrl,
                doc_type: 'guide'
              });
            }
          });
        }
      });
    }

    // Deduplicate by ID
    const uniqueSources = Array.from(
      new Map(sources.map(s => [s.id, s])).values()
    );

    // Sort by relevance
    return uniqueSources.sort((a, b) => b.relevance_score - a.relevance_score);
  }

  /**
   * Extract related links from context and user message
   */
  private extractRelatedLinks(ragContext: any, userMessage: string): RelatedLink[] {
    const links: RelatedLink[] = [];

    // Extract links from vector results metadata
    if (ragContext.vectorResults) {
      ragContext.vectorResults.forEach((result: any) => {
        const metadata = result.metadata;
        
        // Add source URL if available
        if (metadata?.sourceUrl) {
          links.push({
            title: metadata.title || 'Related Document',
            url: metadata.sourceUrl,
            type: this.inferLinkType(metadata.sourceUrl),
            description: metadata.description
          });
        }

        // Extract embedded links from content
        const embeddedLinks = this.extractLinksFromText(result.content);
        links.push(...embeddedLinks);
      });
    }

    // Deduplicate by URL
    const uniqueLinks = Array.from(
      new Map(links.map(l => [l.url, l])).values()
    );

    return uniqueLinks.slice(0, 5); // Top 5 most relevant
  }

  /**
   * Generate suggested next actions based on context
   */
  private async generateSuggestedActions(
    userMessage: string,
    ragContext: any
  ): Promise<SuggestedAction[]> {
    const actions: SuggestedAction[] = [];

    // Analyze user message for intent
    const intent = this.inferIntentFromMessage(userMessage);

    // Add context-specific suggestions
    switch (intent) {
      case 'policy_inquiry':
        actions.push({
          id: 'view_full_policy',
          title: 'View full policy document',
          description: 'Access the complete policy document',
          action_type: 'navigation',
          can_automate: true,
          priority: 'medium'
        });
        break;

      case 'form_request':
        actions.push({
          id: 'fill_form',
          title: 'Fill out the form',
          description: 'I can help you complete the form',
          action_type: 'workflow',
          can_automate: true,
          priority: 'high'
        });
        break;

      case 'process_request':
        actions.push({
          id: 'submit_request',
          title: 'Submit request',
          description: 'Submit the request to the appropriate department',
          action_type: 'workflow',
          can_automate: true,
          priority: 'high'
        });
        break;
    }

    return actions;
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(ragContext: any): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on quality of sources
    if (ragContext.vectorResults?.length > 0) {
      const avgScore = ragContext.vectorResults.reduce((sum: number, r: any) => sum + r.score, 0) 
                      / ragContext.vectorResults.length;
      confidence = Math.max(confidence, avgScore);
    }

    return confidence;
  }

  /**
   * Infer document type from title
   */
  private inferDocType(title?: string): DocumentSource['doc_type'] {
    if (!title) return 'guide';
    
    const lower = title.toLowerCase();
    
    if (lower.includes('policy') || lower.includes('policies')) return 'policy';
    if (lower.includes('procedure') || lower.includes('process')) return 'procedure';
    if (lower.includes('faq') || lower.includes('frequently asked')) return 'faq';
    if (lower.includes('guide') || lower.includes('handbook')) return 'guide';
    if (lower.includes('http') || lower.includes('www')) return 'external';
    
    return 'guide';
  }

  /**
   * Infer link type from URL
   */
  private inferLinkType(url: string): RelatedLink['type'] {
    const lower = url.toLowerCase();
    
    if (lower.includes('form') || lower.includes('/forms/')) return 'form';
    if (lower.includes('tool') || lower.includes('/tools/')) return 'tool';
    if (lower.includes('guide') || lower.includes('/guides/')) return 'guide';
    if (lower.includes('http') && !lower.includes('intranet')) return 'external';
    
    return 'reference';
  }

  /**
   * Extract links from text content
   */
  private extractLinksFromText(text: string): RelatedLink[] {
    const links: RelatedLink[] = [];
    
    // Match URLs in text
    const urlRegex = /https?:\/\/[^\s<>"]+/g;
    const matches = text.match(urlRegex) || [];
    
    matches.forEach(url => {
      links.push({
        title: this.extractTitleFromUrl(url),
        url,
        type: this.inferLinkType(url)
      });
    });
    
    return links;
  }

  /**
   * Extract title from URL
   */
  private extractTitleFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname.split('/').filter(Boolean);
      return path[path.length - 1]?.replace(/[-_]/g, ' ') || urlObj.hostname;
    } catch {
      return url;
    }
  }

  /**
   * Infer intent from message
   */
  private inferIntentFromMessage(message: string): string {
    const lower = message.toLowerCase();
    
    if (lower.includes('policy') || lower.includes('policies')) return 'policy_inquiry';
    if (lower.includes('form') || lower.includes('apply') || lower.includes('submit')) return 'form_request';
    if (lower.includes('request') || lower.includes('need') || lower.includes('want')) return 'process_request';
    if (lower.includes('how do i') || lower.includes('how to')) return 'how_to_inquiry';
    
    return 'general_inquiry';
  }

  /**
   * Get icon for link type
   */
  private getLinkIcon(type: RelatedLink['type']): string {
    const icons = {
      form: '📝',
      tool: '🔧',
      guide: '📖',
      reference: '📚',
      external: '🌐'
    };
    return icons[type] || '🔗';
  }
}


