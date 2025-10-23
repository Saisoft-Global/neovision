import { createChatCompletion } from '../openai/chat';
import type { Email } from '../../types/email';
import { classifyEmailIntent } from '../email/analysis/intentClassifier';

export interface EmailClassification {
  importance: number; // 1-10
  urgency: number; // 1-10
  category: 'urgent' | 'important' | 'fyi' | 'spam';
  sentiment: 'positive' | 'neutral' | 'negative';
  requiresResponse: boolean;
  canAutoRespond: boolean;
  actionItems: ActionItem[];
  entities: EmailEntity[];
  confidence: number;
}

export interface ActionItem {
  id: string;
  description: string;
  deadline?: Date;
  priority: number;
  assignee?: string;
}

export interface EmailEntity {
  type: 'person' | 'date' | 'amount' | 'project' | 'company';
  value: string;
  context: string;
}

export interface DailySummary {
  date: Date;
  totalEmails: number;
  urgent: Email[];
  important: Email[];
  fyi: Email[];
  autoResponded: number;
  tasksCreated: number;
  meetingsScheduled: number;
  insights: string[];
}

export class EmailIntelligenceEngine {
  private static instance: EmailIntelligenceEngine;

  private constructor() {}

  public static getInstance(): EmailIntelligenceEngine {
    if (!this.instance) {
      this.instance = new EmailIntelligenceEngine();
    }
    return this.instance;
  }

  async classifyEmail(email: Email): Promise<EmailClassification> {
    console.log(`📧 Classifying email: ${email.subject}`);

    try {
      const classification = await createChatCompletion([
        {
          role: 'system',
          content: `You are an expert email analyst. Classify this email comprehensively.
          
          Analyze and return JSON with:
          {
            "importance": 1-10 (how important is this email),
            "urgency": 1-10 (how urgent is response needed),
            "category": "urgent|important|fyi|spam",
            "sentiment": "positive|neutral|negative",
            "requiresResponse": boolean,
            "canAutoRespond": boolean (can AI respond without human approval),
            "actionItems": [
              {
                "description": "what needs to be done",
                "deadline": "ISO date if mentioned",
                "priority": 1-10
              }
            ],
            "entities": [
              {
                "type": "person|date|amount|project|company",
                "value": "extracted value",
                "context": "why it's relevant"
              }
            ],
            "confidence": 0-1
          }
          
          Consider:
          - Sender relationship and authority
          - Subject line urgency indicators
          - Content tone and language
          - Deadlines mentioned
          - Action verbs used
          - CC/BCC recipients
          `
        },
        {
          role: 'user',
          content: `From: ${email.from.name} <${email.from.email}>
To: ${email.to.map(t => t.email).join(', ')}
Subject: ${email.subject}
Date: ${email.timestamp}

${email.content}`
        }
      ], {
        model: 'gpt-4-turbo',
        temperature: 0.2,
        response_format: { type: 'json_object' }
      });

      const classificationText = response?.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(classificationText);

      return {
        importance: parsed.importance || 5,
        urgency: parsed.urgency || 5,
        category: parsed.category || 'fyi',
        sentiment: parsed.sentiment || 'neutral',
        requiresResponse: parsed.requiresResponse || false,
        canAutoRespond: parsed.canAutoRespond || false,
        actionItems: parsed.actionItems || [],
        entities: parsed.entities || [],
        confidence: parsed.confidence || 0.7
      };
    } catch (error) {
      console.error('Email classification error:', error);
      return this.getDefaultClassification();
    }
  }

  async generateDailySummary(emails: Email[]): Promise<DailySummary> {
    console.log(`📊 Generating daily summary for ${emails.length} emails`);

    // Classify all emails
    const classifications = await Promise.all(
      emails.map(email => this.classifyEmail(email))
    );

    // Categorize emails
    const urgent = emails.filter((_, i) => classifications[i].category === 'urgent');
    const important = emails.filter((_, i) => classifications[i].category === 'important');
    const fyi = emails.filter((_, i) => classifications[i].category === 'fyi');

    // Generate insights with AI
    const insights = await this.generateInsights(emails, classifications);

    return {
      date: new Date(),
      totalEmails: emails.length,
      urgent,
      important,
      fyi,
      autoResponded: classifications.filter(c => c.canAutoRespond).length,
      tasksCreated: classifications.reduce((sum, c) => sum + c.actionItems.length, 0),
      meetingsScheduled: classifications.filter(c => 
        c.actionItems.some(a => a.description.toLowerCase().includes('meeting'))
      ).length,
      insights
    };
  }

  private async generateInsights(
    emails: Email[],
    classifications: EmailClassification[]
  ): Promise<string[]> {
    try {
      const response = await createChatCompletion([
        {
          role: 'system',
          content: `Analyze these emails and generate 3-5 key insights about:
          - Patterns in communication
          - Urgent matters requiring attention
          - Opportunities for proactive action
          - Potential issues or concerns
          - Time-sensitive items
          
          Be specific and actionable.`
        },
        {
          role: 'user',
          content: JSON.stringify({
            totalEmails: emails.length,
            urgent: classifications.filter(c => c.category === 'urgent').length,
            important: classifications.filter(c => c.category === 'important').length,
            sentiments: classifications.map(c => c.sentiment),
            actionItems: classifications.flatMap(c => c.actionItems),
            topSenders: this.getTopSenders(emails)
          })
        }
      ]);

      const insightsText = response?.choices[0]?.message?.content || '';
      return insightsText.split('\n').filter(line => line.trim().length > 0);
    } catch (error) {
      console.error('Insights generation error:', error);
      return ['Email analysis complete'];
    }
  }

  async generateEmailResponse(
    email: Email,
    context: {
      conversationHistory?: Email[];
      userKnowledge?: any;
      relatedTasks?: any[];
    }
  ): Promise<string> {
    const intent = await classifyEmailIntent(email);
    const classification = await this.classifyEmail(email);

    const response = await createChatCompletion([
      {
        role: 'system',
        content: `Generate a professional email response.
        
        Email Classification:
        - Importance: ${classification.importance}/10
        - Urgency: ${classification.urgency}/10
        - Sentiment: ${classification.sentiment}
        - Intent: ${intent}
        
        Response Guidelines:
        1. Match the tone of the original email
        2. Address all action items
        3. Be clear and concise
        4. Provide specific next steps
        5. Include relevant context
        6. Maintain professional courtesy
        
        ${classification.sentiment === 'negative' ? 
          'Note: Sender seems frustrated. Be extra empathetic and solution-focused.' : ''}
        `
      },
      {
        role: 'user',
        content: `Original Email:
From: ${email.from.name} <${email.from.email}>
Subject: ${email.subject}

${email.content}

${context.conversationHistory ? `
Previous conversation:
${context.conversationHistory.slice(-3).map(e => `${e.from.name}: ${e.subject}`).join('\n')}
` : ''}

Generate appropriate response.`
      }
    ], {
      model: 'gpt-4-turbo',
      temperature: 0.7
    });

    return response?.choices[0]?.message?.content || '';
  }

  private getTopSenders(emails: Email[]): Array<{ email: string; count: number }> {
    const senderCounts = new Map<string, number>();
    
    emails.forEach(email => {
      const sender = email.from.email;
      senderCounts.set(sender, (senderCounts.get(sender) || 0) + 1);
    });

    return Array.from(senderCounts.entries())
      .map(([email, count]) => ({ email, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private getDefaultClassification(): EmailClassification {
    return {
      importance: 5,
      urgency: 5,
      category: 'fyi',
      sentiment: 'neutral',
      requiresResponse: false,
      canAutoRespond: false,
      actionItems: [],
      entities: [],
      confidence: 0.5
    };
  }
}
