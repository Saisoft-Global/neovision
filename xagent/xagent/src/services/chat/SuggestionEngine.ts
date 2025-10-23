import { createChatCompletion } from '../openai/chat';
import type { DocumentAnalysis } from './IntelligentDocumentAnalyzer';

export interface Suggestion {
  id: string;
  text: string;
  action: string;
  icon: string;
  priority: number;
}

export class SuggestionEngine {
  private static instance: SuggestionEngine;

  private constructor() {}

  public static getInstance(): SuggestionEngine {
    if (!this.instance) {
      this.instance = new SuggestionEngine();
    }
    return this.instance;
  }

  async generateSuggestions(analysis: DocumentAnalysis): Promise<Suggestion[]> {
    console.log(`💡 Generating suggestions for ${analysis.documentType}`);

    try {
      // Get template suggestions
      const templateSuggestions = this.getTemplateSuggestions(analysis.documentType);
      
      // Personalize with AI if we have structured data
      if (Object.keys(analysis.structuredData).length > 0) {
        return await this.personalizeWithAI(analysis, templateSuggestions);
      }

      return templateSuggestions;
    } catch (error) {
      console.error('Suggestion generation error:', error);
      return this.getTemplateSuggestions(analysis.documentType);
    }
  }

  private getTemplateSuggestions(documentType: string): Suggestion[] {
    const suggestionMap: Record<string, Suggestion[]> = {
      invoice: [
        { id: '1', text: 'Create expense entry', action: 'create_expense', icon: '💰', priority: 1 },
        { id: '2', text: 'Request payment approval', action: 'request_approval', icon: '✅', priority: 2 },
        { id: '3', text: 'Update accounting system', action: 'update_accounting', icon: '📊', priority: 3 },
        { id: '4', text: 'Schedule payment', action: 'schedule_payment', icon: '📅', priority: 4 },
        { id: '5', text: 'Extract vendor details', action: 'extract_vendor', icon: '🏢', priority: 5 }
      ],
      receipt: [
        { id: '1', text: 'Log expense', action: 'log_expense', icon: '💳', priority: 1 },
        { id: '2', text: 'Submit reimbursement', action: 'submit_reimbursement', icon: '💵', priority: 2 },
        { id: '3', text: 'Categorize expense', action: 'categorize', icon: '📂', priority: 3 },
        { id: '4', text: 'Attach to expense report', action: 'attach_report', icon: '📎', priority: 4 }
      ],
      resume: [
        { id: '1', text: 'Create candidate profile', action: 'create_candidate', icon: '👤', priority: 1 },
        { id: '2', text: 'Schedule interview', action: 'schedule_interview', icon: '📅', priority: 2 },
        { id: '3', text: 'Send acknowledgment', action: 'send_ack', icon: '✉️', priority: 3 },
        { id: '4', text: 'Add to recruitment pipeline', action: 'add_pipeline', icon: '🎯', priority: 4 },
        { id: '5', text: 'Match with job openings', action: 'match_jobs', icon: '🔍', priority: 5 }
      ],
      contract: [
        { id: '1', text: 'Create approval workflow', action: 'create_workflow', icon: '🔄', priority: 1 },
        { id: '2', text: 'Extract key terms', action: 'extract_terms', icon: '📝', priority: 2 },
        { id: '3', text: 'Set reminder dates', action: 'set_reminders', icon: '⏰', priority: 3 },
        { id: '4', text: 'Store in legal repository', action: 'store_legal', icon: '🗄️', priority: 4 },
        { id: '5', text: 'Notify stakeholders', action: 'notify_stakeholders', icon: '📢', priority: 5 }
      ],
      report: [
        { id: '1', text: 'Summarize key findings', action: 'summarize', icon: '📋', priority: 1 },
        { id: '2', text: 'Extract data points', action: 'extract_data', icon: '📊', priority: 2 },
        { id: '3', text: 'Create presentation', action: 'create_presentation', icon: '🎤', priority: 3 },
        { id: '4', text: 'Share with team', action: 'share_team', icon: '👥', priority: 4 },
        { id: '5', text: 'Schedule review meeting', action: 'schedule_review', icon: '📅', priority: 5 }
      ],
      email: [
        { id: '1', text: 'Draft response', action: 'draft_response', icon: '✍️', priority: 1 },
        { id: '2', text: 'Create task from email', action: 'create_task', icon: '✓', priority: 2 },
        { id: '3', text: 'Extract action items', action: 'extract_actions', icon: '📝', priority: 3 },
        { id: '4', text: 'Update CRM', action: 'update_crm', icon: '🎯', priority: 4 }
      ],
      product_spec: [
        { id: '1', text: 'Create product entry', action: 'create_product', icon: '📦', priority: 1 },
        { id: '2', text: 'Update catalog', action: 'update_catalog', icon: '📚', priority: 2 },
        { id: '3', text: 'Generate marketing content', action: 'generate_marketing', icon: '📣', priority: 3 },
        { id: '4', text: 'Set pricing', action: 'set_pricing', icon: '💲', priority: 4 }
      ],
      image: [
        { id: '1', text: 'Extract text (OCR)', action: 'ocr_extract', icon: '📄', priority: 1 },
        { id: '2', text: 'Analyze content', action: 'analyze_image', icon: '🔍', priority: 2 },
        { id: '3', text: 'Store in gallery', action: 'store_gallery', icon: '🖼️', priority: 3 },
        { id: '4', text: 'Search similar images', action: 'search_similar', icon: '🔎', priority: 4 }
      ],
      other: [
        { id: '1', text: 'Store in knowledge base', action: 'store_knowledge', icon: '📚', priority: 1 },
        { id: '2', text: 'Extract key information', action: 'extract_info', icon: '🔑', priority: 2 },
        { id: '3', text: 'Search similar documents', action: 'search_similar', icon: '🔍', priority: 3 },
        { id: '4', text: 'Share with team', action: 'share_team', icon: '👥', priority: 4 }
      ]
    };

    return suggestionMap[documentType] || suggestionMap.other;
  }

  private async personalizeWithAI(
    analysis: DocumentAnalysis,
    templateSuggestions: Suggestion[]
  ): Promise<Suggestion[]> {
    try {
      const response = await createChatCompletion([
        {
          role: 'system',
          content: `Based on this ${analysis.documentType} analysis, select the 3-5 most relevant actions.
          
Document summary: ${analysis.summary}
Extracted data: ${JSON.stringify(analysis.structuredData)}

Available actions:
${templateSuggestions.map(s => `- ${s.text}`).join('\n')}

Return ONLY a JSON array of action texts in order of relevance, like:
["action1", "action2", "action3"]`
        }
      ]);

      const responseText = response?.choices[0]?.message?.content || '[]';
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      const selectedActions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

      // Filter and reorder based on AI selection
      const personalizedSuggestions = selectedActions
        .map((actionText: string) => 
          templateSuggestions.find(s => s.text.toLowerCase().includes(actionText.toLowerCase()))
        )
        .filter(Boolean);

      // If AI selection worked, return it; otherwise fallback to template
      return personalizedSuggestions.length > 0 
        ? personalizedSuggestions.slice(0, 5)
        : templateSuggestions.slice(0, 5);
    } catch (error) {
      console.error('AI personalization error:', error);
      return templateSuggestions.slice(0, 5);
    }
  }
}

