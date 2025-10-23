import { createChatCompletion } from '../openai/chat';
import type { Email } from '../../types/email';
import { EmailVectorizationService, type EmailSearchResult } from './EmailVectorizationService';
import { MemoryService } from '../memory/MemoryService';

export interface EmailMemory {
  shortTerm: Email[]; // Recent emails (last 24 hours)
  workingMemory: Email[]; // Current conversation context
  longTerm: EmailSearchResult[]; // Relevant historical emails
  semanticMemory: string; // AI-synthesized knowledge
}

export interface ConversationContext {
  currentEmail: Email;
  threadEmails: Email[];
  relatedEmails: EmailSearchResult[];
  userPreferences: any;
  historicalPatterns: any;
  relevantKnowledge: string;
}

export class EmailMemorySystem {
  private static instance: EmailMemorySystem;
  private vectorizationService: EmailVectorizationService;
  private memoryService: MemoryService;

  private constructor() {
    this.vectorizationService = EmailVectorizationService.getInstance();
    this.memoryService = MemoryService.getInstance();
  }

  public static getInstance(): EmailMemorySystem {
    if (!this.instance) {
      this.instance = new EmailMemorySystem();
    }
    return this.instance;
  }

  async buildCompleteContext(
    email: Email,
    userId: string
  ): Promise<ConversationContext> {
    console.log(`🧠 Building complete context for: ${email.subject}`);

    // Parallel context gathering
    const [
      emailContext,
      userPreferences,
      historicalPatterns,
      relevantKnowledge
    ] = await Promise.all([
      this.vectorizationService.getEmailContext(email, userId),
      this.getUserPreferences(userId),
      this.getHistoricalPatterns(userId, email),
      this.getRelevantKnowledge(email, userId)
    ]);

    return {
      currentEmail: email,
      threadEmails: emailContext.conversationHistory,
      relatedEmails: await this.vectorizationService.searchSimilarEmails(
        `${email.subject} ${email.content}`,
        userId,
        { limit: 5 }
      ),
      userPreferences,
      historicalPatterns,
      relevantKnowledge: emailContext.relevantContext
    };
  }

  async getResponseContext(
    email: Email,
    userId: string
  ): Promise<string> {
    // Build complete context
    const context = await this.buildCompleteContext(email, userId);

    // AI synthesizes into response-ready context
    const synthesized = await createChatCompletion([
      {
        role: 'system',
        content: `Synthesize email context into a concise brief for response generation.
        
        Include:
        1. Key points from conversation history
        2. Relevant information from related emails
        3. User preferences and patterns
        4. Important context that affects response
        5. Commitments or promises made
        
        Be concise but comprehensive.`
      },
      {
        role: 'user',
        content: JSON.stringify({
          currentEmail: {
            from: email.from.email,
            subject: email.subject,
            content: email.content.substring(0, 500)
          },
          threadEmails: context.threadEmails.map(e => ({
            from: e.from.email,
            subject: e.subject,
            date: e.timestamp
          })),
          relatedEmails: context.relatedEmails.map(r => ({
            subject: r.email.subject,
            relevance: r.relevance,
            similarity: r.similarity
          })),
          userPreferences: context.userPreferences,
          patterns: context.historicalPatterns
        })
      }
    ], {
      model: 'gpt-4-turbo',
      temperature: 0.2
    });

    return synthesized?.choices[0]?.message?.content || 'No additional context.';
  }

  async rememberInteraction(
    email: Email,
    response: string,
    userId: string
  ): Promise<void> {
    console.log(`💾 Remembering interaction: ${email.subject}`);

    // Store interaction in memory service
    await this.memoryService.storeMemory({
      userId,
      type: 'email_interaction',
      content: {
        email: {
          id: email.id,
          subject: email.subject,
          from: email.from.email,
          timestamp: email.timestamp
        },
        response: response,
        timestamp: new Date()
      },
      metadata: {
        emailId: email.id,
        threadId: email.threadId
      }
    });
  }

  async learnFromFeedback(
    emailId: string,
    userId: string,
    feedback: {
      responseQuality: number; // 1-5
      wasHelpful: boolean;
      corrections?: string;
    }
  ): Promise<void> {
    console.log(`📈 Learning from feedback for email: ${emailId}`);

    // Store feedback
    await this.memoryService.storeMemory({
      userId,
      type: 'email_feedback',
      content: {
        emailId,
        feedback,
        timestamp: new Date()
      },
      metadata: {
        quality: feedback.responseQuality,
        helpful: feedback.wasHelpful
      }
    });

    // AI learns from corrections
    if (feedback.corrections) {
      await this.learnFromCorrections(emailId, feedback.corrections, userId);
    }
  }

  private async learnFromCorrections(
    emailId: string,
    corrections: string,
    userId: string
  ): Promise<void> {
    // AI analyzes what was corrected and why
    const learning = await createChatCompletion([
      {
        role: 'system',
        content: `Analyze these corrections to improve future responses.
        
        Extract:
        1. What was wrong in original response
        2. What the user preferred
        3. Pattern to remember for future
        4. Specific improvements needed
        
        Return structured learning points.`
      },
      {
        role: 'user',
        content: `Email ID: ${emailId}\nCorrections: ${corrections}`
      }
    ]);

    // Store learning
    await this.memoryService.storeMemory({
      userId,
      type: 'email_learning',
      content: {
        emailId,
        corrections,
        learning: learning?.choices[0]?.message?.content,
        timestamp: new Date()
      },
      metadata: {
        category: 'improvement'
      }
    });
  }

  private async getUserPreferences(userId: string): Promise<any> {
    // Get user's email preferences from memory
    const preferences = await this.memoryService.getMemories(userId, {
      type: 'user_preferences'
    });

    return preferences.length > 0 ? preferences[0].content : {
      responseStyle: 'professional',
      detailLevel: 'moderate',
      preferredTone: 'friendly'
    };
  }

  private async getHistoricalPatterns(userId: string, email: Email): Promise<any> {
    // Analyze patterns with this sender
    const senderEmails = await this.vectorizationService.searchSimilarEmails(
      `from:${email.from.email}`,
      userId,
      { limit: 20 }
    );

    return {
      totalInteractions: senderEmails.length,
      averageResponseTime: '2 hours', // Calculate from history
      commonTopics: ['project updates', 'meetings'],
      lastInteraction: senderEmails[0]?.email.timestamp
    };
  }

  private async getRelevantKnowledge(email: Email, userId: string): Promise<string> {
    // Search knowledge base for relevant information
    const results = await this.memoryService.searchMemories(
      `${email.subject} ${email.content}`,
      userId,
      { limit: 3 }
    );

    if (results.length === 0) return '';

    return results.map(r => r.content).join('\n\n');
  }
}
