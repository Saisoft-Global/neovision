/**
 * Document Context Manager
 * Maintains document context throughout conversations
 * Ensures AI remembers uploaded documents and their content
 */

import type { DocumentAnalysis } from '../IntelligentDocumentAnalyzer';

export interface DocumentContext {
  documentId: string;
  fileName: string;
  fileType: string;
  documentType: string;
  summary: string;
  extractedContent: string;
  structuredData: Record<string, any>;
  keyFindings: string[];
  uploadedAt: Date;
  threadId: string;
}

export class DocumentContextManager {
  private static instance: DocumentContextManager;
  
  // Store document contexts by thread ID
  private documentContexts: Map<string, DocumentContext[]> = new Map();
  
  // Store active document reference for each thread
  private activeDocuments: Map<string, string> = new Map();

  private constructor() {}

  public static getInstance(): DocumentContextManager {
    if (!this.instance) {
      this.instance = new DocumentContextManager();
    }
    return this.instance;
  }

  /**
   * Add a document to the conversation context
   */
  addDocument(
    threadId: string,
    analysis: DocumentAnalysis
  ): DocumentContext {
    const documentContext: DocumentContext = {
      documentId: crypto.randomUUID(),
      fileName: analysis.fileName,
      fileType: analysis.fileType,
      documentType: analysis.documentType,
      summary: analysis.summary,
      extractedContent: analysis.extractedContent,
      structuredData: analysis.structuredData,
      keyFindings: analysis.keyFindings || [],
      uploadedAt: new Date(),
      threadId
    };

    // Get existing documents for this thread
    const threadDocuments = this.documentContexts.get(threadId) || [];
    threadDocuments.push(documentContext);
    this.documentContexts.set(threadId, threadDocuments);

    // Set as active document for this thread
    this.activeDocuments.set(threadId, documentContext.documentId);

    console.log(`📄 Document added to context: ${analysis.fileName} (Thread: ${threadId})`);

    return documentContext;
  }

  /**
   * Get the active document for a thread
   */
  getActiveDocument(threadId: string): DocumentContext | null {
    const documentId = this.activeDocuments.get(threadId);
    if (!documentId) return null;

    const threadDocuments = this.documentContexts.get(threadId) || [];
    return threadDocuments.find(doc => doc.documentId === documentId) || null;
  }

  /**
   * Get all documents for a thread
   */
  getThreadDocuments(threadId: string): DocumentContext[] {
    return this.documentContexts.get(threadId) || [];
  }

  /**
   * Get document by ID
   */
  getDocument(threadId: string, documentId: string): DocumentContext | null {
    const threadDocuments = this.documentContexts.get(threadId) || [];
    return threadDocuments.find(doc => doc.documentId === documentId) || null;
  }

  /**
   * Build context string for AI from active document
   */
  buildDocumentContextString(threadId: string): string {
    const activeDoc = this.getActiveDocument(threadId);
    if (!activeDoc) return '';

    const contextParts = [
      `📄 DOCUMENT CONTEXT:`,
      `File: ${activeDoc.fileName}`,
      `Type: ${activeDoc.documentType}`,
      `Uploaded: ${activeDoc.uploadedAt.toLocaleString()}`,
      ``,
      `SUMMARY:`,
      activeDoc.summary,
      ``
    ];

    // Add key findings if available
    if (activeDoc.keyFindings.length > 0) {
      contextParts.push(`KEY FINDINGS:`);
      activeDoc.keyFindings.forEach(finding => {
        contextParts.push(`• ${finding}`);
      });
      contextParts.push(``);
    }

    // Add structured data
    if (Object.keys(activeDoc.structuredData).length > 0) {
      contextParts.push(`STRUCTURED DATA:`);
      Object.entries(activeDoc.structuredData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          contextParts.push(`• ${key}: ${JSON.stringify(value)}`);
        }
      });
      contextParts.push(``);
    }

    // Add excerpt of content
    if (activeDoc.extractedContent) {
      const excerpt = activeDoc.extractedContent.substring(0, 500);
      contextParts.push(`CONTENT EXCERPT:`);
      contextParts.push(excerpt + (activeDoc.extractedContent.length > 500 ? '...' : ''));
    }

    return contextParts.join('\n');
  }

  /**
   * Build context for all documents in thread
   */
  buildAllDocumentsContext(threadId: string): string {
    const documents = this.getThreadDocuments(threadId);
    if (documents.length === 0) return '';

    const contextParts = [
      `📚 AVAILABLE DOCUMENTS (${documents.length}):`,
      ``
    ];

    documents.forEach((doc, index) => {
      contextParts.push(`${index + 1}. ${doc.fileName} (${doc.documentType})`);
      contextParts.push(`   Summary: ${doc.summary.substring(0, 150)}...`);
      contextParts.push(``);
    });

    return contextParts.join('\n');
  }

  /**
   * Clear document context for a thread
   */
  clearThreadContext(threadId: string): void {
    this.documentContexts.delete(threadId);
    this.activeDocuments.delete(threadId);
    console.log(`🗑️ Cleared document context for thread: ${threadId}`);
  }

  /**
   * Set a specific document as active
   */
  setActiveDocument(threadId: string, documentId: string): boolean {
    const doc = this.getDocument(threadId, documentId);
    if (!doc) return false;

    this.activeDocuments.set(threadId, documentId);
    console.log(`📌 Set active document: ${doc.fileName}`);
    return true;
  }

  /**
   * Check if thread has any documents
   */
  hasDocuments(threadId: string): boolean {
    const docs = this.documentContexts.get(threadId);
    return docs !== undefined && docs.length > 0;
  }

  /**
   * Get document count for thread
   */
  getDocumentCount(threadId: string): number {
    return this.documentContexts.get(threadId)?.length || 0;
  }
}

