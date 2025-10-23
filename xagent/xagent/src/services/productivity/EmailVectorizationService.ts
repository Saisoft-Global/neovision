import { generateEmbeddings } from '../openai/embeddings';
import { getVectorStore } from '../pinecone/client';
import { KnowledgeService } from '../knowledge/KnowledgeService';
import { VectorSearchService } from '../vectorization/VectorSearchService';
import type { Email } from '../../types/email';
import type { EmailClassification } from './EmailIntelligenceEngine';
import { createChatCompletion } from '../openai/chat';

export interface EmailVector {
  id: string;
  emailId: string;
  userId: string;
  embedding: number[];
  metadata: EmailMetadata;
  timestamp: Date;
}

export interface EmailMetadata {
  subject: string;
  from: string;
  to: string[];
  date: Date;
  classification: EmailClassification;
  entities: any[];
  summary: string;
  actionItems: any[];
  sentiment: string;
  importance: number;
  urgency: number;
  threadId?: string;
}

export interface EmailSearchResult {
  email: Email;
  similarity: number;
  relevance: string;
  context: string;
}

export class EmailVectorizationService {
  private static instance: EmailVectorizationService;
  private knowledgeService: KnowledgeService;
  private vectorSearchService: VectorSearchService;

  private constructor() {
    this.knowledgeService = KnowledgeService.getInstance();
    this.vectorSearchService = VectorSearchService.getInstance();
  }

  public static getInstance(): EmailVectorizationService {
    if (!this.instance) {
      this.instance = new EmailVectorizationService();
    }
    return this.instance;
  }

  async vectorizeAndStoreEmail(
    email: Email,
    classification: EmailClassification,
    userId: string
  ): Promise<EmailVector> {
    console.log(`🔮 Vectorizing email: ${email.subject}`);

    try {
      // Step 1: Create comprehensive email representation
      const emailRepresentation = await this.createEmailRepresentation(email, classification);

      // Step 2: Generate embeddings
      const embedding = await generateEmbeddings(emailRepresentation);

      // Step 3: Generate summary for storage
      const summary = await this.generateEmailSummary(email, classification);

      // Step 4: Create metadata
      const metadata: EmailMetadata = {
        subject: email.subject,
        from: email.from.email,
        to: email.to.map(t => t.email),
        date: email.timestamp,
        classification,
        entities: classification.entities,
        summary,
        actionItems: classification.actionItems,
        sentiment: classification.sentiment,
        importance: classification.importance,
        urgency: classification.urgency,
        threadId: email.threadId
      };

      // Step 4: Store in knowledge base using EXISTING infrastructure
      // KnowledgeService automatically handles vectorization via VectorizationPipeline
      const document = {
        id: email.id,
        title: `Email: ${email.subject}`,
        content: emailRepresentation,
        doc_type: 'email',
        status: 'processed' as const,
        embeddings: embedding,
        metadata: {
          type: 'email',
          emailId: email.id,
          userId: userId,
          from: email.from.email,
          to: email.to.map(t => t.email),
          subject: email.subject,
          timestamp: email.timestamp.toISOString(),
          classification: metadata.classification,
          summary: metadata.summary,
          actionItems: metadata.actionItems,
          entities: metadata.entities,
          sentiment: metadata.sentiment,
          importance: metadata.importance,
          urgency: metadata.urgency,
          threadId: email.threadId
        }
      };

      // Use EXISTING KnowledgeService (handles vector storage automatically)
      await this.knowledgeService.addDocument(document);

      // Index using EXISTING VectorSearchService
      await this.vectorSearchService.indexDocument(document);

      console.log(`✅ Email vectorized and stored in KB: ${email.subject}`);

      return {
        id: email.id,
        emailId: email.id,
        userId,
        embedding,
        metadata,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Email vectorization error:', error);
      throw new Error(`Failed to vectorize email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async searchSimilarEmails(
    query: string,
    userId: string,
    options?: {
      limit?: number;
      minSimilarity?: number;
      dateRange?: { start: Date; end: Date };
      importance?: number;
    }
  ): Promise<EmailSearchResult[]> {
    console.log(`🔍 Searching emails similar to: ${query}`);

    try {
      // Use EXISTING VectorSearchService for semantic search
      const results = await this.vectorSearchService.searchSimilarDocuments(query, {
        filter: {
          type: 'email',
          userId: userId,
          ...(options?.importance && { importance: { $gte: options.importance } })
        },
        topK: options?.limit || 10,
        threshold: options?.minSimilarity || 0.7
      });

      // Enhance results with relevance explanation
      const enhanced = await Promise.all(
        results.map(async (result) => {
          const relevance = await this.explainRelevance(query, result.metadata);
          
          return {
            email: this.reconstructEmailFromDocument(result),
            similarity: result.score,
            relevance: relevance.explanation,
            context: relevance.context
          };
        })
      );

      return enhanced;
    } catch (error) {
      console.error('Email search error:', error);
      return [];
    }
  }

  async getEmailContext(
    currentEmail: Email,
    userId: string
  ): Promise<{
    relatedEmails: Email[];
    conversationHistory: Email[];
    relevantContext: string;
  }> {
    console.log(`📚 Getting context for email: ${currentEmail.subject}`);

    // Search for related emails
    const relatedEmails = await this.searchSimilarEmails(
      `${currentEmail.subject} ${currentEmail.content}`,
      userId,
      { limit: 5, minSimilarity: 0.75 }
    );

    // Get conversation thread if exists
    const conversationHistory = currentEmail.threadId
      ? await this.getThreadEmails(currentEmail.threadId, userId)
      : [];

    // AI synthesizes relevant context
    const relevantContext = await this.synthesizeContext(
      currentEmail,
      relatedEmails,
      conversationHistory
    );

    return {
      relatedEmails: relatedEmails.map(r => r.email),
      conversationHistory,
      relevantContext
    };
  }

  private async createEmailRepresentation(
    email: Email,
    classification: EmailClassification
  ): Promise<string> {
    // Create rich text representation for vectorization
    return `
Email Subject: ${email.subject}
From: ${email.from.name} <${email.from.email}>
To: ${email.to.map(t => `${t.name} <${t.email}>`).join(', ')}
Date: ${email.timestamp.toISOString()}

Classification:
- Importance: ${classification.importance}/10
- Urgency: ${classification.urgency}/10
- Category: ${classification.category}
- Sentiment: ${classification.sentiment}

Content:
${email.content}

Action Items:
${classification.actionItems.map(a => `- ${a.description}${a.deadline ? ` (Due: ${a.deadline})` : ''}`).join('\n')}

Entities:
${classification.entities.map(e => `- ${e.type}: ${e.value} (${e.context})`).join('\n')}
    `.trim();
  }

  private async generateEmailSummary(
    email: Email,
    classification: EmailClassification
  ): Promise<string> {
    const summary = await createChatCompletion([
      {
        role: 'system',
        content: 'Generate a concise 1-2 sentence summary of this email capturing the key point and any action needed.'
      },
      {
        role: 'user',
        content: `Subject: ${email.subject}\n\n${email.content}`
      }
    ], {
      model: 'gpt-4-turbo',
      temperature: 0.3
    });

    return summary?.choices[0]?.message?.content || email.subject;
  }

  private async explainRelevance(
    query: string,
    emailMetadata: any
  ): Promise<{ explanation: string; context: string }> {
    const explanation = await createChatCompletion([
      {
        role: 'system',
        content: 'Explain why this email is relevant to the query in one sentence.'
      },
      {
        role: 'user',
        content: `Query: ${query}\n\nEmail: ${emailMetadata.subject}\nSummary: ${emailMetadata.summary}`
      }
    ]);

    return {
      explanation: explanation?.choices[0]?.message?.content || 'Related email',
      context: emailMetadata.summary
    };
  }

  private reconstructEmailFromDocument(result: any): Email {
    const metadata = result.metadata;
    return {
      id: metadata.emailId || result.id,
      subject: metadata.subject || '',
      from: { email: metadata.from || '', name: metadata.from || '' },
      to: (metadata.to || []).map((email: string) => ({ email, name: email })),
      content: result.content || metadata.text || '',
      timestamp: new Date(metadata.timestamp || metadata.date),
      status: 'received',
      threadId: metadata.threadId,
      labels: []
    };
  }

  private async getThreadEmails(threadId: string, userId: string): Promise<Email[]> {
    // Use EXISTING VectorSearchService to find thread emails
    const results = await this.vectorSearchService.searchSimilarDocuments(
      `thread:${threadId}`,
      {
        filter: {
          type: 'email',
          userId: userId,
          threadId: threadId
        },
        topK: 50
      }
    );

    return results.map(r => this.reconstructEmailFromDocument(r));
  }

  private async synthesizeContext(
    currentEmail: Email,
    relatedEmails: EmailSearchResult[],
    conversationHistory: Email[]
  ): Promise<string> {
    const context = await createChatCompletion([
      {
        role: 'system',
        content: `Synthesize relevant context from related emails and conversation history.
        
        Create a concise context summary that includes:
        1. Key points from related emails
        2. Conversation thread context
        3. Important dates or commitments
        4. Relevant decisions made
        5. Open action items
        
        Keep it concise but comprehensive.`
      },
      {
        role: 'user',
        content: JSON.stringify({
          currentEmail: {
            subject: currentEmail.subject,
            from: currentEmail.from.email
          },
          relatedEmails: relatedEmails.map(r => ({
            subject: r.email.subject,
            summary: r.context,
            relevance: r.relevance
          })),
          conversationHistory: conversationHistory.map(e => ({
            from: e.from.email,
            subject: e.subject,
            date: e.timestamp
          }))
        })
      }
    ]);

    return context?.choices[0]?.message?.content || 'No additional context available.';
  }

  async buildAgenticMemory(userId: string): Promise<{
    totalEmails: number;
    vectorized: number;
    knowledgeGraph: any;
    insights: string[];
  }> {
    console.log(`🧠 Building agentic memory for user: ${userId}`);

    // Use EXISTING VectorSearchService to get all user's emails
    const allEmails = await this.vectorSearchService.searchSimilarDocuments(
      'user emails communications',
      {
        filter: {
          type: 'email',
          userId: userId
        },
        topK: 10000
      }
    );

    // AI generates insights from email patterns
    const insights = await this.generateMemoryInsights(allEmails);

    return {
      totalEmails: allEmails.length,
      vectorized: allEmails.length,
      knowledgeGraph: await this.buildKnowledgeGraph(allEmails),
      insights
    };
  }

  private async generateMemoryInsights(emails: any[]): Promise<string[]> {
    if (emails.length === 0) return [];

    const insights = await createChatCompletion([
      {
        role: 'system',
        content: `Analyze email patterns and generate insights about:
        1. Communication patterns
        2. Key relationships
        3. Recurring topics
        4. Important projects
        5. Time management patterns
        
        Return 5-7 actionable insights.`
      },
      {
        role: 'user',
        content: JSON.stringify({
          totalEmails: emails.length,
          senders: this.getTopSenders(emails),
          topics: this.extractTopics(emails),
          timePatterns: this.analyzeTimePatterns(emails)
        })
      }
    ]);

    const insightsText = insights?.choices[0]?.message?.content || '';
    return insightsText.split('\n').filter(line => line.trim().length > 0).slice(0, 7);
  }

  private getTopSenders(emails: any[]): any[] {
    const senderCounts = new Map<string, number>();
    emails.forEach(e => {
      const sender = e.metadata?.from;
      if (sender) {
        senderCounts.set(sender, (senderCounts.get(sender) || 0) + 1);
      }
    });

    return Array.from(senderCounts.entries())
      .map(([email, count]) => ({ email, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private extractTopics(emails: any[]): string[] {
    // Extract common topics from subjects
    const topics = new Set<string>();
    emails.forEach(e => {
      const subject = e.metadata?.subject || '';
      // Simple topic extraction (in production, use NLP)
      const words = subject.toLowerCase().split(' ');
      words.forEach(word => {
        if (word.length > 4) topics.add(word);
      });
    });

    return Array.from(topics).slice(0, 20);
  }

  private analyzeTimePatterns(emails: any[]): any {
    const hourCounts = new Array(24).fill(0);
    const dayCounts = new Array(7).fill(0);

    emails.forEach(e => {
      const date = new Date(e.metadata?.date);
      hourCounts[date.getHours()]++;
      dayCounts[date.getDay()]++;
    });

    return {
      peakHours: hourCounts.map((count, hour) => ({ hour, count })).sort((a, b) => b.count - a.count).slice(0, 3),
      peakDays: dayCounts.map((count, day) => ({ day, count })).sort((a, b) => b.count - a.count).slice(0, 3)
    };
  }

  private async buildKnowledgeGraph(emails: any[]): Promise<any> {
    // Build relationships between people, topics, and emails
    return {
      nodes: emails.length,
      relationships: 'To be implemented with Neo4j'
    };
  }
}
