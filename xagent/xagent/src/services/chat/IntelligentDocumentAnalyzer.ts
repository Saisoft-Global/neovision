import { createChatCompletion } from '../openai/chat';
import { ImageProcessor } from '../document/processors/image/ImageProcessor';
import { DocumentProcessor } from '../document/DocumentProcessor';
import { KnowledgeService } from '../knowledge/KnowledgeService';

export interface DocumentAnalysis {
  fileName: string;
  fileType: string;
  documentType: string;
  extractedContent: string;
  structuredData: Record<string, any>;
  summary: string;
  confidence: number;
}

export class IntelligentDocumentAnalyzer {
  private static instance: IntelligentDocumentAnalyzer;
  private imageProcessor: ImageProcessor;
  private documentProcessor: DocumentProcessor;
  private knowledgeService: KnowledgeService;

  private constructor() {
    this.imageProcessor = new ImageProcessor();
    this.documentProcessor = DocumentProcessor.getInstance();
    this.knowledgeService = KnowledgeService.getInstance();
  }

  public static getInstance(): IntelligentDocumentAnalyzer {
    if (!this.instance) {
      this.instance = new IntelligentDocumentAnalyzer();
    }
    return this.instance;
  }

  async analyzeDocument(file: File): Promise<DocumentAnalysis> {
    console.log(`🔍 Analyzing document: ${file.name}`);

    try {
      // 1. Extract content based on file type
      const content = await this.extractContent(file);
      
      // 2. Classify document type
      const documentType = await this.classifyDocument(file.name, content);
      
      // 3. Extract structured data
      const structuredData = await this.extractStructuredData(documentType, content);
      
      // 4. Generate summary
      const summary = await this.generateSummary(content, documentType);

      const analysis: DocumentAnalysis = {
        fileName: file.name,
        fileType: file.type || this.inferFileType(file.name),
        documentType,
        extractedContent: content,
        structuredData,
        summary,
        confidence: 0.85
      };

      console.log(`✅ Analysis complete:`, analysis);
      return analysis;
    } catch (error) {
      console.error('❌ Document analysis failed:', error);
      throw new Error(`Failed to analyze document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async extractContent(file: File): Promise<string> {
    const fileType = file.type.toLowerCase();

    try {
      // Image files - use OCR
      if (fileType.startsWith('image/')) {
        return await this.imageProcessor.processFile(file);
      }

      // Text files
      if (fileType.includes('text') || file.name.endsWith('.txt')) {
        return await this.readTextFile(file);
      }

      // For other files, try document processor
      const document = {
        id: crypto.randomUUID(),
        title: file.name,
        content: '',
        doc_type: 'unknown',
        status: 'processing' as const,
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type
        }
      };

      // Process through document processor (handles PDF, DOCX, etc.)
      await this.documentProcessor.processDocument(document);
      return document.content || 'Content extraction in progress...';
    } catch (error) {
      console.error('Content extraction error:', error);
      return `[File: ${file.name} - Content extraction pending]`;
    }
  }

  private async readTextFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  private inferFileType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const typeMap: Record<string, string> = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'txt': 'text/plain',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif'
    };
    return extension ? (typeMap[extension] || 'application/octet-stream') : 'application/octet-stream';
  }

  private async classifyDocument(fileName: string, content: string): Promise<string> {
    try {
      const response = await createChatCompletion([
        {
          role: 'system',
          content: `Classify this document into ONE of these categories:
- invoice (bills, invoices from vendors)
- receipt (purchase receipts, transaction receipts)
- resume (CV, curriculum vitae, job application)
- contract (legal agreements, employment contracts)
- report (business reports, analysis documents)
- email (email messages, correspondence)
- product_spec (product specifications, datasheets)
- presentation (slides, presentations)
- spreadsheet (data tables, financial sheets)
- image (photos, screenshots, diagrams)
- other (anything else)

Return ONLY the category name, nothing else.`
        },
        {
          role: 'user',
          content: `Filename: ${fileName}\nContent preview: ${content.substring(0, 500)}`
        }
      ]);

      return response?.choices[0]?.message?.content?.trim().toLowerCase() || 'other';
    } catch (error) {
      console.error('Classification error:', error);
      return 'other';
    }
  }

  private async extractStructuredData(documentType: string, content: string): Promise<Record<string, any>> {
    try {
      const prompts: Record<string, string> = {
        invoice: `Extract: invoice_number, vendor, amount, currency, date, due_date, line_items`,
        receipt: `Extract: merchant, amount, currency, date, items, payment_method`,
        resume: `Extract: name, email, phone, experience_years, skills, education, current_position`,
        contract: `Extract: contract_type, parties, start_date, end_date, key_terms, value`,
        email: `Extract: from, to, subject, date, action_items, sentiment`,
        product_spec: `Extract: product_name, model, specifications, price, features`,
        report: `Extract: title, author, date, key_findings, recommendations, metrics`
      };

      const extractionPrompt = prompts[documentType] || 'Extract key information';

      const response = await createChatCompletion([
        {
          role: 'system',
          content: `${extractionPrompt}.
          Return ONLY a JSON object with the extracted data. Use null for missing fields.`
        },
        {
          role: 'user',
          content: content.substring(0, 2000)
        }
      ]);

      const jsonText = response?.choices[0]?.message?.content || '{}';
      
      // Try to extract JSON from markdown if present
      const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonToParse = jsonMatch ? jsonMatch[1] : jsonText;
      
      return JSON.parse(jsonToParse);
    } catch (error) {
      console.error('Structured data extraction error:', error);
      return { raw_content: content.substring(0, 500) };
    }
  }

  private async generateSummary(content: string, documentType: string): Promise<string> {
    try {
      const response = await createChatCompletion([
        {
          role: 'system',
          content: `Generate a brief 2-3 sentence summary of this ${documentType}.`
        },
        {
          role: 'user',
          content: content.substring(0, 1500)
        }
      ]);

      return response?.choices[0]?.message?.content || `${documentType} document uploaded.`;
    } catch (error) {
      console.error('Summary generation error:', error);
      return `${documentType} document uploaded.`;
    }
  }
}

