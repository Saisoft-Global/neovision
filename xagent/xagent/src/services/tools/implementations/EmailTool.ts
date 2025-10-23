import type { Tool, ToolSkill } from '../../../types/tool-framework';
import { createChatCompletion } from '../../openai/chat';

/**
 * Email Tool - Provides email-related capabilities
 * Skills: parse_email, summarize_email, identify_critical_email, draft_reply, classify_email
 */

// Email parsing skill
const parseEmailSkill: ToolSkill = {
  name: 'parse_email',
  description: 'Extract structured information from an email (sender, subject, body, date, etc.)',
  toolId: 'email-tool',
  parameters: [
    {
      name: 'emailContent',
      type: 'string',
      description: 'Raw email content or email object',
      required: true
    }
  ],
  execute: async (params) => {
    const { emailContent } = params;
    
    // Use LLM to parse email
    const response = await createChatCompletion([
      {
        role: 'system',
        content: `You are an email parser. Extract structured information from emails.
        Return JSON with: sender, subject, body, date, attachments (if mentioned), keywords.`
      },
      {
        role: 'user',
        content: `Parse this email:\n\n${emailContent}`
      }
    ]);
    
    try {
      const parsed = JSON.parse(response.choices[0].message.content || '{}');
      return {
        sender: parsed.sender || 'unknown',
        subject: parsed.subject || 'No subject',
        body: parsed.body || emailContent,
        date: parsed.date || new Date().toISOString(),
        attachments: parsed.attachments || [],
        keywords: parsed.keywords || []
      };
    } catch (error) {
      // Fallback if JSON parsing fails
      return {
        sender: 'unknown',
        subject: 'Unable to parse',
        body: emailContent,
        date: new Date().toISOString(),
        attachments: [],
        keywords: []
      };
    }
  }
};

// Email summarization skill
const summarizeEmailSkill: ToolSkill = {
  name: 'summarize_email',
  description: 'Create a concise summary of email content with key points',
  toolId: 'email-tool',
  parameters: [
    {
      name: 'emailContent',
      type: 'string',
      description: 'Email content to summarize',
      required: true
    },
    {
      name: 'maxLength',
      type: 'number',
      description: 'Maximum summary length in words',
      required: false,
      default: 100
    }
  ],
  execute: async (params) => {
    const { emailContent, maxLength = 100 } = params;
    
    const response = await createChatCompletion([
      {
        role: 'system',
        content: `You are an email summarizer. Create concise summaries with key points.
        Return JSON with: summary (max ${maxLength} words), keyPoints (array of 3-5 points), sentiment (positive/neutral/negative).`
      },
      {
        role: 'user',
        content: `Summarize this email:\n\n${emailContent}`
      }
    ]);
    
    try {
      const result = JSON.parse(response.choices[0].message.content || '{}');
      return {
        summary: result.summary || 'Unable to summarize',
        keyPoints: result.keyPoints || [],
        sentiment: result.sentiment || 'neutral',
        wordCount: result.summary?.split(' ').length || 0
      };
    } catch (error) {
      return {
        summary: 'Error generating summary',
        keyPoints: [],
        sentiment: 'neutral',
        wordCount: 0
      };
    }
  }
};

// Critical email identification skill
const identifyCriticalEmailSkill: ToolSkill = {
  name: 'identify_critical_email',
  description: 'Analyze email to determine if it requires urgent attention',
  toolId: 'email-tool',
  parameters: [
    {
      name: 'emailContent',
      type: 'string',
      description: 'Email content to analyze',
      required: true
    },
    {
      name: 'userContext',
      type: 'object',
      description: 'User context (role, priorities, etc.)',
      required: false
    }
  ],
  execute: async (params) => {
    const { emailContent, userContext = {} } = params;
    
    const response = await createChatCompletion([
      {
        role: 'system',
        content: `You are an email urgency analyzer. Determine if emails require urgent attention.
        User context: ${JSON.stringify(userContext)}
        
        Return JSON with:
        - isCritical (boolean)
        - urgency ("high" | "medium" | "low")
        - reason (string)
        - suggestedAction (string)
        - deadline (string, if any)
        - categories (array of strings like "request", "complaint", "opportunity")`
      },
      {
        role: 'user',
        content: `Analyze this email for criticality:\n\n${emailContent}`
      }
    ]);
    
    try {
      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      return {
        isCritical: analysis.isCritical || false,
        urgency: analysis.urgency || 'low',
        reason: analysis.reason || 'No specific urgency detected',
        suggestedAction: analysis.suggestedAction || 'Review when convenient',
        deadline: analysis.deadline || null,
        categories: analysis.categories || []
      };
    } catch (error) {
      return {
        isCritical: false,
        urgency: 'low',
        reason: 'Error analyzing email',
        suggestedAction: 'Manual review required',
        deadline: null,
        categories: []
      };
    }
  }
};

// Draft reply skill
const draftReplySkill: ToolSkill = {
  name: 'draft_reply',
  description: 'Generate a professional email reply based on the original email',
  toolId: 'email-tool',
  parameters: [
    {
      name: 'emailContent',
      type: 'string',
      description: 'Original email to reply to',
      required: true
    },
    {
      name: 'replyIntent',
      type: 'string',
      description: 'What you want to convey (e.g., "accept meeting", "decline politely", "request more info")',
      required: true
    },
    {
      name: 'tone',
      type: 'string',
      description: 'Tone of reply (formal/casual/friendly)',
      required: false,
      default: 'professional'
    }
  ],
  execute: async (params) => {
    const { emailContent, replyIntent, tone = 'professional' } = params;
    
    const response = await createChatCompletion([
      {
        role: 'system',
        content: `You are an email assistant. Draft professional email replies.
        Tone: ${tone}
        Return JSON with: subject, body, signature`
      },
      {
        role: 'user',
        content: `Original email:\n${emailContent}\n\nReply intent: ${replyIntent}`
      }
    ]);
    
    try {
      const draft = JSON.parse(response.choices[0].message.content || '{}');
      return {
        subject: draft.subject || 'Re: Your message',
        body: draft.body || '',
        signature: draft.signature || 'Best regards',
        tone: tone
      };
    } catch (error) {
      return {
        subject: 'Re: Your message',
        body: 'Error generating reply',
        signature: 'Best regards',
        tone: tone
      };
    }
  }
};

// Classify email skill
const classifyEmailSkill: ToolSkill = {
  name: 'classify_email',
  description: 'Categorize email into predefined categories (inquiry, complaint, request, etc.)',
  toolId: 'email-tool',
  parameters: [
    {
      name: 'emailContent',
      type: 'string',
      description: 'Email content to classify',
      required: true
    },
    {
      name: 'categories',
      type: 'array',
      description: 'Custom categories to classify into (optional)',
      required: false
    }
  ],
  execute: async (params) => {
    const { emailContent, categories } = params;
    
    const defaultCategories = [
      'inquiry', 'support_request', 'complaint', 'feedback',
      'sales_opportunity', 'internal', 'spam', 'newsletter', 'other'
    ];
    
    const categoriesToUse = categories || defaultCategories;
    
    const response = await createChatCompletion([
      {
        role: 'system',
        content: `You are an email classifier. Categorize emails into appropriate categories.
        Available categories: ${categoriesToUse.join(', ')}
        
        Return JSON with:
        - primaryCategory (string)
        - secondaryCategories (array of strings)
        - confidence (number 0-1)
        - reasoning (string)`
      },
      {
        role: 'user',
        content: `Classify this email:\n\n${emailContent}`
      }
    ]);
    
    try {
      const classification = JSON.parse(response.choices[0].message.content || '{}');
      return {
        primaryCategory: classification.primaryCategory || 'other',
        secondaryCategories: classification.secondaryCategories || [],
        confidence: classification.confidence || 0.5,
        reasoning: classification.reasoning || 'No specific classification',
        allCategories: categoriesToUse
      };
    } catch (error) {
      return {
        primaryCategory: 'other',
        secondaryCategories: [],
        confidence: 0,
        reasoning: 'Error classifying email',
        allCategories: categoriesToUse
      };
    }
  }
};

// Create the Email Tool
export const EmailTool: Tool = {
  id: 'email-tool',
  name: 'Email Tool',
  description: 'Comprehensive email management and analysis capabilities',
  type: 'email',
  config: {
    authType: 'none', // Uses LLM, no external auth needed
  },
  isActive: true,
  skills: [
    parseEmailSkill,
    summarizeEmailSkill,
    identifyCriticalEmailSkill,
    draftReplySkill,
    classifyEmailSkill
  ]
};











